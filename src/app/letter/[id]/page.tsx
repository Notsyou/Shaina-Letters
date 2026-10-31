import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";
import { requireReader } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { notifyAdmin, tickSoon } from "@/lib/notify";
import Envelope from "@/components/Envelope";
import Countdown from "@/components/Countdown";
import SiteHeader from "@/components/SiteHeader";
import LetterReveal from "./LetterReveal";
import Reactions from "./Reactions";
import ReplyForm from "./ReplyForm";
import LocalDate from "@/components/LocalDate";

const { letters, reactions, replies } = schema;

export default async function LetterPage({ params }: { params: Promise<{ id: string }> }) {
  const role = await requireReader();
  tickSoon();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const db = await getDb();
  const [meta] = await db
    .select({ id: letters.id, isDraft: letters.isDraft, releaseAt: letters.releaseAt, firstOpenedAt: letters.firstOpenedAt, seal: letters.seal })
    .from(letters)
    .where(eq(letters.id, id));
  if (!meta || (meta.isDraft && role !== "admin")) notFound();

  const isAdmin = role === "admin";
  const locked = meta.releaseAt > new Date();

  if (locked && !isAdmin) {
    return (
      <main className="page">
        <SiteHeader />
        <Link href="/" className="back-link">← back</Link>
        <div className="locked-view">
          <Envelope state="locked" emblem={meta.seal} />
          <Countdown to={meta.releaseAt.toISOString()} big />
          <p>This one isn't release yet baby wait ka lang konti🤍</p>
        </div>
      </main>
    );
  }

  // Released (or the admin is previewing): now it's safe to load the content.
  const [letter] = await db.select().from(letters).where(eq(letters.id, id));
  const myReactions = await db.select({ emoji: reactions.emoji }).from(reactions).where(eq(reactions.letterId, id));
  const myReplies = await db.select().from(replies).where(eq(replies.letterId, id)).orderBy(asc(replies.createdAt));

  let alreadyOpened = !!meta.firstOpenedAt;
  if (!isAdmin && !meta.firstOpenedAt) {
    const claimed = await db
      .update(letters)
      .set({ firstOpenedAt: new Date() })
      .where(and(eq(letters.id, id), isNull(letters.firstOpenedAt)))
      .returning({ id: letters.id });
    if (claimed.length) {
      notifyAdmin(
        `💌 Shai just opened "${letter.title || "Untitled"}"`,
        `Shai opened your letter "${letter.title || "Untitled"}" for the first time. 🤍`,
        `/admin/letters/${id}`,
      ).catch(() => {});
    } else {
      alreadyOpened = true;
    }
  }
  if (isAdmin) alreadyOpened = false;

  return (
    <main className="page">
      <SiteHeader isAdmin={isAdmin} />
      <Link href="/" className="back-link">← back</Link>
      {isAdmin && (locked || letter.isDraft) && (
        <p className="help" style={{ textAlign: "center" }}>
          Preview only. {letter.isDraft ? "This is a draft, so Shai can't see it." : "Shai sees a sealed envelope until it unlocks."}{" "}
          <Link href={`/admin/letters/${id}`}>Edit</Link>
        </p>
      )}
      <LetterReveal
        alreadyOpened={alreadyOpened}
        title={letter.title}
        dateIso={letter.releaseAt.toISOString()}
        html={letter.content}
        emblem={letter.seal}
      >
        <div className="after-letter">
          <Reactions letterId={id} active={myReactions.map((r) => r.emoji)} />
          <div className="paper-card reply-box">
            <h3>Reply</h3>
            <ReplyForm letterId={id} />
            {myReplies.length > 0 && (
              <div className="past-replies">
                {myReplies.map((r) => (
                  <div className="past-reply" key={r.id}>
                    <div className="meta">
                      You wrote, <LocalDate iso={r.createdAt.toISOString()} withTime />
                    </div>
                    <div className="body">{r.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </LetterReveal>
    </main>
  );
}
