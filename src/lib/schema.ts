import { boolean, integer, pgTable, serial, text, timestamp, unique } from "drizzle-orm/pg-core";

export const letters = pgTable("letters", {
  id: serial("id").primaryKey(),
  title: text("title").notNull().default(""),
  content: text("content").notNull().default(""),
  isDraft: boolean("is_draft").notNull().default(true),
  releaseAt: timestamp("release_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  firstOpenedAt: timestamp("first_opened_at", { withTimezone: true }),
  postedNotifiedAt: timestamp("posted_notified_at", { withTimezone: true }),
  releasedNotifiedAt: timestamp("released_notified_at", { withTimezone: true }),
});

export const reactions = pgTable(
  "reactions",
  {
    id: serial("id").primaryKey(),
    letterId: integer("letter_id")
      .notNull()
      .references(() => letters.id, { onDelete: "cascade" }),
    emoji: text("emoji").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.letterId, t.emoji)],
);

export const replies = pgTable("replies", {
  id: serial("id").primaryKey(),
  letterId: integer("letter_id")
    .notNull()
    .references(() => letters.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  seenByAdmin: boolean("seen_by_admin").notNull().default(false),
});

export const settings = pgTable("settings", {
  id: integer("id").primaryKey(),
  email: text("email").notNull().default(""),
  notifyPosted: boolean("notify_posted").notNull().default(false),
  notifyReleased: boolean("notify_released").notNull().default(false),
});

export type Letter = typeof letters.$inferSelect;
export type Reply = typeof replies.$inferSelect;
export type Settings = typeof settings.$inferSelect;
