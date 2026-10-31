"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { checkPassword, getRole, requireAdmin, startSession } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { notifyPosted, tick } from "@/lib/notify";
import { cleanLetterHtml } from "@/lib/sanitize";
import { SEALS } from "@/lib/constants";

const { letters, replies } = schema;

export async function adminLogin(_prev: string | null, form: FormData): Promise<string | null> {
  if (!checkPassword(String(form.get("password") ?? ""), "admin")) {
    await new Promise((r) => setTimeout(r, 800));
    return "Wrong password.";
  }
  await startSession("admin");
  redirect("/admin");
}

export type SaveInput = { id?: number; title: string; content: string; releaseAt: string; isDraft: boolean; seal?: string };

export async function saveLetter(input: SaveInput): Promise<{ id?: number; error?: string }> {
  await requireAdmin();
  const releaseAt = new Date(input.releaseAt);
  if (Number.isNaN(releaseAt.getTime())) return { error: "Pick a release date and time." };
  const title = input.title.trim().slice(0, 200);
  const content = cleanLetterHtml(input.content);
  if (!input.isDraft && !content.replace(/<[^>]*>/g, "").trim() && !content.includes("<img")) {
    return { error: "The letter is empty. Write something before scheduling it." };
  }

  const db = await getDb();
  const values = {
    title,
    content,
    releaseAt,
    isDraft: input.isDraft,
    seal: SEALS.some((s) => s.id === input.seal) ? input.seal! : "S",
    updatedAt: new Date(),
    // Moved into the future (again)? Then the "ready to open" email should go out at the new time.
    ...(releaseAt > new Date() ? { releasedNotifiedAt: null } : {}),
  };

  const [saved] = input.id
    ? await db.update(letters).set(values).where(eq(letters.id, input.id)).returning()
    : await db.insert(letters).values(values).returning();
  if (!saved) return { error: "Letter not found." };

  if (!saved.isDraft) {
    await notifyPosted(saved);
    await tick();
  }
  revalidatePath("/", "layout");
  return { id: saved.id };
}

export type AutosaveInput = { id?: number; title: string; content: string; seal?: string; releaseAt: string };
export type AutosaveResult = { id?: number; savedAt?: string; error?: "signed-out" | "not-found"; skipped?: "released" | "empty" };

/**
 * Background autosave while writing. Never publishes and never changes the unlock time.
 * - New letter: created as a draft once something is written.
 * - Drafts and still-sealed letters: title, text and stamp are updated.
 * - Letters Shai can already read are skipped, so she never sees half-finished edits.
 */
export async function autosaveLetter(input: AutosaveInput): Promise<AutosaveResult> {
  // No redirect here: redirecting mid-typing would navigate away from the editor.
  if ((await getRole()) !== "admin") return { error: "signed-out" };
  const title = input.title.trim().slice(0, 200);
  const content = cleanLetterHtml(input.content);
  const seal = SEALS.some((s) => s.id === input.seal) ? input.seal! : "S";
  const db = await getDb();
  const now = new Date();

  if (input.id) {
    const [cur] = await db.select({ isDraft: letters.isDraft, releaseAt: letters.releaseAt }).from(letters).where(eq(letters.id, input.id));
    if (!cur) return { error: "not-found" };
    if (!cur.isDraft && cur.releaseAt <= now) return { id: input.id, skipped: "released" };
    await db.update(letters).set({ title, content, seal, updatedAt: now }).where(eq(letters.id, input.id));
    return { id: input.id, savedAt: now.toISOString() };
  }

  const hasText = title || content.replace(/<[^>]*>/g, "").trim() || content.includes("<img");
  if (!hasText) return { skipped: "empty" };
  let releaseAt = new Date(input.releaseAt);
  if (Number.isNaN(releaseAt.getTime())) releaseAt = new Date(now.getTime() + 24 * 3600 * 1000);
  const [created] = await db.insert(letters).values({ title, content, seal, releaseAt, isDraft: true, updatedAt: now }).returning({ id: letters.id });
  return { id: created.id, savedAt: now.toISOString() };
}

export async function deleteLetter(id: number) {
  await requireAdmin();
  const db = await getDb();
  await db.delete(letters).where(eq(letters.id, id));
  revalidatePath("/", "layout");
  redirect("/admin");
}

/** Mark a letter as unopened again: Shai sees it sealed with the "new" ribbon, and her next open triggers the email again. */
export async function resealLetter(id: number) {
  await requireAdmin();
  const db = await getDb();
  await db.update(letters).set({ firstOpenedAt: null }).where(eq(letters.id, id));
  revalidatePath("/", "layout");
}

export async function markReplySeen(id: number) {
  await requireAdmin();
  const db = await getDb();
  await db.update(replies).set({ seenByAdmin: true }).where(eq(replies.id, id));
  revalidatePath("/admin", "layout");
}
