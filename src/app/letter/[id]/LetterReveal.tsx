"use client";

import { useState, type ReactNode } from "react";
import LocalDate from "@/components/LocalDate";
import { SealEmblem } from "@/components/Envelope";

type Stage = "sealed" | "opening" | "done" | "read";

export default function LetterReveal(props: { alreadyOpened: boolean; title: string; dateIso: string; html: string; emblem?: string; children: ReactNode }) {
  const [stage, setStage] = useState<Stage>(props.alreadyOpened ? "read" : "sealed");

  function open() {
    if (stage !== "sealed") return;
    setStage("opening");
    setTimeout(() => setStage("done"), 2300);
    setTimeout(() => setStage("read"), 2850);
  }

  if (stage !== "read") {
    return (
      <div className={`reveal-stage ${stage}`}>
        <div className="envelope">
          <div className="paper-peek">{props.title}</div>
          <div className="pocket-wrap">
            <div className="pocket" />
          </div>
          <div className="flap-wrap">
            <div className="flap" />
          </div>
          <button type="button" className={`seal${stage === "sealed" ? " clickable" : ""}`} onClick={open} aria-label="Break the seal to open the letter">
            <SealEmblem emblem={props.emblem} />
          </button>
        </div>
        <p className="hint" style={{ visibility: stage === "sealed" ? "visible" : "hidden" }}>
          tap the seal to open
        </p>
      </div>
    );
  }

  return (
    <>
      <article className="letter-paper">
        <div className="letter-head">
          <span>
            <LocalDate iso={props.dateIso} />
          </span>
          <span>for Shai</span>
        </div>
        {props.title && <h2 className="letter-title">{props.title}</h2>}
        <div className="letter-body" dangerouslySetInnerHTML={{ __html: props.html }} />
      </article>
      {props.children}
    </>
  );
}
