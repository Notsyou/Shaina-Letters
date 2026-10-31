import "server-only";
import { and, eq, isNull, lte } from "drizzle-orm";
import { getDb, schema } from "./db";
import { sendMail, siteUrl } from "./mail";
import type { Letter } from "./schema";

const { letters, settings } = schema;

export function formatDate(d: Date) {
  return d.toLocaleString("en-US", {
    timeZone: process.env.TIMEZONE || "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export async function getSettings() {
  const db = await getDb();
  const [row] = await db.select().from(settings).where(eq(settings.id, 1));
  return row ?? { id: 1, email: "", notifyPosted: false, notifyReleased: false };
}

/** Called after a letter is saved as non-draft. Sends the "a sealed letter arrived" email once. */
export async function notifyPosted(letter: Letter) {
  if (letter.isDraft || letter.postedNotifiedAt) return;
  const db = await getDb();
  await db.update(letters).set({ postedNotifiedAt: new Date() }).where(eq(letters.id, letter.id));
  if (letter.releaseAt <= new Date()) return; // already released, so tick() sends the release email instead

  const s = await getSettings();
  if (!s.notifyPosted || !s.email) return;
  await sendMail({
    to: s.email,
    subject: "New letter for you",
    body: `I posted a new letter for you. You can open it on ${formatDate(letter.releaseAt)}.`,
    link: siteUrl("/"),
    linkText: "See the countdown",
  });
}

/** Finds letters whose release time has passed and sends the "ready to open" email once each. */
export async function tick() {
  const db = await getDb();
  const due = await db
    .select()
    .from(letters)
    .where(and(eq(letters.isDraft, false), lte(letters.releaseAt, new Date()), isNull(letters.releasedNotifiedAt)));
  if (due.length === 0) return { released: 0 };

  const s = await getSettings();
  for (const l of due) {
    // Claim it first so two overlapping ticks can't both send an email.
    const claimed = await db
      .update(letters)
      .set({ releasedNotifiedAt: new Date() })
      .where(and(eq(letters.id, l.id), isNull(letters.releasedNotifiedAt)))
      .returning({ id: letters.id });
    if (claimed.length === 0 || !s.notifyReleased || !s.email) continue;
    await sendMail({
      to: s.email,
      subject: "Your letter is ready",
      body: `You can open your letter now :)`,
      link: siteUrl(`/letter/${l.id}`),
      linkText: "Open your letter",
    });
  }
  return { released: due.length };
}

let lastTick = 0;
/** Runs tick() at most once a minute; called on page loads so emails go out even if the cron ping is late. */
export function tickSoon() {
  if (Date.now() - lastTick < 60_000) return;
  lastTick = Date.now();
  tick().catch((e) => console.error("[tick]", e));
}

export async function notifyAdmin(subject: string, body: string, path: string) {
  const to = process.env.ADMIN_EMAIL || process.env.GMAIL_USER;
  if (!to) return;
  await sendMail({ to, subject, body, link: siteUrl(path), linkText: "View it" });
}
