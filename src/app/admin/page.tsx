import Link from "next/link";
import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import AdminBar from "@/components/AdminBar";
import LocalDate from "@/components/LocalDate";

export default async function AdminHome() {
  await requireAdmin();
  const db = await getDb();
  const rows = await db
    .select({ id: schema.letters.id, title: schema.letters.title, isDraft: schema.letters.isDraft, releaseAt: schema.letters.releaseAt, firstOpenedAt: schema.letters.firstOpenedAt })
    .from(schema.letters)
    .orderBy(desc(schema.letters.releaseAt));
  const now = new Date();

  return (
    <main className="admin">
      <AdminBar title="Writer's desk" />
      {rows.length === 0 && <p className="empty-note">No letters yet. Write the first one ✒</p>}
      <div className="admin-list">
        {rows.map((l) => {
          const status = l.isDraft ? "draft" : l.releaseAt > now ? "scheduled" : l.firstOpenedAt ? "opened" : "released";
          return (
            <Link key={l.id} href={`/admin/letters/${l.id}`} className="admin-row">
              <span className="t">{l.title || <em>Untitled</em>}</span>
              <span className={`badge ${status}`}>{status === "released" ? "released · unread" : status}</span>
              <span className="sub">
                {status === "opened" && l.firstOpenedAt ? (
                  <>Opened <LocalDate iso={l.firstOpenedAt.toISOString()} withTime /></>
                ) : (
                  <>{l.isDraft ? "Planned for" : l.releaseAt > now ? "Unlocks" : "Released"} <LocalDate iso={l.releaseAt.toISOString()} withTime /></>
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
