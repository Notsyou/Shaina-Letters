"use client";

import { useActionState } from "react";
import { adminLogin } from "../actions";
import { WaxSeal } from "@/components/Envelope";

export default function AdminLogin() {
  const [error, action, pending] = useActionState(adminLogin, null);
  return (
    <main className="login">
      <div className="login-inner paper-card" style={{ padding: "2.4rem 2rem" }}>
        <div style={{ position: "relative", height: 90 }}>
          <div style={{ position: "absolute", inset: 0, width: 360, margin: "0 auto" }}>
            <WaxSeal />
          </div>
        </div>
        <h1 style={{ fontStyle: "italic", fontWeight: 500, margin: "0.8rem 0 1.4rem" }}>Writer&apos;s desk</h1>
        <form action={action}>
          <input className="input-line" type="password" name="password" placeholder="admin password" autoFocus required />
          <button className="btn-wax" type="submit" disabled={pending}>{pending ? "Checking…" : "Enter"}</button>
          {error && <div className="form-msg">{error}</div>}
        </form>
      </div>
    </main>
  );
}
