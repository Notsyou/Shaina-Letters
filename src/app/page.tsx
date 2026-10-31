import Link from "next/link";
import { and, asc, desc, eq, gt, lte } from "drizzle-orm";
import { requireReader } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { tickSoon } from "@/lib/notify";
import Envelope from "@/components/Envelope";
import Countdown from "@/components/Countdown";
import LocalDate from "@/components/LocalDate";
import SiteHeader from "@/components/SiteHeader";

const { letters } = schema;

export default async function Mailbox() {
  const role = await requireReader();
  tickSoon();
  const db = await getDb();
  const now = new Date();

  // Only ids and dates for sealed letters. Their title and content never leave the server.
  const sealed = await db
    .select({ id: letters.id, releaseAt: letters.releaseAt, seal: letters.seal })
    .from(letters)
    .where(and(eq(letters.isDraft, false), gt(letters.releaseAt, now)))
    .orderBy(asc(letters.releaseAt));

  const released = await db
    .select({ id: letters.id, title: letters.title, releaseAt: letters.releaseAt, firstOpenedAt: letters.firstOpenedAt, seal: letters.seal })
    .from(letters)
    .where(and(eq(letters.isDraft, false), lte(letters.releaseAt, now)))
    .orderBy(desc(letters.releaseAt));

  return (
    <main className="page">
      <SiteHeader isAdmin={role === "admin"} />

      {sealed.length > 0 && (
        <section className="section">
          <h2 className="section-title">On their way…</h2>
          <div className="mailbox">
            {sealed.map((l) => (
              <Link key={l.id} href={`/letter/${l.id}`} className="mail-card locked">
                <Envelope state="locked" emblem={l.seal} />
                <div className="caption">
                  <Countdown to={l.releaseAt.toISOString()} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <h2 className="section-title">Your letters</h2>
        {released.length === 0 ? (
          <p className="empty-note">Nothing here yet… but something is coming 🤍</p>
        ) : (
          <div className="mailbox">
            {released.map((l) => {
              const unread = !l.firstOpenedAt;
              return (
                <Link key={l.id} href={`/letter/${l.id}`} className="mail-card">
                  <Envelope state={unread ? "sealed" : "opened"} emblem={l.seal} ribbon={unread ? "new" : undefined} peek={unread ? undefined : l.title} />
                  <div className="caption">
                    <div className="title">{l.title || "A letter for you"}</div>
                    <div className="date">
                      <LocalDate iso={l.releaseAt.toISOString()} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
