export type BackgroundEditorType = "solid" | "linear" | "radial" | "transparent";

export type ParsedLinearGradient = {
  angleDeg: number;
  colorStops: Array<{ color: string; offset: number }>;
};

export type ParsedRadialGradient = {
  shape: "circle";
  center: { x: number; y: number };
  colorStops: Array<{ color: string; offset: number }>;
};

export type BackgroundDraft = {
  type: BackgroundEditorType;
  colors: [string, string];
  angleDeg: number;
};

const DEFAULT_PRIMARY = "#FCBB7E";
const DEFAULT_SECONDARY = "#8C5523";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function normalizeHexColor(input: string): string | null {
  const value = input.trim();
  const compact = value.startsWith("#") ? value : `#${value}`;

  if (/^#[0-9a-fA-F]{3}$/.test(compact)) {
    const [r, g, b] = compact.slice(1).split("");
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }

  if (/^#[0-9a-fA-F]{6}$/.test(compact)) {
    return compact.toUpperCase();
  }

  return null;
}

export function buildBackgroundValue(draft: BackgroundDraft): string {
  if (draft.type === "transparent") {
    return "transparent";
  }

  if (draft.type === "solid") {
    return draft.colors[0];
  }

  if (draft.type === "radial") {
    return `radial-gradient(circle at center, ${draft.colors[0]} 0%, ${draft.colors[1]} 100%)`;
  }

  return `linear-gradient(${draft.angleDeg}deg, ${draft.colors[0]} 0%, ${draft.colors[1]} 100%)`;
}

export function parseBackgroundValue(input: string): BackgroundDraft {
  const normalized = input.trim();

  if (!normalized || normalized === "transparent") {
    return {
      type: "transparent",
      colors: [DEFAULT_PRIMARY, DEFAULT_SECONDARY],
      angleDeg: 135,
    };
  }

  const linear = parseLinearGradient(normalized);
  if (linear) {
    return {
      type: "linear",
      colors: [linear.colorStops[0].color, linear.colorStops[linear.colorStops.length - 1].color],
      angleDeg: linear.angleDeg,
    };
  }

  const radial = parseRadialGradient(normalized);
  if (radial) {
    return {
      type: "radial",
      colors: [radial.colorStops[0].color, radial.colorStops[radial.colorStops.length - 1].color],
      angleDeg: 135,
    };
  }

  const solid = normalizeHexColor(normalized);
  return {
    type: solid ? "solid" : "solid",
    colors: [solid ?? DEFAULT_PRIMARY, DEFAULT_SECONDARY],
    angleDeg: 135,
  };
}

export function parseLinearGradient(input: string): ParsedLinearGradient | null {
  const value = input.trim();
  if (!value.toLowerCase().startsWith("linear-gradient(") || !value.endsWith(")")) {
    return null;
  }

  const inside = value.slice(value.indexOf("(") + 1, -1).trim();
  const parts = splitGradientArgs(inside);
  if (parts.length < 2) return null;

  let angleDeg = 180;
  let stopParts = parts;

  const first = parts[0].trim().toLowerCase();
  if (isGradientDirection(first)) {
    angleDeg = parseGradientAngle(first);
    stopParts = parts.slice(1);
  }

  const rawStops = stopParts
    .map(parseGradientStop)
    .filter((stop): stop is { color: string; offset?: number } => Boolean(stop));

  if (rawStops.length < 2) return null;

  return {
    angleDeg,
    colorStops: normalizeGradientStops(rawStops),
  };
}

export function parseRadialGradient(input: string): ParsedRadialGradient | null {
  const value = input.trim();
  if (!value.toLowerCase().startsWith("radial-gradient(") || !value.endsWith(")")) {
    return null;
  }

  const inside = value.slice(value.indexOf("(") + 1, -1).trim();
  const parts = splitGradientArgs(inside);
  if (parts.length < 2) return null;

  let stopParts = parts;
  let center = { x: 0.5, y: 0.5 };
  const first = parts[0].trim().toLowerCase();
  if (first.includes("circle") || first.includes("ellipse") || first.startsWith("at ")) {
    center = parseRadialCenter(first);
    stopParts = parts.slice(1);
  }

  const rawStops = stopParts
    .map(parseGradientStop)
    .filter((stop): stop is { color: string; offset?: number } => Boolean(stop));

  if (rawStops.length < 2) return null;

  return {
    shape: "circle",
    center,
    colorStops: normalizeGradientStops(rawStops),
  };
}

export function getLinearGradientPoints(
  angleDeg: number,
  width: number,
  height: number,
): {
  start: { x: number; y: number };
  end: { x: number; y: number };
} {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const cx = width / 2;
  const cy = height / 2;
  const halfLen = Math.abs(dx) * (width / 2) + Math.abs(dy) * (height / 2);

  return {
    start: { x: cx - dx * halfLen, y: cy - dy * halfLen },
    end: { x: cx + dx * halfLen, y: cy + dy * halfLen },
  };
}

export function getRadialGradientGeometry(
  gradient: ParsedRadialGradient,
  width: number,
  height: number,
): {
  startPoint: { x: number; y: number };
  startRadius: number;
  endPoint: { x: number; y: number };
  endRadius: number;
} {
  const centerX = width * gradient.center.x;
  const centerY = height * gradient.center.y;

  return {
    startPoint: { x: centerX, y: centerY },
    startRadius: 0,
    endPoint: { x: centerX, y: centerY },
    endRadius: Math.max(width, height) * 0.75,
  };
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = normalizeHexColor(hex) ?? DEFAULT_PRIMARY;
  const value = normalized.slice(1);

  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

export function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const { r, g, b } = hexToRgb(hex);
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rNorm) h = ((gNorm - bNorm) / delta) % 6;
    else if (max === gNorm) h = (bNorm - rNorm) / delta + 2;
    else h = (rNorm - gNorm) / delta + 4;
  }

  return {
    h: ((h * 60) + 360) % 360,
    s: max === 0 ? 0 : delta / max,
    v: max,
  };
}

export function hsvToHex(h: number, s: number, v: number): string {
  const hue = ((h % 360) + 360) % 360;
  const chroma = v * s;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const match = v - chroma;

  let r = 0;
  let g = 0;
  let b = 0;

  if (hue < 60) [r, g, b] = [chroma, x, 0];
  else if (hue < 120) [r, g, b] = [x, chroma, 0];
  else if (hue < 180) [r, g, b] = [0, chroma, x];
  else if (hue < 240) [r, g, b] = [0, x, chroma];
  else if (hue < 300) [r, g, b] = [x, 0, chroma];
  else [r, g, b] = [chroma, 0, x];

  return rgbToHex((r + match) * 255, (g + match) * 255, (b + match) * 255);
}

function splitGradientArgs(input: string): string[] {
  const result: string[] = [];
  let current = "";
  let depth = 0;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;

    if (char === "," && depth === 0) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) result.push(current.trim());
  return result;
}

function isGradientDirection(value: string): boolean {
  return value.endsWith("deg") || value.startsWith("to ");
}

function parseGradientAngle(value: string): number {
  const v = value.trim().toLowerCase();

  if (v.endsWith("deg")) {
    const parsed = parseFloat(v.replace("deg", "").trim());
    return Number.isFinite(parsed) ? parsed : 180;
  }

  if (v.startsWith("to ")) {
    const direction = v.slice(3).trim();
    if (direction === "top") return 0;
    if (direction === "top right" || direction === "right top") return 45;
    if (direction === "right") return 90;
    if (direction === "bottom right" || direction === "right bottom") return 135;
    if (direction === "bottom") return 180;
    if (direction === "bottom left" || direction === "left bottom") return 225;
    if (direction === "left") return 270;
    if (direction === "top left" || direction === "left top") return 315;
  }

  return 180;
}

function parseGradientStop(part: string): { color: string; offset?: number } | null {
  const trimmed = part.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(.*?)(?:\s+(-?\d*\.?\d+)%?)?$/);
  if (!match) return null;

  const color = match[1].trim();
  const rawOffset = match[2];

  if (!color) return null;

  if (rawOffset == null || rawOffset === "") {
    return { color };
  }

  const percent = parseFloat(rawOffset);
  if (!Number.isFinite(percent)) {
    return { color };
  }

  return {
    color,
    offset: clamp(percent / 100, 0, 1),
  };
}

function normalizeGradientStops(
  stops: Array<{ color: string; offset?: number }>,
): Array<{ color: string; offset: number }> {
  const result = stops.map((stop) => ({ ...stop }));

  if (result[0].offset == null) result[0].offset = 0;
  if (result[result.length - 1].offset == null) result[result.length - 1].offset = 1;

  let index = 0;
  while (index < result.length) {
    if (result[index].offset != null) {
      index += 1;
      continue;
    }

    const startIndex = index - 1;
    let endIndex = index;
    while (endIndex < result.length && result[endIndex].offset == null) {
      endIndex += 1;
    }

    const startOffset = result[startIndex]?.offset ?? 0;
    const endOffset = result[endIndex]?.offset ?? 1;
    const gap = endIndex - startIndex;

    for (let cursor = 1; cursor < gap; cursor += 1) {
      const ratio = cursor / gap;
      result[startIndex + cursor].offset = startOffset + (endOffset - startOffset) * ratio;
    }

    index = endIndex + 1;
  }

  return result.map((stop) => ({
    color: stop.color,
    offset: clamp(stop.offset ?? 0, 0, 1),
  }));
}

function parseRadialCenter(value: string): { x: number; y: number } {
  const atIndex = value.indexOf("at ");
  if (atIndex === -1) {
    return { x: 0.5, y: 0.5 };
  }

  const location = value.slice(atIndex + 3).trim();
  const parts = location.split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return { x: 0.5, y: 0.5 };
  }

  return {
    x: parseRadialAxis(parts[0]),
    y: parseRadialAxis(parts[1]),
  };
}

function parseRadialAxis(value: string): number {
  if (value === "left" || value === "top") return 0;
  if (value === "center") return 0.5;
  if (value === "right" || value === "bottom") return 1;
  if (value.endsWith("%")) {
    const parsed = parseFloat(value.replace("%", ""));
    return Number.isFinite(parsed) ? clamp(parsed / 100, 0, 1) : 0.5;
  }

  return 0.5;
}