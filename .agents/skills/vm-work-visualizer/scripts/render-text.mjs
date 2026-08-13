export const MAX_TEXT_LINES = 4;
export const TEXT_LINE_HEIGHT = 1.25;
const CHARACTER_WIDTH = 0.6;

function maxCharacters(width, fontSize) {
  return Math.max(1, Math.floor(width / (fontSize * CHARACTER_WIDTH)));
}

function splitToken(token, width) {
  const pieces = [];
  for (let index = 0; index < token.length; index += width) pieces.push(token.slice(index, index + width));
  return pieces;
}

function appendParagraph(lines, paragraph, width) {
  if (paragraph.length === 0) {
    lines.push("");
    return;
  }
  let current = "";
  for (const token of paragraph.split(/\s+/)) {
    const pieces = splitToken(token, width);
    for (const piece of pieces) {
      if (current.length === 0) {
        current = piece;
      } else if (current.length + 1 + piece.length <= width) {
        current += ` ${piece}`;
      } else {
        lines.push(current);
        current = piece;
      }
    }
  }
  if (current.length > 0) lines.push(current);
}

export function wrapText(value, availableWidth, fontSize, maxLines = MAX_TEXT_LINES) {
  const width = maxCharacters(availableWidth, fontSize);
  const lines = [];
  for (const paragraph of String(value).split("\n")) appendParagraph(lines, paragraph, width);
  if (lines.length <= maxLines) return lines;
  const bounded = lines.slice(0, maxLines);
  const last = bounded.length - 1;
  bounded[last] = `${bounded[last].slice(0, Math.max(0, width - 1))}…`;
  return bounded;
}

export function textLayout(node) {
  const fontSize = node.fontSize ?? 20;
  const width = node.width - 24;
  const height = node.height - 24;
  const maxLines = Math.max(1, Math.min(MAX_TEXT_LINES, Math.floor(height / (fontSize * TEXT_LINE_HEIGHT))));
  return {
    fontSize,
    width,
    height,
    lineHeight: fontSize * TEXT_LINE_HEIGHT,
    lines: wrapText(node.label, width, fontSize, maxLines),
  };
}
