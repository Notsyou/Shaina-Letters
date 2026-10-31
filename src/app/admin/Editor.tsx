"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEditor, EditorContent, type Editor as TEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyleKit } from "@tiptap/extension-text-style";
import Image from "@tiptap/extension-image";
import { autosaveLetter, deleteLetter, saveLetter } from "./actions";
import { SEALS } from "@/lib/constants";
import { SealEmblem } from "@/components/Envelope";

type Props = {
  id?: number;
  title: string;
  content: string;
  releaseAt: string; // ISO
  isDraft: boolean;
  seal?: string;
};

const FONTS = [
  { label: "Handwriting", value: "" },
  { label: "Fancy script", value: "Homemade Apple" },
  { label: "Serif", value: "Cormorant Garamond" },
  { label: "Typewriter", value: "Special Elite" },
];
const SIZES = ["", "1.3rem", "2.2rem", "2.8rem"];
const COLORS = ["#27314f", "#d0578a", "#e98bb0", "#3f6fb5", "#7fa7dc", "#8a63b8"];

/** ISO → value for <input type="datetime-local"> in the writer's own time zone */
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

type Backup = { title: string; content: string; seal: string; release: string; at: number };
type AutoStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: string }
  | { kind: "device" }
  | { kind: "released" }
  | { kind: "signed-out" };

const backupKey = (id: number | undefined) => `sl-letter-backup:${id ?? "new"}`;
const sig = (title: string, content: string, seal: string) => JSON.stringify([title.trim(), content, seal]);

function AutosaveStatus({ status }: { status: AutoStatus }) {
  const text = (() => {
    switch (status.kind) {
      case "saving": return "Saving…";
      case "saved": return `✓ Autosaved ${new Date(status.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
      case "device": return "⚠ Can't reach the server. Saved on this device. Keep this page open, it'll retry as you type.";
      case "released": return "Shai can already read this letter, so changes are only kept on this device until you press Save.";
      case "signed-out": return "⚠ You're logged out. Your writing is saved on this device. Log in again in another tab, then come back and press Save.";
      default: return "Autosave is on";
    }
  })();
  const warn = status.kind === "device" || status.kind === "signed-out" || status.kind === "released";
  return <div className={`autosave-status${warn ? " warn" : ""}`} aria-live="polite">{text}</div>;
}

function Toolbar({ editor, onUpload, uploading }: { editor: TEditor; onUpload: (f: File) => void; uploading: boolean }) {
  const b = (label: string, title: string, active: boolean, run: () => void) => (
    <button type="button" title={title} className={active ? "on" : ""} onMouseDown={(e) => e.preventDefault()} onClick={run}>
      {label}
    </button>
  );
  const chain = () => editor.chain().focus();
  const font = (editor.getAttributes("textStyle").fontFamily as string | undefined) ?? "";
  const size = (editor.getAttributes("textStyle").fontSize as string | undefined) ?? "";

  return (
    <div className="toolbar">
      {b("B", "Bold", editor.isActive("bold"), () => chain().toggleBold().run())}
      {b("I", "Italic", editor.isActive("italic"), () => chain().toggleItalic().run())}
      {b("U", "Underline", editor.isActive("underline"), () => chain().toggleUnderline().run())}
      {b("S̶", "Strikethrough", editor.isActive("strike"), () => chain().toggleStrike().run())}
      <span className="sep" />
      {b("H1", "Big heading", editor.isActive("heading", { level: 2 }), () => chain().toggleHeading({ level: 2 }).run())}
      {b("H2", "Small heading", editor.isActive("heading", { level: 3 }), () => chain().toggleHeading({ level: 3 }).run())}
      {b("❝", "Quote", editor.isActive("blockquote"), () => chain().toggleBlockquote().run())}
      {b("•", "Bullet list", editor.isActive("bulletList"), () => chain().toggleBulletList().run())}
      {b("1.", "Numbered list", editor.isActive("orderedList"), () => chain().toggleOrderedList().run())}
      {b("❦", "Divider", false, () => chain().setHorizontalRule().run())}
      <span className="sep" />
      {b("⇤", "Align left", editor.isActive({ textAlign: "left" }), () => chain().setTextAlign("left").run())}
      {b("↔", "Center", editor.isActive({ textAlign: "center" }), () => chain().setTextAlign("center").run())}
      {b("⇥", "Align right", editor.isActive({ textAlign: "right" }), () => chain().setTextAlign("right").run())}
      <span className="sep" />
      <select
        title="Font"
        value={font}
        onChange={(e) => (e.target.value ? chain().setFontFamily(e.target.value).run() : chain().unsetFontFamily().run())}
      >
        {FONTS.map((f) => (
          <option key={f.label} value={f.value}>{f.label}</option>
        ))}
      </select>
      <select title="Size" value={size} onChange={(e) => (e.target.value ? chain().setFontSize(e.target.value).run() : chain().unsetFontSize().run())}>
        <option value="">Normal</option>
        <option value={SIZES[1]}>Small</option>
        <option value={SIZES[2]}>Large</option>
        <option value={SIZES[3]}>Huge</option>
      </select>
      {COLORS.map((c) => (
        <button key={c} type="button" title={`Color ${c}`} onMouseDown={(e) => e.preventDefault()} onClick={() => chain().setColor(c).run()}>
          <span style={{ width: 14, height: 14, borderRadius: "50%", background: c, display: "inline-block" }} />
        </button>
      ))}
      <input type="color" title="Any color" onChange={(e) => chain().setColor(e.target.value).run()} />
      <span className="sep" />
      <label className="tb" title="Add a photo">
        {uploading ? "⏳" : "🖼 Photo"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
            e.target.value = "";
          }}
        />
      </label>
      <span className="sep" />
      {b("↶", "Undo", false, () => chain().undo().run())}
      {b("↷", "Redo", false, () => chain().redo().run())}
    </div>
  );
}

export default function Editor(props: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(props.title);
  const [seal, setSeal] = useState(props.seal ?? "S");
  const [release, setRelease] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const dirty = useRef(false);

  // ── Autosave ──────────────────────────────────────────────
  // 1) every change is backed up in this browser (localStorage) within ~0.3s
  // 2) ~2s after typing stops it's saved to the server (as a draft for new letters)
  const idRef = useRef<number | undefined>(props.id);
  const [letterId, setLetterId] = useState<number | undefined>(props.id);
  const [tick, setTick] = useState(0);
  const [status, setStatus] = useState<AutoStatus>({ kind: "idle" });
  const [restore, setRestore] = useState<Backup | null>(null);
  const serverSig = useRef(sig(props.title, props.content, props.seal ?? "S"));
  const queue = useRef<Promise<void>>(Promise.resolve());
  const changed = () => { dirty.current = true; setTick((t) => t + 1); };

  useEffect(() => setRelease(toLocalInput(props.releaseAt)), [props.releaseAt]);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyleKit,
      Image,
    ],
    content: props.content,
    editorProps: { attributes: { class: "letter-body" } },
    onUpdate: () => {
      setMsg(null);
      changed();
    },
  });

  const snapshot = (): Backup | null =>
    editor ? { title, content: editor.getHTML(), seal, release, at: Date.now() } : null;

  function writeBackup() {
    const snap = snapshot();
    if (!snap) return;
    try {
      localStorage.setItem(backupKey(idRef.current), JSON.stringify(snap));
    } catch {}
  }

  function clearBackupIfSynced() {
    const snap = snapshot();
    if (snap && sig(snap.title, snap.content, snap.seal) === serverSig.current) {
      try { localStorage.removeItem(backupKey(idRef.current)); } catch {}
      dirty.current = false;
    }
  }

  function runAutosave() {
    queue.current = queue.current.then(async () => {
      const snap = snapshot();
      if (!snap) return;
      const s = sig(snap.title, snap.content, snap.seal);
      if (s === serverSig.current) return;
      setStatus({ kind: "saving" });
      try {
        const res = await autosaveLetter({
          id: idRef.current,
          title: snap.title,
          content: snap.content,
          seal: snap.seal,
          releaseAt: snap.release ? new Date(snap.release).toISOString() : "",
        });
        if (res.error === "signed-out") return setStatus({ kind: "signed-out" });
        if (res.error) return setStatus({ kind: "device" });
        if (res.skipped === "released") return setStatus({ kind: "released" });
        if (res.skipped === "empty") return setStatus({ kind: "idle" });
        if (!idRef.current && res.id) {
          // New letter just became a draft: move its backup and update the address bar (no reload).
          try { localStorage.removeItem(backupKey(undefined)); } catch {}
          idRef.current = res.id;
          setLetterId(res.id);
          window.history.replaceState(null, "", `/admin/letters/${res.id}`);
        }
        serverSig.current = s;
        setStatus({ kind: "saved", at: res.savedAt ?? new Date().toISOString() });
        writeBackup();
        clearBackupIfSynced();
      } catch {
        // offline or server unreachable: the device backup still has it
        setStatus({ kind: "device" });
      }
    });
  }

  // On every change: quick device backup, then a debounced server save.
  useEffect(() => {
    if (tick === 0) return;
    const t1 = setTimeout(writeBackup, 300);
    const t2 = setTimeout(runAutosave, 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Phones can kill a backgrounded tab without warning, so back up immediately when the page is hidden.
  useEffect(() => {
    const flush = () => { if (dirty.current) { writeBackup(); runAutosave(); } };
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    const warn = (e: BeforeUnloadEvent) => { flush(); if (dirty.current) e.preventDefault(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", warn);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", warn);
    };
  }); // re-bind each render so the handlers see the latest text

  // On open: offer to restore anything on this device that never reached the server.
  useEffect(() => {
    if (!editor) return;
    try {
      const raw = localStorage.getItem(backupKey(props.id));
      if (!raw) return;
      const b = JSON.parse(raw) as Backup;
      const empty = !b.title.trim() && !b.content.replace(/<[^>]*>/g, "").trim();
      if (empty || sig(b.title, b.content, b.seal) === serverSig.current) {
        localStorage.removeItem(backupKey(props.id));
        return;
      }
      setRestore(b);
    } catch {}
  }, [editor]); // eslint-disable-line react-hooks/exhaustive-deps

  function applyRestore() {
    if (!restore || !editor) return;
    setTitle(restore.title);
    setSeal(restore.seal);
    if (restore.release) setRelease(restore.release);
    editor.commands.setContent(restore.content);
    setRestore(null);
    changed();
  }

  function discardRestore() {
    try { localStorage.removeItem(backupKey(idRef.current)); } catch {}
    setRestore(null);
  }

  async function upload(file: File) {
    if (!editor) return;
    setUploading(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      editor.chain().focus().setImage({ src: data.url, alt: "" }).run();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function save(isDraft: boolean, releaseNow = false) {
    if (!editor) return;
    const releaseAt = releaseNow ? new Date().toISOString() : release ? new Date(release).toISOString() : "";
    start(async () => {
      await queue.current; // let any background save finish first (it may have created the draft)
      const content = editor.getHTML();
      const res = await saveLetter({ id: idRef.current, title, content, releaseAt, isDraft, seal });
      if (res.error) return setMsg(res.error);
      if (res.id) { idRef.current = res.id; setLetterId(res.id); }
      serverSig.current = sig(title, content, seal);
      setStatus({ kind: "saved", at: new Date().toISOString() });
      clearBackupIfSynced();
      if (releaseNow) setRelease(toLocalInput(releaseAt));
      const when = new Date(releaseAt);
      setMsg(isDraft ? "Draft saved ✓" : when > new Date() ? `Scheduled ✓ unlocks ${when.toLocaleString()}` : "Released ✓ Shai can read it now");
      if (!props.id && res.id) router.replace(`/admin/letters/${res.id}`);
      else router.refresh();
    });
  }

  const inFuture = release && new Date(release) > new Date();

  return (
    <div className="editor-grid">
      {restore && (
        <div className="restore-banner" role="alert">
          <span>
            <strong>Unsaved writing found on this device</strong> from {new Date(restore.at).toLocaleString()}.
          </span>
          <span className="restore-actions">
            <button className="btn-wax" type="button" onClick={applyRestore}>Restore it</button>
            <button className="btn-plain" type="button" onClick={discardRestore}>Discard</button>
          </span>
        </div>
      )}
      <div className="editor-meta">
        <label className="field" style={{ margin: 0 }}>
          <span>Title (Shai sees it once the letter unlocks)</span>
          <input className="input-box" value={title} onChange={(e) => { setTitle(e.target.value); changed(); }} placeholder="e.g. For your birthday" maxLength={200} />
        </label>
        <label className="field" style={{ margin: 0 }}>
          <span>Unlocks at (your time)</span>
          <input className="input-box" type="datetime-local" value={release} onChange={(e) => { setRelease(e.target.value); changed(); }} />
        </label>
      </div>

      <div className="seal-picker">
        <span className="seal-picker-label">Wax seal stamp</span>
        <div className="seal-options" role="radiogroup" aria-label="Wax seal stamp">
          {SEALS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={seal === s.id}
              title={s.label}
              className={`seal-option${seal === s.id ? " on" : ""}`}
              onClick={() => { setSeal(s.id); changed(); }}
            >
              <span className="seal mini"><SealEmblem emblem={s.id} /></span>
            </button>
          ))}
        </div>
        <span className="help">{SEALS.find((s) => s.id === seal)?.label}</span>
      </div>

      <div>
        <AutosaveStatus status={status} />
        {editor && <Toolbar editor={editor} onUpload={upload} uploading={uploading} />}
        <div className="editor-surface">
          <div className="letter-paper">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      <div className="editor-actions">
        <div className="left">
          <button className="btn-plain" type="button" disabled={pending} onClick={() => save(true)}>Save as draft</button>
          <button className="btn-wax" type="button" disabled={pending} onClick={() => save(false)}>
            {inFuture ? "✉ Seal & schedule" : "✉ Publish now"}
          </button>
          {inFuture && (
            <button className="btn-plain" type="button" disabled={pending} onClick={() => save(false, true)}>Release right now</button>
          )}
          {msg && <span className="form-msg">{msg}</span>}
        </div>
        <div className="right">
          {letterId && (
            <>
              <Link className="btn-plain" href={`/letter/${letterId}`} target="_blank">Preview ↗</Link>
              <button
                className="btn-danger"
                type="button"
                disabled={pending}
                onClick={() => {
                  if (confirm("Delete this letter forever? Her reactions and replies to it will be deleted too.")) {
                    dirty.current = false;
                    try { localStorage.removeItem(backupKey(letterId)); } catch {}
                    start(() => deleteLetter(letterId));
                  }
                }}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
      <p className="help">
        {props.isDraft || !props.id ? "Drafts are invisible to Shai. " : ""}
        Once scheduled, she sees only a sealed envelope and a countdown. The title and words stay hidden until it unlocks.
      </p>
    </div>
  );
}
