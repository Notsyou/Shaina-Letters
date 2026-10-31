"use client";

import { useActionState, useEffect, useState } from "react";
import { readerLogin } from "@/app/actions";
import Envelope from "@/components/Envelope";
import { SITE_TITLE } from "@/lib/constants";

export default function LoginForm() {
  const [error, action, pending] = useActionState(readerLogin, null);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (!error) return;
    setShake(true);
    const t = setTimeout(() => setShake(false), 500);
    return () => clearTimeout(t);
  }, [error]);

  return (
    <main className={`login${shake ? " shake" : ""}`}>
      <div className="login-inner">
        <h1 className="site-title">{SITE_TITLE}</h1>
        <div className="flourish">❦</div>
        <p className="subtitle">some words, sealed just for you</p>
        <Envelope state="sealed" />
        <form action={action}>
          <input className="input-line" type="password" name="password" placeholder="the secret word…" autoComplete="current-password" required autoFocus />
          <button className="btn-wax" type="submit" disabled={pending}>
            {pending ? "Opening…" : "Break the seal"}
          </button>
          {error && <div className="form-msg">{error}</div>}
        </form>
      </div>
    </main>
  );
}
