import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from '@core/server/trpc';
import { TRPCError } from "@trpc/server";
import { getDb } from '@core/server/db';
import { fieldReports, newsletters, users, members } from '@core/db/schema';
import { eq, desc, and } from "drizzle-orm";
import { invokeLLM } from "@features/_core/server/llm";
import { notifyOwner } from '@core/server/notification';

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
      const result = await db.insert(fieldReports).values({
        type: input.type,
        title: input.title,
        body: input.body,
        species: input.species ?? null,
        conditions: input.conditions ?? null,
        location: input.location ?? null,
        reportDate: new Date(input.reportDate),
        authorId: ctx.user.id,
        authorName: ctx.user.email ?? "Admin",
        tierAccess: input.tierAccess,
        published: input.published,
        publishedAt: input.published ? new Date() : null,
      });
      return { id: (result[0] as any).insertId };
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

const newsletterRouter = router({
  // List newsletters (admin only)
  list: adminProcedure
    .input(
      z.object({
        status: z.enum(["draft", "pending_approval", "approved", "sent", "cancelled", "all"]).default("all"),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const rows = input?.status && input.status !== "all"
        ? await db.select().from(newsletters).where(eq(newsletters.status, input.status)).orderBy(desc(newsletters.createdAt))
        : await db.select().from(newsletters).orderBy(desc(newsletters.createdAt));
      return rows;
    }),

  // Get single newsletter
  get: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [nl] = await db.select().from(newsletters).where(eq(newsletters.id, input.id));
      if (!nl) throw new TRPCError({ code: "NOT_FOUND", message: "Newsletter not found" });
      return nl;
    }),

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
      const result = await db.insert(newsletters).values({
        subject,
        draftContent,
        finalContent: draftContent,
        aiPromptContext: promptContext || null,
        status: "pending_approval",
        createdBy: ctx.user.id,
      });

      const id = (result[0] as any).insertId;

      await notifyOwner({
        title: "Newsletter Draft Ready for Review",
        content: `A new AI-drafted newsletter is ready for your approval: "${subject}". Review and approve it in the Ops Portal → Newsletter.`,
      }).catch(() => {});

      return { id, subject, draftContent };
    }),

  // Update newsletter content / subject
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        subject: z.string().min(1).max(255).optional(),
        finalContent: z.string().optional(),
        status: z.enum(["draft", "pending_approval", "approved", "cancelled"]).optional(),
        scheduledFor: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const { id, scheduledFor, ...fields } = input;
      const updateData: Record<string, unknown> = { ...fields };
      if (scheduledFor !== undefined) {
        updateData.scheduledFor = scheduledFor ? new Date(scheduledFor) : null;
      }
      await db.update(newsletters).set(updateData).where(eq(newsletters.id, id));
      return { success: true };
    }),

  // Approve newsletter
  approve: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.update(newsletters).set({
        status: "approved",
        approvedBy: ctx.user.id,
        approvedAt: new Date(),
      }).where(eq(newsletters.id, input.id));
      return { success: true };
    }),

  // Send newsletter to all active members
  send: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [nl] = await db.select().from(newsletters).where(eq(newsletters.id, input.id));
      if (!nl) throw new TRPCError({ code: "NOT_FOUND", message: "Newsletter not found" });
      if (nl.status !== "approved") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Newsletter must be approved before sending" });
      }

      // Get all active members with email addresses
      const activeMemberUsers = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .innerJoin(members, eq(members.userId, users.id))
        .where(eq(members.active, true));

      const emailRecipients = activeMemberUsers.filter((u): u is { id: string; email: string } => !!u.email);
      const sentCount = emailRecipients.length;

      await db.update(newsletters).set({
        status: "sent",
        sentAt: new Date(),
        sentCount,
      }).where(eq(newsletters.id, input.id));

      await notifyOwner({
        title: "Newsletter Sent",
        content: `"${nl.subject}" was sent to ${sentCount} member${sentCount !== 1 ? "s" : ""}.`,
      }).catch(() => {});

      return { success: true, sentCount, recipients: emailRecipients.map((u) => u.email) };
    }),

  // Delete newsletter
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [nl] = await db.select().from(newsletters).where(eq(newsletters.id, input.id));
      if (!nl) throw new TRPCError({ code: "NOT_FOUND", message: "Newsletter not found" });
      if (nl.status === "sent") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete a sent newsletter" });
      }
      await db.delete(newsletters).where(eq(newsletters.id, input.id));
      return { success: true };
    }),
});

// ─── Combined Reports Router ──────────────────────────────────────────────────

export const reportsRouter = router({
  fieldReports: fieldReportsRouter,
  newsletters: newsletterRouter,
});
