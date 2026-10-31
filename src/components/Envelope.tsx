import type { ReactNode } from "react";
import { sealGlyph } from "@/lib/constants";

type Props = {
  /** sealed: closed with wax · locked: closed + tied with twine · opened: flap gone, letter peeking out */
  state: "sealed" | "locked" | "opened";
  ribbon?: string;
  peek?: string;
  /** Replace the default wax seal (e.g. with a clickable one) */
  seal?: ReactNode;
  /** Seal stamp id from SEALS (default: classic S) */
  emblem?: string;
  className?: string;
};

export function SealEmblem({ emblem }: { emblem?: string }) {
  const glyph = sealGlyph(emblem);
  const isIcon = glyph !== "S" && glyph !== "♥";
  return <span className={`emblem${isIcon ? " icon" : ""}`}>{glyph}</span>;
}

export function WaxSeal({ small, emblem }: { small?: boolean; emblem?: string }) {
  return (
    <span className={`seal${small ? " small" : ""}`} aria-hidden>
      <SealEmblem emblem={emblem} />
    </span>
  );
}

export default function Envelope({ state, ribbon, peek, seal, emblem, className }: Props) {
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
          {seal ?? <WaxSeal emblem={emblem} />}
        </>
      )}
      {ribbon && <span className="ribbon">{ribbon}</span>}
    </div>
  );
}
