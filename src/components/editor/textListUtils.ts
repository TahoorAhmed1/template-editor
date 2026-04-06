import type { CanvasElement } from "./EditorShell";

export type ListBulletStyle =
  | "disc"
  | "ring"
  | "square"
  | "square-outline"
  | "check"
  | "arrow";

export type ListNumberStyle =
  | "decimal"
  | "decimal-leading-zero"
  | "upper-alpha"
  | "lower-alpha"
  | "upper-roman"
  | "lower-roman";

export const DEFAULT_LIST_BULLET_STYLE: ListBulletStyle = "disc";
export const DEFAULT_LIST_NUMBER_STYLE: ListNumberStyle = "decimal";

const BULLET_MARKERS: Record<ListBulletStyle, string> = {
  disc: "●",
  ring: "○",
  square: "■",
  "square-outline": "□",
  check: "☑",
  arrow: "➜",
};

const toAlpha = (value: number) => {
  let remaining = value;
  let result = "";

  while (remaining > 0) {
    remaining -= 1;
    result = String.fromCharCode(65 + (remaining % 26)) + result;
    remaining = Math.floor(remaining / 26);
  }

  return result;
};

const toRoman = (value: number) => {
  const numerals: Array<[number, string]> = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];

  let remaining = Math.max(1, value);
  let result = "";

  numerals.forEach(([amount, numeral]) => {
    while (remaining >= amount) {
      result += numeral;
      remaining -= amount;
    }
  });

  return result;
};

const getListLines = (content?: string) => {
  const normalized = (content || "").replace(/\r\n/g, "\n");
  return normalized.length > 0 ? normalized.split("\n") : [""];
};

export const getListBulletStyleValue = (element: CanvasElement): ListBulletStyle =>
  element.listBulletStyle || DEFAULT_LIST_BULLET_STYLE;

export const getListNumberStyleValue = (element: CanvasElement): ListNumberStyle =>
  element.listNumberStyle || DEFAULT_LIST_NUMBER_STYLE;

export const isTextListEnabled = (element: CanvasElement) =>
  element.type === "text" && (element.listStyle || "none") !== "none";

export const getListMarkerColor = (element: CanvasElement) =>
  element.listMarkerColor || element.color || "#000000";

export const getListMarkerColumnWidth = (element: CanvasElement) => {
  if ((element.listStyle || "none") !== "numbered") {
    return "1.55em";
  }

  switch (getListNumberStyleValue(element)) {
    case "decimal-leading-zero":
      return "2.55em";
    case "upper-roman":
    case "lower-roman":
      return "2.8em";
    default:
      return "2.3em";
  }
};

export const formatListMarker = (element: CanvasElement, index: number) => {
  if ((element.listStyle || "none") === "bulleted") {
    return BULLET_MARKERS[getListBulletStyleValue(element)];
  }

  const ordinal = index + 1;
  const style = getListNumberStyleValue(element);

  switch (style) {
    case "decimal-leading-zero":
      return `${String(ordinal).padStart(2, "0")}.`;
    case "upper-alpha":
      return `${toAlpha(ordinal)}.`;
    case "lower-alpha":
      return `${toAlpha(ordinal).toLowerCase()}.`;
    case "upper-roman":
      return `${toRoman(ordinal)}.`;
    case "lower-roman":
      return `${toRoman(ordinal).toLowerCase()}.`;
    default:
      return `${ordinal}.`;
  }
};

export const getTextListItems = (element: CanvasElement) =>
  getListLines(element.content).map((line, index) => ({
    marker: formatListMarker(element, index),
    content: line,
  }));

export const getTextDisplayContent = (
  element: CanvasElement,
  applyTextTransform = false,
) => {
  const rawText = isTextListEnabled(element)
    ? getTextListItems(element)
        .map(({ marker, content }) => `${marker} ${content}`.trimEnd())
        .join("\n")
    : element.content || "";

  if (applyTextTransform && element.textTransform === "uppercase") {
    return rawText.toUpperCase();
  }

  return rawText;
};