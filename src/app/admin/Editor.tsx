"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEditor, EditorContent, type Editor as TEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyleKit } from "@tiptap/extension-text-style";
import Image from "@tiptap/extension-image";
import { deleteLetter, saveLetter } from "./actions";

type Props = {
  id?: number;
  title: string;
  content: string;
  releaseAt: string; // ISO
  isDraft: boolean;
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
  const [release, setRelease] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const dirty = useRef(false);

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
      dirty.current = true;
      setMsg(null);
    },
  });

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

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
      const res = await saveLetter({ id: props.id, title, content: editor.getHTML(), releaseAt, isDraft });
      if (res.error) return setMsg(res.error);
      dirty.current = false;
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
      <div className="editor-meta">
        <label className="field" style={{ margin: 0 }}>
          <span>Title (Shai sees it once the letter unlocks)</span>
          <input className="input-box" value={title} onChange={(e) => { setTitle(e.target.value); dirty.current = true; }} placeholder="e.g. For your birthday" maxLength={200} />
        </label>
        <label className="field" style={{ margin: 0 }}>
          <span>Unlocks at (your time)</span>
          <input className="input-box" type="datetime-local" value={release} onChange={(e) => { setRelease(e.target.value); dirty.current = true; }} />
        </label>
      </div>

      <div>
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
          {props.id && (
            <>
              <Link className="btn-plain" href={`/letter/${props.id}`} target="_blank">Preview ↗</Link>
              <button
                className="btn-danger"
                type="button"
                disabled={pending}
                onClick={() => {
                  if (confirm("Delete this letter forever? Her reactions and replies to it will be deleted too.")) {
                    dirty.current = false;
                    start(() => deleteLetter(props.id!));
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
