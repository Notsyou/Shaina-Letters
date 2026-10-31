import "server-only";
import sanitizeHtml from "sanitize-html";

const textStyles = {
  color: [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i],
  "font-family": [/^[\w\s,'"-]+$/],
  "font-size": [/^\d+(\.\d+)?(px|em|rem|%)$/],
  "background-color": [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i],
};

export function cleanLetterHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ["p", "h1", "h2", "h3", "strong", "em", "u", "s", "blockquote", "ul", "ol", "li", "br", "hr", "span", "img", "a", "mark", "code"],
    allowedAttributes: {
      "*": ["style"],
      img: ["src", "alt", "title"],
      a: ["href", "target", "rel"],
    },
    allowedStyles: {
      "*": { ...textStyles, "text-align": [/^(left|right|center|justify)$/] },
    },
    allowedSchemes: ["https", "http", "mailto"],
    allowedSchemesByTag: { img: ["https", "http"] },
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }),
    },
    exclusiveFilter: (frame) => frame.tag === "img" && !/^(https:\/\/|\/api\/uploads\/)/.test(frame.attribs.src || ""),
  });
}
