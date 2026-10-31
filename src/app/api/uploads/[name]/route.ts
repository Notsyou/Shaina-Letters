import { readFile } from "node:fs/promises";
import path from "node:path";
import { getRole } from "@/lib/auth";

// Local development only: serves photos saved in .data/uploads.
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  if (!(await getRole())) return new Response("Not allowed", { status: 401 });
  const { name } = await params;
  if (!/^[a-f0-9]{24}\.(jpg|png|webp|gif)$/.test(name)) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(path.join(process.cwd(), ".data", "uploads", name));
    const ext = name.split(".").pop()!;
    const type = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
    return new Response(new Uint8Array(data), { headers: { "Content-Type": type, "Cache-Control": "private, max-age=31536000, immutable" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
