"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}
const pad = (n: number) => String(n).padStart(2, "0");

export default function Countdown({ to, big }: { to: string; big?: boolean }) {
  const router = useRouter();
  const target = new Date(to).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const left = now === null ? null : target - now;
  useEffect(() => {
    if (left !== null && left <= 0) {
      // Give the server a moment, then reload so the letter appears.
      const t = setTimeout(() => router.refresh(), 1200);
      return () => clearTimeout(t);
    }
  }, [left !== null && left <= 0, router]); // eslint-disable-line react-hooks/exhaustive-deps

  if (left === null) return <span className={`countdown${big ? " big" : ""}`} aria-hidden>&nbsp;</span>;
  if (left <= 0) return <span className={`countdown${big ? " big" : ""}`}>✨ ready ✨</span>;

  const p = parts(left);
  const units: [string, string][] = [
    [String(p.d), p.d === 1 ? "day" : "days"],
    [pad(p.h), "hrs"],
    [pad(p.m), "min"],
    [pad(p.s), "sec"],
  ];
  return (
    <span className={`countdown${big ? " big" : ""}`} role="timer" aria-label={`${p.d} days ${p.h} hours ${p.m} minutes left`}>
      {units.map(([n, l]) => (
        <span className="unit" key={l}>
          <span className="num">{n}</span>
          <span className="lbl">{l}</span>
        </span>
      ))}
    </span>
  );
}
