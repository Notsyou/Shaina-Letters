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
          A new letter has been posted
          <small>When a new sealed letter arrives, with the day it opens.</small>
        </span>
      </label>
      <label className="check">
        <input type="checkbox" name="notifyReleased" defaultChecked={props.notifyReleased} />
        <span>
          A letter is ready to open
          <small>The moment a countdown reaches zero.</small>
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
