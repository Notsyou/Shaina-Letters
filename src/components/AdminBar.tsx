import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { logout } from "@/app/actions";

export default async function AdminBar({ title }: { title: string }) {
  const db = await getDb();
  const unseen = await db.select({ id: schema.replies.id }).from(schema.replies).where(eq(schema.replies.seenByAdmin, false));
  return (
    <div className="admin-bar">
      <h1>{title}</h1>
      <nav>
        <Link className="btn-plain" href="/admin">All letters</Link>
        <Link className="btn-plain" href="/admin/replies">
          Replies{unseen.length > 0 && <span className="dot">{unseen.length}</span>}
        </Link>
        <Link className="btn-plain" href="/">View site</Link>
        <Link className="btn-wax" href="/admin/new">✒ New letter</Link>
        <form action={logout}>
          <button className="btn-plain" type="submit">Log out</button>
        </form>
      </nav>
    </div>
  );
}
