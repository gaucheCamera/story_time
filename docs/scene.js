// Keep scene names portable between Obsidian, Windows and GitHub Pages.
export const isSceneName = (name) => typeof name === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(name);

export function parseScene(source) {
  let text = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  const colours = {};
  if (text.startsWith("---\n")) {
    const metadata = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
    if (!metadata) throw new Error("Close the colour metadata with ---.");
    for (const line of metadata[1].split("\n").filter((line) => line.trim())) {
      const entry = line.match(/^(background|accent):\s*["']?(#[\da-fA-F]{6}|#[\da-fA-F]{3})["']?\s*$/);
      if (!entry) throw new Error("Use background or accent with a hex colour, such as #101012.");
      colours[entry[1]] = entry[2];
    }
    text = text.slice(metadata[0].length).trim();
  }

  const title = text.match(/^# ([^\n]+)(?:\n|$)/);
  if (!title) throw new Error("Start the scene with a # Title.");
  const sections = text.slice(title[0].length).split(/^## Choices[ \t]*$/m);
  if (sections.length > 2) throw new Error("Use only one ## Choices section, at the end.");
  const choices = [];
  if (sections.length === 2) {
    const lines = sections[1].split("\n").filter((line) => line.trim());
    if (!lines.length) throw new Error("Add a choice, or remove ## Choices for an ending.");
    for (const line of lines) {
      const link = line.match(/^- \[([^\]\n]+)\]\(([^)]+)\)\s*$/);
      if (!link || !isSceneName(link[2]) || !link[1].trim()) {
        throw new Error("Write each choice as - [Button text](scene-name.md).");
      }
      choices.push({ label: link[1].trim(), target: link[2] });
    }
  }

  const blocks = [];
  for (const paragraph of sections[0].trim().split(/\n\s*\n/).filter(Boolean)) {
    if (paragraph.startsWith("## ")) {
      if (paragraph.includes("\n")) throw new Error("Leave a blank line after a heading.");
      blocks.push({ type: "h2", text: paragraph.slice(3) });
    } else if (paragraph.split("\n").every((line) => line.startsWith("> "))) {
      blocks.push({ type: "blockquote", text: paragraph.replace(/^> /gm, "").replace(/\n/g, " ") });
    } else {
      blocks.push({ type: "p", text: paragraph.replace(/\n/g, " ") });
    }
  }
  return { title: title[1].trim(), blocks, choices, ...colours };
}

export function inlineHtml(text) {
  // Scene text is prose, never executable HTML. Only these two inline styles are supported.
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*([^*]+)\*\*|\*([^*]+)\*/g, (_, bold, italic) =>
      bold ? `<strong>${bold}</strong>` : `<em>${italic}</em>`);
}
