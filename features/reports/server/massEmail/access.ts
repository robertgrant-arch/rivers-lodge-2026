/**
 * Who may use mass email: admins, and staff — users with the "employee" role
 * AND an active employees record (member logins also carry the "employee"
 * role, so the role alone is not enough; same rule as the Member File).
 * Members can never use it.
 */
import { and, eq } from "drizzle-orm";
import { employees } from "@core/db/schema";

type Db = { select: (...args: any[]) => any };
type User = { id: string; role?: string | null; email?: string | null } | null | undefined;

export type StaffInfo = { isAdmin: boolean; name: string; email: string };

const titleCase = (s: string) => s.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();

/** Staff details for the caller, or null if they may not use mass email. */
export async function staffInfo(db: Db, user: User): Promise<StaffInfo | null> {
  if (!user?.id) return null;
  const [emp] = await db
    .select({ firstName: employees.firstName, lastName: employees.lastName, active: employees.active })
    .from(employees)
    .where(eq(employees.userId, user.id))
    .limit(1);
  const isAdmin = user.role === "admin";
  if (!isAdmin && !(user.role === "employee" && emp?.active)) return null;
  const email = user.email ?? "";
  const fullName = [emp?.firstName, emp?.lastName].filter(Boolean).join(" ").trim();
  return { isAdmin, name: fullName || titleCase(email.split("@")[0] || "Rivers Lodge"), email };
}

// Re-exported for the router (keeps drizzle helpers out of call sites).
export { and, eq };
