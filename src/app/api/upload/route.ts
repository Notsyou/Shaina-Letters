import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getRole } from "@/lib/auth";

export const dynamic = "force-dynamic";
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
const MAX = 10 * 1024 * 1024;

export async function POST(req: Request) {
  if ((await getRole()) !== "admin") return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: "Only JPG, PNG, WEBP or GIF images." }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "Image is over 10 MB." }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());

  if (process.env.CLOUDINARY_URL) {
    const { v2: cloudinary } = await import("cloudinary");
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: "shais-letters", resource_type: "image", transformation: [{ width: 1600, crop: "limit", quality: "auto", fetch_format: "auto" }] }, (err, res) =>
          err || !res ? reject(err) : resolve(res),
        )
        .end(bytes);
    });
    return NextResponse.json({ url: result.secure_url });
  }

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "CLOUDINARY_URL is not set, so photos can't be stored." }, { status: 500 });
  }
  const dir = path.join(process.cwd(), ".data", "uploads");
  await mkdir(dir, { recursive: true });
  const name = `${randomBytes(12).toString("hex")}.${ext}`;
  await writeFile(path.join(dir, name), bytes);
  return NextResponse.json({ url: `/api/uploads/${name}` });
}
