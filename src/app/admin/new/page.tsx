import { requireAdmin } from "@/lib/auth";
import AdminBar from "@/components/AdminBar";
import Editor from "../Editor";

export default async function NewLetter() {
  await requireAdmin();
  const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
  tomorrow.setSeconds(0, 0);
  return (
    <main className="admin">
      <AdminBar title="A new letter" />
      <Editor title="" content="" releaseAt={tomorrow.toISOString()} isDraft />
    </main>
  );
}
