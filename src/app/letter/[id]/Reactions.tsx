"use client";

import { useOptimistic, useTransition } from "react";
import { toggleReaction } from "@/app/actions";
import { REACTIONS } from "@/lib/constants";

export default function Reactions({ letterId, active }: { letterId: number; active: string[] }) {
  const [, start] = useTransition();
  const [on, toggle] = useOptimistic(active, (cur: string[], e: string) => (cur.includes(e) ? cur.filter((x) => x !== e) : [...cur, e]));

  return (
    <div className="reactions" aria-label="React to this letter">
      {REACTIONS.map((e) => (
        <button
          key={e}
          type="button"
          className={`reaction${on.includes(e) ? " on" : ""}`}
          aria-pressed={on.includes(e)}
          onClick={() =>
            start(async () => {
              toggle(e);
              await toggleReaction(letterId, e);
            })
          }
        >
          {e}
        </button>
      ))}
    </div>
  );
}
