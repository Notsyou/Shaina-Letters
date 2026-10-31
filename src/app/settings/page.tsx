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
      <Link href="/" className="back-link">← back to all letters</Link>
      <div className="paper-card" style={{ maxWidth: 560, margin: "0 auto" }}>
        <h3>Letter updates 💌</h3>
        <p className="help" style={{ marginTop: 0 }}>Want a little note in your inbox? Pick what you&apos;d like to hear about. You can turn it off any time.</p>
        <SubscribeForm email={s.email} notifyPosted={s.notifyPosted} notifyReleased={s.notifyReleased} />
      </div>
    </main>
  );
}
