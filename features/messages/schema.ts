import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const messages = pgTable("messages", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  fromUserId: varchar("fromUserId", { length: 36 }).notNull(),
  toUserId: varchar("toUserId", { length: 36 }),
  subject: varchar("subject", { length: 255 }),
  body: text("body").notNull(),
  read: boolean("read").notNull().default(false),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
