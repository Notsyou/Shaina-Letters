import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

let transport: Transporter | null = null;

function getTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  transport ??= nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  return transport;
}

export function siteUrl(path = "") {
  return (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "") + path;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** A small vintage-looking email. `body` is plain text; blank lines become paragraphs. */
export async function sendMail(opts: { to: string; subject: string; body: string; linkText?: string; link?: string }) {
  const paragraphs = opts.body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const button = opts.link
    ? `<p style="margin:22px 0 0"><a href="${opts.link}" style="background:#d0578a;color:#fff4f8;padding:10px 20px;border-radius:999px;text-decoration:none;font-family:Georgia,serif">${escapeHtml(opts.linkText || "Open")}</a></p>`
    : "";
  const html = `
  <div style="background:#f7e6ee;padding:32px 12px">
    <div style="max-width:520px;margin:0 auto;background:#fdf5f9;border:1px solid #c9d9ef;border-radius:6px;padding:28px 30px;font-family:Georgia,'Times New Roman',serif;color:#2f3a5c;font-size:16px;line-height:1.6">
      <div style="font-size:22px;margin-bottom:16px;color:#d0578a">Shai's Letters 🫶🤍</div>
      ${paragraphs}${button}
    </div>
  </div>`;

  const t = getTransport();
  if (!t) {
    console.log(`[mail:not-configured] to=${opts.to} subject="${opts.subject}"\n${opts.body}`);
    return;
  }
  try {
    await t.sendMail({
      from: `"Shai's Letters" <${process.env.GMAIL_USER}>`,
      to: opts.to,
      subject: opts.subject,
      text: opts.body + (opts.link ? `\n\n${opts.link}` : ""),
      html,
    });
  } catch (err) {
    console.error("[mail] failed to send", err);
  }
}
