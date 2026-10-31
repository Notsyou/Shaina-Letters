"use client";

import { useActionState } from "react";
import { saveSubscription } from "@/app/actions";

export default function SubscribeForm(props: { email: string; notifyPosted: boolean; notifyReleased: boolean }) {
  const [msg, action, pending] = useActionState(saveSubscription, null);
  return (
    <form action={action}>
      <label className="field">
        <span>Your email</span>
        <input className="input-line" type="email" name="email" defaultValue={props.email} placeholder="you@example.com" />
      </label>
      <label className="check">
        <input type="checkbox" name="notifyPosted" defaultChecked={props.notifyPosted} />
        <span>
          When I post a new letter
          <small>It sends you an email when it opens.</small>
        </span>
      </label>
      <label className="check">
        <input type="checkbox" name="notifyReleased" defaultChecked={props.notifyReleased} />
        <span>
          When a letter is ready to open
          <small>As soon as the countdown ends I'll send an email :).</small>
        </span>
      </label>
      <div className="reply-actions">
        <span className="form-msg">{msg}</span>
        <button className="btn-wax" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
