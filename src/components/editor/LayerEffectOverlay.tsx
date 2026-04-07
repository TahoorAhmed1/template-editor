import React from "react";
import type { CanvasElement } from "./EditorShell";
import { shouldUseDomEffectOverlay } from "./layerEffectUtils";
import { getListMarkerColor, getListMarkerColumnWidth, getTextListItems, isTextListEnabled } from "./textListUtils";

interface LayerEffectOverlayProps {
  elements: CanvasElement[];
  scale: number;
  editingLayerId?: string | null;
  hiddenElementIds?: string[];
  pulseProgress: number;
  isMobile: boolean;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const getMotionState = (element: CanvasElement) => {
  const animation = element.animationProps;
  return animation?.[animation.activePhase] ?? {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
  };
};

const getMobileIntensityScale = (isMobile: boolean) => (isMobile ? 0.62 : 1);

const getVerticalAlignment = (
  align?: CanvasElement["textVerticalAlign"],
) => {
  if (align === "top") return "flex-start";
  if (align === "bottom") return "flex-end";
  if (align === "middle") return "center";
  return "flex-start";
};

const getTextFontStyle = (element: CanvasElement) => {
  const weight = element.fontWeight || "normal";
  const style = element.fontStyle || "normal";

  if (style === "italic" && weight === "bold") {
    return "italic";
  }

  return style;
};

const getTextAlignment = (align?: CanvasElement["textAlign"]) => {
  if (align === "center") return "center";
  if (align === "right") return "flex-end";
  return "flex-start";
};

const getTextShapeAmount = (element: CanvasElement) =>
  clamp(element.textShapeAmount ?? 60, 0, 100);

const getTextGradientColors = (element: CanvasElement) =>
  (element.textGradientColors || []).filter((color) => typeof color === "string" && color.length > 0);

const getTextGradientBackground = (element: CanvasElement) => {
  const gradientColors = getTextGradientColors(element);
  if (gradientColors.length < 2) {
    return undefined;
  }

  const step = gradientColors.length === 1 ? 100 : 100 / (gradientColors.length - 1);
  const angle = element.textGradientAngle ?? 90;
  const stops = gradientColors.map((color, index) => `${color} ${Math.round(index * step)}%`);
  return `linear-gradient(${angle}deg, ${stops.join(", ")})`;
};

const buildTextEffectFilter = (
  element: CanvasElement,
  pulseProgress: number,
  isMobile: boolean,
) => {
  const effect = element.effectProps;
  if (!effect || element.type !== "text") return undefined;

  const factor = getMobileIntensityScale(isMobile);
  const filters: string[] = [];

  if (effect.preset === "neon-glow") {
    const glow = Math.max(4, effect.glowIntensity * factor);
    filters.push(`drop-shadow(0 0 ${glow}px ${effect.glowColor})`);
    filters.push(`drop-shadow(0 0 ${glow * 0.55}px ${effect.glowColor})`);
  }

  const hasShadow =
    effect.preset === "drop-shadow" ||
    effect.shadowBlur > 0 ||
    Math.abs(effect.shadowOffsetX) > 0 ||
    Math.abs(effect.shadowOffsetY) > 0 ||
    effect.shadowOpacity > 0;

  if (hasShadow) {
    const blur = Math.max(2, effect.shadowBlur * factor);
    const color = hexToRgba(effect.shadowColor, effect.shadowOpacity);
    filters.push(
      `drop-shadow(${effect.shadowOffsetX * factor}px ${effect.shadowOffsetY * factor}px ${blur}px ${color})`,
    );
  }

  if (effect.preset === "pulse") {
    const pulseGlow = Math.max(4, effect.glowIntensity * factor * (0.75 + pulseProgress * 0.55));
    filters.push(`drop-shadow(0 0 ${pulseGlow}px ${effect.glowColor})`);
  }

  return filters.length > 0 ? filters.join(" ") : undefined;
};

const buildTextShapePath = (element: CanvasElement, width: number, height: number) => {
  const shape = element.textShape || "straight";
  const inset = Math.min(24, width * 0.06);
  const usableWidth = Math.max(width - inset * 2, 20);
  const baseY = height * 0.58;
  const amountRatio = getTextShapeAmount(element) / 100;
  const amplitude = Math.max(10, amountRatio * height * 0.28);
  const shouldUseCurveArc = shape === "curve-up" || shape === "curve-down";

  if (shouldUseCurveArc) {
    const radius = Math.max(24, Math.min(usableWidth / 2, height * 0.34));
    const centerX = inset + usableWidth / 2;
    const centerY = height / 2;
    const fullCircleThreshold = 0.9995;
    const isFullCircle = amountRatio >= fullCircleThreshold;

    if (isFullCircle) {
      const startY = shape === "curve-up" ? centerY + radius : centerY - radius;
      const verticalDelta = shape === "curve-up" ? -radius * 2 : radius * 2;
      return `M ${centerX} ${startY} a ${radius} ${radius} 0 1 1 0 ${verticalDelta} a ${radius} ${radius} 0 1 1 0 ${-verticalDelta}`;
    }

    const sweepDeg = 110 + amountRatio * 248;
    const centerAngleDeg = shape === "curve-up" ? -90 : 90;
    const startAngleDeg = centerAngleDeg - sweepDeg / 2;
    const endAngleDeg = centerAngleDeg + sweepDeg / 2;
    const startAngleRad = (startAngleDeg * Math.PI) / 180;
    const endAngleRad = (endAngleDeg * Math.PI) / 180;
    const startX = centerX + radius * Math.cos(startAngleRad);
    const startY = centerY + radius * Math.sin(startAngleRad);
    const endX = centerX + radius * Math.cos(endAngleRad);
    const endY = centerY + radius * Math.sin(endAngleRad);
    const largeArcFlag = sweepDeg > 180 ? 1 : 0;

    return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
  }

  switch (shape) {
    case "wave":
      return `M ${inset} ${baseY} C ${inset + usableWidth * 0.18} ${baseY - amplitude}, ${inset + usableWidth * 0.32} ${baseY - amplitude}, ${inset + usableWidth * 0.5} ${baseY} C ${inset + usableWidth * 0.68} ${baseY + amplitude}, ${inset + usableWidth * 0.82} ${baseY + amplitude}, ${width - inset} ${baseY}`;
    case "wedge-left":
      return `M ${inset} ${baseY - amplitude * 0.45} L ${width - inset} ${baseY + amplitude * 0.28}`;
    default:
      return `M ${inset} ${baseY} L ${width - inset} ${baseY}`;
  }
};

const getShapeTextValue = (element: CanvasElement) => {
  const baseText = element.content || "";
  const flattened = baseText.replace(/\r\n/g, "\n").split("\n").join(" ");
  return element.textTransform === "uppercase" ? flattened.toUpperCase() : flattened;
};

const getTextShapePathLength = (element: CanvasElement, width: number, height: number) => {
  const shape = element.textShape || "straight";
  const inset = Math.min(24, width * 0.06);
  const usableWidth = Math.max(width - inset * 2, 20);
  const amountRatio = getTextShapeAmount(element) / 100;
  const amplitude = Math.max(10, amountRatio * height * 0.28);
  const shouldUseCurveArc = shape === "curve-up" || shape === "curve-down";

  if (shouldUseCurveArc) {
    const radius = Math.max(24, Math.min(usableWidth / 2, height * 0.34));
    const fullCircleThreshold = 0.9995;
    const isFullCircle = amountRatio >= fullCircleThreshold;
    const sweepDeg = isFullCircle ? 360 : 110 + amountRatio * 248;
    const sweepRadians = (Math.min(sweepDeg, 360) * Math.PI) / 180;
    const arcLength = radius * sweepRadians;
    const circleBlend = Math.max(0, Math.min(1, (amountRatio - 0.85) / 0.15));
    const displayRatio = 0.94 - circleBlend * 0.22;
    return arcLength * displayRatio;
  }

  switch (shape) {
    case "wave":
      return usableWidth + amplitude * 1.45;
    case "wedge-left":
      return Math.hypot(usableWidth, amplitude * 0.73);
    default:
      return usableWidth;
  }
};

const getFittedTextShapeFontSize = (element: CanvasElement, width: number, height: number, scale: number) => {
  const baseFontSize = (element.fontSize || 24) * scale;
  const text = getShapeTextValue(element).trim();

  if (!text) {
    return baseFontSize;
  }

  const availableLength = getTextShapePathLength(element, width, height);
  const letterSpacing = (element.letterSpacing || 0) * scale;
  const letters = text.replace(/\s/g, "").length;
  const spaces = text.length - letters;
  const gaps = Math.max(0, text.length - 1);
  const estimatedLength =
    letters * baseFontSize * 0.64 +
    spaces * baseFontSize * 0.28 +
    gaps * Math.max(letterSpacing, baseFontSize * 0.04);

  if (estimatedLength <= 0) {
    return baseFontSize;
  }

  const fitScale = Math.min(1, (availableLength * 0.94) / estimatedLength);
  return Math.max(16, baseFontSize * fitScale);
};

const mapAdjustmentToPercent = (value: number | undefined) => {
  const normalized = value ?? 50;
  return clamp(normalized * 2, 0, 200);
};

const getImageSaturationPercent = (element: CanvasElement) => {
  const base = mapAdjustmentToPercent(element.saturation);
  const vibranceDelta = ((element.vibrance ?? 50) - 50) * 1.2;
  return clamp(base + vibranceDelta, 0, 220);
};

const getImageFilterString = (element: CanvasElement) => {
  const filters = [
    `brightness(${mapAdjustmentToPercent(element.brightness)}%)`,
    `contrast(${mapAdjustmentToPercent(element.contrast)}%)`,
    `saturate(${getImageSaturationPercent(element)}%)`,
  ];

  if ((element.blur ?? 0) > 0) {
    filters.push(`blur(${element.blur}px)`);
  }

  if ((element.hueRotate ?? 0) !== 0) {
    filters.push(`hue-rotate(${element.hueRotate}deg)`);
  }

  if (element.blackAndWhite) {
    filters.push("grayscale(100%)");
  }

  if (element.sepiaEnabled) {
    filters.push("sepia(100%)");
  }

  if ((element.invert ?? 0) > 0) {
    filters.push(`invert(${clamp(element.invert ?? 0, 0, 100)}%)`);
  }

  if (element.removeColorEnabled) {
    filters.push("grayscale(35%)");
    filters.push("opacity(94%)");
  }

  if (element.tintEnabled) {
    filters.push("sepia(16%)");
    filters.push("hue-rotate(-12deg)");
  }

  if (element.gammaEnabled) {
    filters.push("contrast(96%)");
    filters.push("brightness(102%)");
  }

  return filters.join(" ");
};

const getImageClipPath = (element: CanvasElement) => {
  if (element.maskShape === "triangle") {
    return "polygon(50% 0%, 100% 100%, 0% 100%)";
  }

  if (element.maskShape === "star") {
    return "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";
  }

  if (element.maskShape === "heart") {
    return "path('M 50 92 C 15 70 0 48 0 28 C 0 10 14 0 28 0 C 40 0 48 8 50 16 C 52 8 60 0 72 0 C 86 0 100 10 100 28 C 100 48 85 70 50 92 Z')";
  }

  return undefined;
};

const getImageBorderRadius = (element: CanvasElement, scale: number) => {
  if (element.maskShape === "circle") {
    return "999px";
  }

  if (element.roundnessEnabled) {
    return `${Math.max(12, (element.borderRadius || 32) * scale)}px`;
  }

  if (element.maskShape === "rounded") {
    return `${Math.max(18, (element.borderRadius || 28) * scale)}px`;
  }

  return `${(element.borderRadius || 0) * scale}px`;
};

const getMaskPositionValue = (value: number | undefined) => clamp(value ?? 50, 0, 100);

const getMaskScaleValue = (
  element: CanvasElement,
  mode: ReturnType<typeof getActiveImageMaskMode>,
) => {
  const defaultScale = mode === "shape" ? 42 : 100;
  return clamp(element.maskScale ?? defaultScale, 12, 160);
};

const getActiveImageMaskMode = (element: CanvasElement) => {
  if (element.maskMode === "text" && element.maskText?.trim()) {
    return "text" as const;
  }

  if (element.maskMode === "freehand" && (element.maskFreehandPoints?.length ?? 0) >= 3) {
    return "freehand" as const;
  }

  if (element.maskShape && element.maskShape !== "none") {
    return "shape" as const;
  }

  return "none" as const;
};

const joinCssFilters = (...filters: Array<string | undefined>) => {
  const value = filters.filter((filter) => typeof filter === "string" && filter.trim().length > 0).join(" ");
  return value || "none";
};

const buildMaskDataUrl = (svgMarkup: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;

const buildShapeMaskImage = (element: CanvasElement) => {
  if (!element.maskShape || element.maskShape === "none") {
    return undefined;
  }

  let shapeMarkup = "";

  if (element.maskShape === "circle") {
    shapeMarkup = '<circle cx="50" cy="50" r="50" fill="white" />';
  } else if (element.maskShape === "rounded") {
    shapeMarkup = '<rect x="0" y="0" width="100" height="100" rx="18" ry="18" fill="white" />';
  } else if (element.maskShape === "triangle") {
    shapeMarkup = '<polygon points="50,0 100,100 0,100" fill="white" />';
  } else if (element.maskShape === "star") {
    shapeMarkup = '<polygon points="50,0 61,35 98,35 68,57 79,91 50,70 21,91 32,57 2,35 39,35" fill="white" />';
  } else if (element.maskShape === "heart") {
    shapeMarkup = '<path d="M 50 92 C 15 70 0 48 0 28 C 0 10 14 0 28 0 C 40 0 48 8 50 16 C 52 8 60 0 72 0 C 86 0 100 10 100 28 C 100 48 85 70 50 92 Z" fill="white" />';
  } else if (element.maskShape === "half-circle") {
    shapeMarkup = '<path d="M 0 50 L 100 50 A 50 50 0 0 1 0 50 Z" fill="white" />';
  } else if (element.maskShape === "oval") {
    shapeMarkup = '<ellipse cx="50" cy="50" rx="50" ry="35" fill="white" />';
  } else if (element.maskShape === "right-triangle") {
    shapeMarkup = '<polygon points="0,0 100,100 0,100" fill="white" />';
  } else if (element.maskShape === "parallelogram") {
    shapeMarkup = '<polygon points="25,0 100,0 75,100 0,100" fill="white" />';
  } else if (element.maskShape === "hexagon") {
    shapeMarkup = '<polygon points="25,0 75,0 100,50 75,100 25,100 0,50" fill="white" />';
  }

  if (!shapeMarkup) {
    return undefined;
  }

  return buildMaskDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect width="100%" height="100%" fill="black" />
      ${shapeMarkup}
    </svg>
  `.trim());
};

const escapeSvgText = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildFreehandMaskPath = (
  points: Array<{ x: number; y: number }>,
  jointMode: CanvasElement["maskJointMode"] = "curved",
) => {
  if (points.length < 3) {
    return "";
  }

  if (jointMode === "straight") {
    return `${points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")} Z`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index % points.length];
    const next = points[(index + 1) % points.length];
    const midpointX = (current.x + next.x) / 2;
    const midpointY = (current.y + next.y) / 2;
    path += ` Q ${current.x} ${current.y} ${midpointX} ${midpointY}`;
  }

  return `${path} Z`;
};

const buildTextMaskImage = (
  element: CanvasElement,
  width: number,
  height: number,
  scale: number,
) => {
  const text = (element.maskText || "").trim();
  if (!text) {
    return undefined;
  }

  const align = element.maskTextAlign ?? "center";
  const x = align === "left" ? width * 0.08 : align === "right" ? width * 0.92 : width * 0.5;
  const textAnchor = align === "left" ? "start" : align === "right" ? "end" : "middle";
  const fontSize = clamp((element.maskTextFontSize ?? 110) * scale, 18, Math.max(18, height * 0.58));
  const fontWeight = element.maskTextFontWeight ?? "700";
  const fontStyle = element.maskTextFontStyle ?? "normal";
  const textDecoration = element.maskTextDecoration && element.maskTextDecoration !== "none"
    ? element.maskTextDecoration
    : undefined;
  const letterSpacing = (element.maskTextLetterSpacing ?? 0) * scale;

  const svgMarkup = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="black" />
      <text
        x="${x}"
        y="${height * 0.55}"
        fill="white"
        text-anchor="${textAnchor}"
        dominant-baseline="middle"
        font-family="${escapeSvgText(element.maskTextFontFamily || "Archivo Black")}" 
        font-size="${fontSize}"
        font-weight="${fontWeight}"
        font-style="${fontStyle}"
        letter-spacing="${letterSpacing}"
        ${textDecoration ? `text-decoration="${textDecoration}"` : ""}
      >${escapeSvgText(text.replace(/\r?\n/g, " "))}</text>
    </svg>
  `.trim();

  return buildMaskDataUrl(svgMarkup);
};

const buildFreehandMaskImage = (element: CanvasElement) => {
  if ((element.maskFreehandPoints?.length ?? 0) < 3) {
    return undefined;
  }

  const path = buildFreehandMaskPath(element.maskFreehandPoints ?? [], element.maskJointMode);
  if (!path) {
    return undefined;
  }

  const svgMarkup = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect width="100%" height="100%" fill="black" />
      <path d="${path}" fill="white" />
    </svg>
  `.trim();

  return buildMaskDataUrl(svgMarkup);
};

const getImageMaskStyles = (
  element: CanvasElement,
  width: number,
  height: number,
  scale: number,
): React.CSSProperties => {
  const mode = getActiveImageMaskMode(element);

  const maskImage =
    mode === "shape"
      ? buildShapeMaskImage(element)
      : mode === "text"
      ? buildTextMaskImage(element, width, height, scale)
      : mode === "freehand"
      ? buildFreehandMaskImage(element)
      : undefined;

  if (!maskImage) {
    return {};
  }

  const maskPosition = `${getMaskPositionValue(element.maskPositionX)}% ${getMaskPositionValue(element.maskPositionY)}%`;
  const maskScale = `${getMaskScaleValue(element, mode)}% ${getMaskScaleValue(element, mode)}%`;

  return {
    WebkitMaskImage: `url("${maskImage}")`,
    maskImage: `url("${maskImage}")`,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: maskPosition,
    maskPosition,
    WebkitMaskSize: maskScale,
    maskSize: maskScale,
  };
};

const getEffectBuffer = (element: CanvasElement, isMobile: boolean) => {
  const effect = element.effectProps;
  if (!effect) return 12;

  const factor = getMobileIntensityScale(isMobile);
  return Math.ceil(
    Math.max(
      12,
      effect.glowIntensity * factor * 2.2,
      effect.shadowBlur * factor + Math.abs(effect.shadowOffsetX) + Math.abs(effect.shadowOffsetY) + 10,
      effect.glassBlur * factor + 16,
      effect.strokeWidth * factor + 8,
    ),
  );
};

const hexToRgba = (hex: string, alpha: number) => {
  const safeHex = hex.replace("#", "");
  if (safeHex.length !== 6) return `rgba(15, 23, 42, ${alpha})`;

  const red = Number.parseInt(safeHex.slice(0, 2), 16);
  const green = Number.parseInt(safeHex.slice(2, 4), 16);
  const blue = Number.parseInt(safeHex.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${clamp(alpha, 0, 1)})`;
};

const buildTextShadow = (
  element: CanvasElement,
  pulseProgress: number,
  isMobile: boolean,
) => {
  const effect = element.effectProps;
  if (!effect || element.type !== "text") return undefined;

  const factor = getMobileIntensityScale(isMobile);
  const shadows: string[] = [];

  if (effect.preset === "neon-glow") {
    const glow = Math.max(4, effect.glowIntensity * factor);
    shadows.push(`0 0 ${glow}px ${effect.glowColor}`);
    shadows.push(`0 0 ${glow * 0.55}px ${effect.glowColor}`);
  }

  const hasShadow =
    effect.preset === "drop-shadow" ||
    effect.shadowBlur > 0 ||
    Math.abs(effect.shadowOffsetX) > 0 ||
    Math.abs(effect.shadowOffsetY) > 0 ||
    effect.shadowOpacity > 0;

  if (hasShadow) {
    const blur = Math.max(0, effect.shadowBlur * factor);
    const color = hexToRgba(effect.shadowColor, effect.shadowOpacity);
    shadows.push(
      `${effect.shadowOffsetX * factor}px ${effect.shadowOffsetY * factor}px ${blur}px ${color}`,
    );
  }

  if (effect.preset === "pulse") {
    const pulseGlow = Math.max(4, effect.glowIntensity * factor * (0.75 + pulseProgress * 0.55));
    shadows.push(`0 0 ${pulseGlow}px ${effect.glowColor}`);
  }

  return shadows.length > 0 ? shadows.join(", ") : undefined;
};

const buildFilter = (
  element: CanvasElement,
  pulseProgress: number,
  isMobile: boolean,
) => {
  const effect = element.effectProps;
  if (!effect) return "none";

  if (element.type === "text") {
    return "none";
  }

  const factor = getMobileIntensityScale(isMobile);
  const filters: string[] = [];

  if (effect.preset === "neon-glow") {
    const glow = Math.max(4, effect.glowIntensity * factor);
    filters.push(`drop-shadow(0 0 ${glow}px ${effect.glowColor})`);
    filters.push(`drop-shadow(0 0 ${glow * 0.55}px ${effect.glowColor})`);
  }

  if (effect.preset === "drop-shadow" || effect.shadowBlur > 0) {
    const blur = Math.max(2, effect.shadowBlur * factor);
    const color = hexToRgba(effect.shadowColor, effect.shadowOpacity);
    filters.push(
      `drop-shadow(${effect.shadowOffsetX * factor}px ${effect.shadowOffsetY * factor}px ${blur}px ${color})`,
    );
  }

  if (effect.preset === "pulse") {
    const pulseGlow = Math.max(4, effect.glowIntensity * factor * (0.75 + pulseProgress * 0.55));
    filters.push(`drop-shadow(0 0 ${pulseGlow}px ${effect.glowColor})`);
  }

  return filters.length > 0 ? filters.join(" ") : "none";
};

export const LayerEffectOverlay: React.FC<LayerEffectOverlayProps> = ({
  elements,
  scale,
  editingLayerId,
  hiddenElementIds = [],
  pulseProgress,
  isMobile,
}) => {
  const hiddenIds = new Set(hiddenElementIds);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10"
      style={{
        overflow: "hidden",
        clipPath: "inset(0)",
      }}
    >
      {elements
        .filter((element) => element.visible !== false)
        .filter((element) => element.id !== editingLayerId)
        .filter((element) => !hiddenIds.has(element.id))
        .filter(shouldUseDomEffectOverlay)
        .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
        .map((element) => {
          const motion = getMotionState(element);
          const effect = element.effectProps ?? {
            preset: "none",
            blendMode: "normal",
            glowColor: "#60a5fa",
            glowIntensity: 18,
            shadowColor: "#0f172a",
            shadowBlur: 0,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            shadowOpacity: 0.35,
            strokeColor: "#ffffff",
            strokeWidth: 0,
            glassBlur: 12,
            glassOpacity: 0.18,
            pulseSpeed: 1,
          };
          const buffer = getEffectBuffer(element, isMobile);
          const baseWidth = element.width * scale;
          const baseHeight = element.height * scale;
          const pulseScale = effect.preset === "pulse" ? 1 + pulseProgress * 0.08 : 1;
          const transformScale = (element.scale ?? 1) * motion.scale * pulseScale;
          const opacity = clamp(((element.opacity ?? 100) / 100) * motion.opacity, 0, 1);
          const translateX = (element.x + motion.x - buffer) * scale;
          const translateY = (element.y + motion.y - buffer) * scale;
          const paddedWidth = baseWidth + buffer * 2 * scale;
          const paddedHeight = baseHeight + buffer * 2 * scale;
          const backdropBlur = effect.preset === "glassmorphism"
            ? `${Math.max(6, effect.glassBlur * getMobileIntensityScale(isMobile))}px`
            : undefined;

          return (
            <div
              key={element.id}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: paddedWidth,
                height: paddedHeight,
                transform: `translate3d(${translateX}px, ${translateY}px, 0) rotate(${(element.rotation || 0) + motion.rotation}deg) scale(${transformScale})`,
                transformOrigin: "top left",
                willChange: "transform, filter",
                filter: buildFilter(element, pulseProgress, isMobile),
                opacity,
                padding: buffer * scale,
                boxSizing: "border-box",
                mixBlendMode: element.type === "image" ? effect.blendMode : "normal",
                backdropFilter: backdropBlur,
                WebkitBackdropFilter: backdropBlur,
                borderRadius: effect.preset === "glassmorphism" ? `${Math.max(12, (element.borderRadius || 16) * scale)}px` : undefined,
                background:
                  effect.preset === "glassmorphism"
                    ? `rgba(255, 255, 255, ${clamp(effect.glassOpacity, 0.08, 0.45)})`
                    : undefined,
                border:
                  effect.preset === "glassmorphism"
                    ? "1px solid rgba(255,255,255,0.24)"
                    : undefined,
                overflow: "visible",
                contain: "layout style",
              }}
            >
              {element.type === "text" ? (
                <div
                  style={{
                    width: baseWidth,
                    minHeight: baseHeight,
                    display: "flex",
                    alignItems: getVerticalAlignment(element.textVerticalAlign),
                    background: element.textBackgroundColor || "transparent",
                    color: element.color || "#000000",
                    fontSize: `${(element.fontSize || 24) * scale}px`,
                    fontFamily: element.fontFamily || "sans-serif",
                    fontWeight: element.fontWeight || "normal",
                    fontStyle: getTextFontStyle(element),
                    lineHeight: String(element.lineHeight || 1.2),
                    letterSpacing: `${(element.letterSpacing || 0) * scale}px`,
                    textAlign: element.textAlign || "left",
                    textTransform: element.textTransform || "none",
                    textDecoration:
                      element.textDecoration && element.textDecoration !== "none"
                        ? element.textDecoration
                        : undefined,
                    textShadow: buildTextShadow(element, pulseProgress, isMobile),
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    paintOrder: "stroke fill",
                    textRendering: "optimizeLegibility",
                    WebkitFontSmoothing: "antialiased",
                    MozOsxFontSmoothing: "grayscale",
                    WebkitTextStroke:
                      effect.strokeWidth > 0
                        ? `${effect.strokeWidth * getMobileIntensityScale(isMobile)}px ${effect.strokeColor}`
                        : undefined,
                    transform: "translateZ(0)",
                    willChange: "transform, filter",
                    overflow: "visible",
                  }}
                >
                  {isTextListEnabled(element) ? (
                    <div
                      style={{
                        width: "100%",
                        minHeight: baseHeight,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: getTextAlignment(element.textAlign),
                        gap: 0,
                      }}
                    >
                      {getTextListItems(element).map((item, index) => {
                        const isOutside = (element.listPosition || "outside") === "outside";

                        return (
                          <div
                            key={`${element.id}-list-item-${index}`}
                            style={
                              isOutside
                                ? {
                                    display: "grid",
                                    gridTemplateColumns: `${getListMarkerColumnWidth(element)} minmax(0, 1fr)`,
                                    columnGap: `${0.45 * scale}em`,
                                    alignItems: "start",
                                    width: "100%",
                                  }
                                : {
                                    display: "block",
                                    width: "100%",
                                  }
                            }
                          >
                            {isOutside ? (
                              <span
                                style={{
                                  color: getListMarkerColor(element),
                                  display: "inline-block",
                                  textAlign: "right",
                                  whiteSpace: "nowrap",
                                  paddingRight: `${0.2 * scale}em`,
                                }}
                              >
                                {item.marker}
                              </span>
                            ) : null}
                            <span
                              style={{
                                display: "block",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                textAlign: element.textAlign || "left",
                              }}
                            >
                              {!isOutside ? (
                                <span style={{ color: getListMarkerColor(element) }}>{`${item.marker} `}</span>
                              ) : null}
                              {item.content || "\u00a0"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : element.textShape && element.textShape !== "straight" ? (
                    <svg
                      width={baseWidth}
                      height={baseHeight}
                      viewBox={`0 0 ${baseWidth} ${baseHeight}`}
                      style={{ overflow: "hidden" }}
                    >
                      {getTextGradientColors(element).length > 1 ? (
                        <defs>
                          <linearGradient id={`text-gradient-${element.id}`} x1="0%" y1="50%" x2="100%" y2="50%">
                            {getTextGradientColors(element).map((color, index, colors) => (
                              <stop
                                key={`${color}-${index}`}
                                offset={`${colors.length === 1 ? 0 : (index / (colors.length - 1)) * 100}%`}
                                stopColor={color}
                              />
                            ))}
                          </linearGradient>
                        </defs>
                      ) : null}
                      <path id={`text-shape-${element.id}`} d={buildTextShapePath(element, baseWidth, baseHeight)} fill="none" />
                      <text
                        fontSize={getFittedTextShapeFontSize(element, baseWidth, baseHeight, scale)}
                        fontFamily={element.fontFamily || "sans-serif"}
                        fontWeight={element.fontWeight || "normal"}
                        fontStyle={getTextFontStyle(element)}
                        letterSpacing={(element.letterSpacing || 0) * scale}
                        fill={getTextGradientColors(element).length > 1 ? `url(#text-gradient-${element.id})` : element.color || "#000000"}
                        stroke={(effect.strokeWidth ?? 0) > 0 ? effect.strokeColor : undefined}
                        strokeWidth={(effect.strokeWidth ?? 0) * getMobileIntensityScale(isMobile)}
                        paintOrder="stroke fill"
                        style={{ filter: buildTextEffectFilter(element, pulseProgress, isMobile) }}
                      >
                        <textPath
                          href={`#text-shape-${element.id}`}
                          startOffset="50%"
                          textAnchor="middle"
                          textLength={getTextShapePathLength(element, baseWidth, baseHeight)}
                          lengthAdjust="spacingAndGlyphs"
                        >
                          {getShapeTextValue(element) || " "}
                        </textPath>
                      </text>
                    </svg>
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        minHeight: baseHeight,
                        display: "block",
                        color: getTextGradientColors(element).length > 1 ? "transparent" : undefined,
                        backgroundImage: getTextGradientBackground(element),
                        backgroundSize: getTextGradientColors(element).length > 1 ? "100% 100%" : undefined,
                        backgroundRepeat: getTextGradientColors(element).length > 1 ? "no-repeat" : undefined,
                        WebkitBackgroundClip: getTextGradientColors(element).length > 1 ? "text" : undefined,
                        backgroundClip: getTextGradientColors(element).length > 1 ? "text" : undefined,
                        WebkitTextFillColor: getTextGradientColors(element).length > 1 ? "transparent" : undefined,
                      }}
                    >
                      {element.content || ""}
                    </div>
                  )}
                </div>
              ) : element.type === "image" && element.src ? (
                (() => {
                  const activeMaskMode = getActiveImageMaskMode(element);
                  const maskStyles = getImageMaskStyles(element, baseWidth, baseHeight, scale);
                  const imageFilter = getImageFilterString(element);
                  const baseImageFilter = joinCssFilters(
                    imageFilter,
                    activeMaskMode !== "none" && element.maskColorPop && !element.maskInvert
                      ? "grayscale(100%)"
                      : undefined,
                  );
                  const maskedImageFilter = joinCssFilters(
                    imageFilter,
                    activeMaskMode !== "none" && element.maskColorPop && element.maskInvert
                      ? "grayscale(100%)"
                      : undefined,
                  );
                  const sharedImageStyle: React.CSSProperties = {
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                    transform: "translateZ(0)",
                    willChange: "transform, filter",
                    userSelect: "none",
                    WebkitUserDrag: "none",
                  };

                  return (
                    <div
                      style={{
                        position: "relative",
                        width: baseWidth,
                        height: baseHeight,
                        overflow: "hidden",
                        borderRadius: activeMaskMode === "none" ? getImageBorderRadius(element, scale) : undefined,
                        border:
                          activeMaskMode === "none" && (element.borderWidth ?? 0) > 0
                            ? `${(element.borderWidth ?? 0) * scale}px solid ${element.borderColor || "#ffffff"}`
                            : undefined,
                        boxSizing: "border-box",
                        background: "transparent",
                        mixBlendMode: effect.blendMode,
                      }}
                    >
                      {activeMaskMode !== "none" && element.maskColorPop ? (
                        <img
                          src={element.src}
                          alt=""
                          draggable={false}
                          style={{
                            ...sharedImageStyle,
                            filter: baseImageFilter,
                          }}
                        />
                      ) : null}
                      <div
                        style={{
                          position: activeMaskMode === "none" ? "relative" : "absolute",
                          inset: 0,
                          overflow: "hidden",
                          ...maskStyles,
                          border:
                            activeMaskMode === "shape" && (element.borderWidth ?? 0) > 0
                              ? `${(element.borderWidth ?? 0) * scale}px solid ${element.borderColor || "#ffffff"}`
                              : undefined,
                          boxSizing: "border-box",
                        }}
                      >
                        <img
                          src={element.src}
                          alt=""
                          draggable={false}
                          style={{
                            ...sharedImageStyle,
                            borderRadius: activeMaskMode === "none" ? getImageBorderRadius(element, scale) : undefined,
                            filter: activeMaskMode === "none" ? imageFilter : maskedImageFilter,
                          }}
                        />
                      </div>
                    </div>
                  );
                })()
              ) : null}
            </div>
          );
        })}
    </div>
  );
};
