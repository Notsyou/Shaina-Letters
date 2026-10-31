import { NextResponse } from "next/server";
import { tick } from "@/lib/notify";

export const dynamic = "force-dynamic";

// Ping this every ~10 minutes from cron-job.org: GET /api/cron/tick?key=YOUR_CRON_SECRET
// It sends any due "letter is ready" emails and keeps the free Render server awake.
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const result = await tick();
  return NextResponse.json({ ok: true, ...result });
}
