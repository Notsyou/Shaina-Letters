import type { ReactNode } from "react";

type Props = {
  /** sealed: closed with wax · locked: closed + tied with twine · opened: flap gone, letter peeking out */
  state: "sealed" | "locked" | "opened";
  ribbon?: string;
  peek?: string;
  /** Replace the default wax seal (e.g. with a clickable one) */
  seal?: ReactNode;
  className?: string;
};

export function WaxSeal({ small }: { small?: boolean }) {
  return (
    <span className={`seal${small ? " small" : ""}`} aria-hidden>
      <span className="emblem">S</span>
    </span>
  );
}

export default function Envelope({ state, ribbon, peek, seal, className }: Props) {
  return (
    <div className={`envelope ${className ?? ""}`}>
      <div className="paper-peek">{peek}</div>
      <div className="pocket-wrap">
        <div className="pocket" />
      </div>
      {state !== "opened" && (
        <>
          <div className="flap-wrap">
            <div className="flap" />
          </div>
          {state === "locked" && <div className="twine" />}
          {seal ?? <WaxSeal />}
        </>
      )}
      {ribbon && <span className="ribbon">{ribbon}</span>}
    </div>
  );
}
