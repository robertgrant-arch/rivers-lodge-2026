import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from '@core/server/trpc';
import { TRPCError } from "@trpc/server";
import { getDb } from '@core/server/db';
import { fieldReports, newsletters, users, members } from '@core/db/schema';
import { eq, desc, and } from "drizzle-orm";
import { invokeLLM } from "@features/_core/server/llm";
import { notifyOwner } from '@core/server/notification';
import { massEmailRouter } from './massEmail/router';
import { htmlToPlainText } from './massEmail/content';

// ─── Field Reports Router ─────────────────────────────────────────────────────

const fieldReportsRouter = router({
  // List all reports (admin sees all; members see published only)
  list: protectedProcedure
    .input(
      z.object({
        type: z.enum(["fishing", "hunting", "field_conditions", "wildlife", "weather", "all"]).default("all"),
        published: z.boolean().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const isAdmin = ctx.user.role === "admin";
      const conditions: ReturnType<typeof eq>[] = [];

      if (input?.type && input.type !== "all") {
        conditions.push(eq(fieldReports.type, input.type));
      }
      if (!isAdmin) {
        conditions.push(eq(fieldReports.published, true));
      } else if (input?.published !== undefined) {
        conditions.push(eq(fieldReports.published, input.published));
      }

      const rows = conditions.length > 0
        ? await db.select().from(fieldReports).where(and(...conditions)).orderBy(desc(fieldReports.reportDate))
        : await db.select().from(fieldReports).orderBy(desc(fieldReports.reportDate));

      return rows;
    }),

  // Get single report
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [report] = await db.select().from(fieldReports).where(eq(fieldReports.id, input.id));
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      const isAdmin = ctx.user.role === "admin";
      if (!isAdmin && !report.published) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Report not available" });
      }
      return report;
    }),

  // Create report (admin only)
  create: adminProcedure
    .input(
      z.object({
        type: z.enum(["fishing", "hunting", "field_conditions", "wildlife", "weather"]),
        title: z.string().min(1).max(255),
        body: z.string().min(1),
        species: z.string().max(255).optional(),
        conditions: z.enum(["excellent", "good", "fair", "poor"]).optional(),
        location: z.string().max(255).optional(),
        reportDate: z.string(), // YYYY-MM-DD
        tierAccess: z.enum(["standard", "premier", "founding", "all"]).default("all"),
        published: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [result] = await db.insert(fieldReports).values({
        type: input.type,
        title: input.title,
        body: input.body,
        species: input.species ?? null,
        conditions: input.conditions ?? null,
        location: input.location ?? null,
        reportDate: input.reportDate,
        authorId: ctx.user.id,
        authorName: ctx.user.email ?? "Admin",
        tierAccess: input.tierAccess,
        published: input.published,
        publishedAt: input.published ? new Date() : null,
      }).returning({ id: fieldReports.id });
      return { id: result.id };
    }),

  // Update report (admin only)
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        type: z.enum(["fishing", "hunting", "field_conditions", "wildlife", "weather"]).optional(),
        title: z.string().min(1).max(255).optional(),
        body: z.string().min(1).optional(),
        species: z.string().max(255).optional().nullable(),
        conditions: z.enum(["excellent", "good", "fair", "poor"]).optional().nullable(),
        location: z.string().max(255).optional().nullable(),
        reportDate: z.string().optional(),
        tierAccess: z.enum(["standard", "premier", "founding", "all"]).optional(),
        published: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const { id, ...fields } = input;
      const updateData: Record<string, unknown> = { ...fields };
      if (fields.published === true) {
        updateData.publishedAt = new Date();
      } else if (fields.published === false) {
        updateData.publishedAt = null;
      }
      await db.update(fieldReports).set(updateData).where(eq(fieldReports.id, id));
      return { success: true };
    }),

  // Delete report (admin only)
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.delete(fieldReports).where(eq(fieldReports.id, input.id));
      return { success: true };
    }),
});

// ─── Newsletter Router ────────────────────────────────────────────────────────

// Mass email lives in ./massEmail/router.ts (staff permissions, recipients,
// test/send/schedule, approval, history). Only the AI draft generator stays
// here, admin-only.
const newsletterRouter = router({
  ...massEmailRouter._def.record,
  // Generate AI draft newsletter
  generateDraft: adminProcedure
    .input(
      z.object({
        context: z.string().optional(),
        includeRecentReports: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Gather recent published field reports for context
      let reportsContext = "";
      if (input.includeRecentReports) {
        const recentReports = await db
          .select()
          .from(fieldReports)
          .where(eq(fieldReports.published, true))
          .orderBy(desc(fieldReports.reportDate))
          .limit(5);

        if (recentReports.length > 0) {
          reportsContext = "\n\nRecent field reports to reference:\n" + recentReports.map((r) =>
            `- [${r.type.toUpperCase()}] ${r.title} (${r.reportDate}): ${r.body.slice(0, 300)}${r.body.length > 300 ? "..." : ""}`
          ).join("\n");
        }
      }

      const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      const promptContext = `${input.context ? `Admin notes: ${input.context}\n` : ""}${reportsContext}`;

      const systemPrompt = `You are the voice of The Rivers Lodge & Hunt Club — a private, members-only estate on the Marais des Cygnes River in La Cygne, Kansas. 
The club offers world-class deer hunting, waterfowl, bass fishing, and upland bird hunting on 1,200 acres. 
Write in a warm, authoritative, and refined tone — like a letter from a trusted steward of the land to fellow sportsmen and women.
The newsletter should feel personal, informative, and exclusive. Use proper paragraphs, no bullet points. Keep it to 4-6 paragraphs.`;

      const userPrompt = `Write a weekly member newsletter for the week of ${today}.
Include:
1. A warm seasonal greeting that reflects what's happening on the land right now
2. Field conditions and activity highlights (fishing, hunting, wildlife sightings)
3. Any upcoming season openings, booking reminders, or member events
4. A closing note from the management team
${promptContext}

Format as clean HTML with <h2>, <p>, and <em> tags only. No inline styles. Start with a subject line on the first line as: SUBJECT: [subject here]`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const rawContent = typeof response.choices[0]?.message?.content === "string"
        ? response.choices[0].message.content
        : "";

      // Extract subject line
      const subjectMatch = rawContent.match(/^SUBJECT:\s*(.+)/m);
      const subject = subjectMatch ? subjectMatch[1].trim() : `Rivers Lodge Weekly Update — ${today}`;
      const draftContent = rawContent.replace(/^SUBJECT:.+\n?/m, "").trim();

      // Save to DB
      const [insertedNewsletter] = await db.insert(newsletters).values({
        subject,
        draftContent,
        finalContent: draftContent,
        aiPromptContext: promptContext || null,
        // Lands as a draft: staff pick recipients and send from the composer.
        status: "draft",
        bodyText: htmlToPlainText(draftContent),
        audience: { type: "all_members" },
        audienceLabel: "All active members",
        createdBy: ctx.user.id,
      }).returning({ id: newsletters.id });

      const id = insertedNewsletter.id;

      await notifyOwner({
        title: "Newsletter Draft Ready for Review",
        content: `A new AI-drafted newsletter is ready to review: "${subject}". Review and approve it in the Ops Portal → Newsletter.`,
      }).catch(() => {});

      return { id, subject, draftContent };
    }),

});

// ─── Combined Reports Router ──────────────────────────────────────────────────

export const reportsRouter = router({
  fieldReports: fieldReportsRouter,
  newsletters: newsletterRouter,
});
