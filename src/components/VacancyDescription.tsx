import type { ReactNode } from "react";

const allowedTags = new Set([
  "P",
  "UL",
  "OL",
  "LI",
  "BR",
  "STRONG",
  "B",
  "EM",
  "I",
  "U",
  "H2",
  "H3",
  "H4",
  "BLOCKQUOTE",
]);
const discardedTags = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "SVG", "MATH", "TEMPLATE"]);

function renderNode(node: ChildNode, key: string): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;
  if (!(node instanceof HTMLElement)) return null;
  if (discardedTags.has(node.tagName)) return null;

  const children = Array.from(node.childNodes).map((child, index) =>
    renderNode(child, `${key}-${index}`),
  );
  if (node.tagName === "BR") return <br key={key} />;
  if (node.tagName === "A") {
    const href = node.getAttribute("href");
    if (!href) return children;
    try {
      const url = new URL(href, window.location.origin);
      if (url.protocol !== "https:" && url.protocol !== "http:") return children;
      return <a href={url.toString()} key={key} rel="noreferrer" target="_blank">{children}</a>;
    } catch {
      return children;
    }
  }
  if (!allowedTags.has(node.tagName)) return children;

  const Tag = node.tagName.toLowerCase() as
    | "p"
    | "ul"
    | "ol"
    | "li"
    | "strong"
    | "b"
    | "em"
    | "i"
    | "u"
    | "h2"
    | "h3"
    | "h4"
    | "blockquote";

  return <Tag key={key}>{children}</Tag>;
}

export default function VacancyDescription({ html }: { html: string | null | undefined }) {
  if (!html?.trim()) {
    return <p className="text-muted-foreground">Não há uma descrição disponível para esta vaga.</p>;
  }

  const document = new DOMParser().parseFromString(html, "text/html");
  return <div className="vacancy-description">{Array.from(document.body.childNodes).map((node, index) => renderNode(node, `description-${index}`))}</div>;
}
