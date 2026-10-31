export const REACTIONS = ["❤️", "🥹", "😘", "😭", "🫶", "🤍"];
export const SITE_TITLE = "Shai's Letters 🫶🤍";

/** Wax-seal stamps the writer can pick per letter. `id` is what's stored in the database. */
export const SEALS = [
  { id: "S", glyph: "S", label: "Classic S" },
  { id: "heart", glyph: "♥", label: "Heart" },
  { id: "paw", glyph: "🐾", label: "Misty's paw" },
  { id: "dolphin", glyph: "🐬", label: "Dolphin" },
  { id: "panda", glyph: "🐼", label: "Panda" },
  { id: "bunny", glyph: "🐰", label: "Bunny" },
  { id: "golden", glyph: "🐶", label: "Golden retriever" },
  { id: "goldfish", glyph: "🐟", label: "Goldfish" },
  { id: "brain", glyph: "🧠", label: "Brain (future neurosurgeon)" },
  { id: "anatomy", glyph: "🫀", label: "Anatomical heart" },
] as const;

export function sealGlyph(id: string | null | undefined) {
  return SEALS.find((s) => s.id === id)?.glyph ?? "S";
}
