"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { sendReply } from "@/app/actions";

export default function ReplyForm({ letterId }: { letterId: number }) {
  const [error, action, pending] = useActionState(sendReply.bind(null, letterId), null);
  const [sent, setSent] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const submitted = useRef(false);

  useEffect(() => {
    if (pending) submitted.current = true;
    else if (submitted.current) {
      submitted.current = false;
      if (!error) {
        formRef.current?.reset();
        setSent(true);
      }
    }
  }, [pending, error]);

  return (
    <form ref={formRef} action={action} onChange={() => setSent(false)}>
      <textarea name="content" placeholder="Dear you…" maxLength={20000} required />
      <div className="reply-actions">
        <span className="form-msg">{error ?? (sent ? "Sent, sealed with a kiss 💌" : "")}</span>
        <button className="btn-wax" type="submit" disabled={pending}>
          {pending ? "Sealing…" : "Seal & send"}
        </button>
      </div>
    </form>
  );
}
