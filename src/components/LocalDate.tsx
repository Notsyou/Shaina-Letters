"use client";

import { useEffect, useState } from "react";

/** Renders a date in the viewer's own time zone (avoids server/client mismatch). */
export default function LocalDate({ iso, withTime }: { iso: string; withTime?: boolean }) {
  const [text, setText] = useState("");
  useEffect(() => {
    const d = new Date(iso);
    setText(
      d.toLocaleString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
        ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
      }),
    );
  }, [iso, withTime]);
  return <time dateTime={iso}>{text || " "}</time>;
}
