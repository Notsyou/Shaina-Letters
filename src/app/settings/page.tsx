import Link from "next/link";
import { requireReader } from "@/lib/auth";
import { getSettings } from "@/lib/notify";
import SiteHeader from "@/components/SiteHeader";
import SubscribeForm from "./SubscribeForm";

export default async function SettingsPage() {
  const role = await requireReader();
  const s = await getSettings();
  return (
    <main className="page">
      <SiteHeader isAdmin={role === "admin"} />
      <Link href="/" className="back-link">← back</Link>
      <div className="paper-card" style={{ maxWidth: 560, margin: "0 auto" }}>
        <h3>Email updates</h3>
        <p className="help" style={{ marginTop: 0 }}>Get an email when there&apos;s a new letter. You can turn this off anytime.</p>
        <SubscribeForm email={s.email} notifyPosted={s.notifyPosted} notifyReleased={s.notifyReleased} />
      </div>
    </main>
  );
}
