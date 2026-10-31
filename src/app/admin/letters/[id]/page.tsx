import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import AdminBar from "@/components/AdminBar";
import LocalDate from "@/components/LocalDate";
import Editor from "../../Editor";
import { resealLetter } from "../../actions";

export default async function EditLetter({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const db = await getDb();
  const [l] = await db.select().from(schema.letters).where(eq(schema.letters.id, id));
  if (!l) notFound();
  const reacts = await db.select().from(schema.reactions).where(eq(schema.reactions.letterId, id));
  const reps = await db.select().from(schema.replies).where(eq(schema.replies.letterId, id)).orderBy(asc(schema.replies.createdAt));

  return (
    <main className="admin">
      <AdminBar title="Edit letter" />
      <div className="help" style={{ marginTop: 0, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.8rem", flexWrap: "wrap" }}>
        <span>
          {l.firstOpenedAt ? <>💌 Shai opened this on <LocalDate iso={l.firstOpenedAt.toISOString()} withTime />.</> : "Shai hasn't opened this one yet."}
          {reacts.length > 0 && <> Reactions: <span style={{ fontStyle: "normal" }}>{reacts.map((r) => r.emoji).join(" ")}</span></>}
        </span>
        {l.firstOpenedAt && (
          <form action={resealLetter.bind(null, l.id)}>
            <button className="btn-plain" type="submit" title="Show it as unopened again, with the seal and the 'new' ribbon. Her reactions and replies are kept.">
              🔁 Re-seal letter
            </button>
          </form>
        )}
      </div>
      <Editor id={l.id} title={l.title} content={l.content} releaseAt={l.releaseAt.toISOString()} isDraft={l.isDraft} seal={l.seal} />
      {reps.length > 0 && (
        <div className="paper-card" style={{ marginTop: "2rem" }}>
          <h3>Her replies</h3>
          <div className="past-replies" style={{ marginTop: 0 }}>
            {reps.map((r) => (
              <div className="past-reply" key={r.id}>
                <div className="meta"><LocalDate iso={r.createdAt.toISOString()} withTime /></div>
                <div className="body">{r.content}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
