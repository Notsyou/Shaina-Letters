import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import AdminBar from "@/components/AdminBar";
import LocalDate from "@/components/LocalDate";
import { markReplySeen } from "../actions";

export default async function Replies() {
  await requireAdmin();
  const db = await getDb();
  const rows = await db
    .select({ reply: schema.replies, title: schema.letters.title })
    .from(schema.replies)
    .innerJoin(schema.letters, eq(schema.letters.id, schema.replies.letterId))
    .orderBy(desc(schema.replies.createdAt));

  return (
    <main className="admin">
      <AdminBar title="Her replies 💌" />
      {rows.length === 0 && <p className="empty-note">No replies yet. They&apos;ll show up here.</p>}
      <div className="past-replies">
        {rows.map(({ reply: r, title }) => (
          <div className="past-reply" key={r.id} style={r.seenByAdmin ? undefined : { borderLeftColor: "var(--wax)", background: "#fff5ec" }}>
            <div className="meta" style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
              <span>
                On <Link href={`/admin/letters/${r.letterId}`}>{title || "Untitled"}</Link> · <LocalDate iso={r.createdAt.toISOString()} withTime />
              </span>
              {!r.seenByAdmin && (
                <form action={markReplySeen.bind(null, r.id)}>
                  <button className="btn-plain" type="submit" style={{ padding: "0.1rem 0.8rem" }}>Mark as read</button>
                </form>
              )}
            </div>
            <div className="body">{r.content}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
