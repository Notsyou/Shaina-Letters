import Link from "next/link";
import { logout } from "@/app/actions";
import { SITE_TITLE } from "@/lib/constants";

export default function SiteHeader({ isAdmin }: { isAdmin?: boolean }) {
  return (
    <header className="site-header">
      <h1 className="site-title">
        <Link href="/">{SITE_TITLE}</Link>
      </h1>
      <div className="flourish">❦</div>
      <nav className="site-nav">
        <Link href="/">Letters</Link>
        <Link href="/settings">Email updates</Link>
        {isAdmin && <Link href="/admin">Admin</Link>}
        <form action={logout}>
          <button type="submit">Log out</button>
        </form>
      </nav>
    </header>
  );
}
