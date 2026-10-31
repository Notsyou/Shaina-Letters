"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { checkPassword, requireAdmin, startSession } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { notifyPosted, tick } from "@/lib/notify";
import { cleanLetterHtml } from "@/lib/sanitize";

const { letters, replies } = schema;

export async function adminLogin(_prev: string | null, form: FormData): Promise<string | null> {
  if (!checkPassword(String(form.get("password") ?? ""), "admin")) {
    await new Promise((r) => setTimeout(r, 800));
    return "Wrong password.";
  }
  await startSession("admin");
  redirect("/admin");
}

export type SaveInput = { id?: number; title: string; content: string; releaseAt: string; isDraft: boolean };

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
