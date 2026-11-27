import { portalAuditLog } from "../schema";

type Db = { insert: (...args: any[]) => any };

export type PortalAuditEntry = {
  actingUserId: string;
  actingUserName: string;
  actionType: "create" | "update" | "delete" | "status_change" | "login" | "export" | "override";
  entityType: string;
  entityId?: string;
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  notes?: string;
};

/** Write one row to the Ops audit log (portal_audit_log). */
export async function logPortalAudit(db: Db, entry: PortalAuditEntry): Promise<void> {
  await db.insert(portalAuditLog).values({
    ...entry,
    entityId: entry.entityId ?? null,
    fieldChanged: entry.fieldChanged ?? null,
    oldValue: entry.oldValue ?? null,
    newValue: entry.newValue ?? null,
    notes: entry.notes ?? null,
  });
}
