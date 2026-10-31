"use server";

import { and, eq, lte } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { checkPassword, endSession, requireReader, startSession } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { notifyAdmin } from "@/lib/notify";
import { REACTIONS } from "@/lib/constants";

const { letters, reactions, replies, settings } = schema;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function readerLogin(_prev: string | null, form: FormData): Promise<string | null> {
  const password = String(form.get("password") ?? "");
  if (!checkPassword(password, "reader")) {
    await wait(800);
    return "Mali po, try again";
  }
  await startSession("reader");
  redirect("/");
}

export async function logout() {
  await endSession();
  redirect("/login");
}

/** Only released, non-draft letters can be reacted to or replied to (admin may always). */
async function assertOpenable(letterId: number) {
  const role = await requireReader();
  const db = await getDb();
  const cond =
    role === "admin"
      ? eq(letters.id, letterId)
      : and(eq(letters.id, letterId), eq(letters.isDraft, false), lte(letters.releaseAt, new Date()));
  const [l] = await db.select({ id: letters.id, title: letters.title }).from(letters).where(cond);
  if (!l) throw new Error("Letter not available");
  return { db, letter: l, role };
}

export async function toggleReaction(letterId: number, emoji: string) {
  if (!REACTIONS.includes(emoji)) return;
  const { db } = await assertOpenable(letterId);
  const removed = await db
    .delete(reactions)
    .where(and(eq(reactions.letterId, letterId), eq(reactions.emoji, emoji)))
    .returning({ id: reactions.id });
  if (removed.length === 0) {
    await db.insert(reactions).values({ letterId, emoji }).onConflictDoNothing();
  }
  revalidatePath(`/letter/${letterId}`);
}

export async function sendReply(letterId: number, _prev: string | null, form: FormData): Promise<string | null> {
  const content = String(form.get("content") ?? "").trim();
  if (!content) return "Write something first po";
  if (content.length > 20000) return "That's a very long letter! Please keep it under 20,000 characters.";
  const { db, letter, role } = await assertOpenable(letterId);
  await db.insert(replies).values({ letterId, content, seenByAdmin: role === "admin" });
  if (role === "reader") {
    await notifyAdmin(
      `💌 Shai wrote back: "${letter.title || "Untitled"}"`,
      `Shai replied to your letter "${letter.title || "Untitled"}":\n\n${content}`,
      "/admin/replies",
    );
  }
  revalidatePath(`/letter/${letterId}`);
  return null;
}

export async function saveSubscription(_prev: string | null, form: FormData): Promise<string | null> {
  await requireReader();
  const email = String(form.get("email") ?? "").trim();
  const notifyPosted = form.get("notifyPosted") === "on";
  const notifyReleased = form.get("notifyReleased") === "on";
  if ((notifyPosted || notifyReleased) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Please enter a valid email.";
  }
  const db = await getDb();
  await db
    .insert(settings)
    .values({ id: 1, email, notifyPosted, notifyReleased })
    .onConflictDoUpdate({ target: settings.id, set: { email, notifyPosted, notifyReleased } });
  revalidatePath("/settings");
  return "Saved!";
}
