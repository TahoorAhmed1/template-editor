import React, { useCallback } from "react";
import { TopBar } from "./TopBar";
import { Toolbar } from "./Toolbar";
import { CanvasStage } from "./CanvasStageKonva";
import { Inspector } from "./Inspector";
import { TimelineBar } from "./TimelineBar";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileBottomDock } from "./MobileBottomDock";
import { LayersPanel } from "./LayersPanel";
import { MobileLayerSheet, type MobileLayerSheetSection } from "./MobileLayerSheet";
import { useTextEditStore } from "@/stores/useTextEditStore";
import type { TemplateApplyPayload } from "./templateTypes";
import { CanvasDesignManager } from "./CanvasDesignManager";
import {
  createCanvasDesign,
  deleteCanvasDesign,
  listCanvasDesigns,
  renameCanvasDesign,
  updateCanvasDesign,
  type CanvasDesignRecord,
  type CanvasDesignSnapshot,
} from "@/services/canvasDesigns";
import { toast } from "@/components/ui/sonner";

export type ToolType =
  | "uploads"
  | "templates"
  | "media"
  | "text"
  | "ai"
  | "background"
  | "layout"
  | "record"
  | "draw"
  | "slideshow"
  | "qrcode"
  | "table";

export type ActiveTool = ToolType | "select";
export type DrawToolKind = "eraser" | "pencil" | "circle" | "spray";

export interface DrawSettings {
  tool: DrawToolKind;
  color: string;
  brushSize: number;
}

type RecordCaptureMode = "photo" | "video" | "audio";

type EditorToolActionDetail = {
  tool: string;
  action: string;
  payload?: Record<string, unknown>;
};

export type EditorMode = "image" | "video";

export interface CanvasSizePreset {
  label: string;
  width: number;
  height: number;
  description?: string;
}

export interface LayerAnimationState {
  opacity: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface LayerAnimationProps {
  activePhase: "start" | "end";
  start: LayerAnimationState;
  end: LayerAnimationState;
}

export type BlendModeOption =
  | "normal"
  | "screen"
  | "multiply"
  | "overlay";

export type LayerEffectPreset =
  | "none"
  | "neon-glow"
  | "drop-shadow"
  | "glassmorphism"
  | "pulse";

export interface LayerEffectProps {
  preset: LayerEffectPreset;
  glowColor: string;
  glowIntensity: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowOpacity: number;
  glassBlur: number;
  glassOpacity: number;
  strokeColor: string;
  strokeWidth: number;
  blendMode: BlendModeOption;
  pulseSpeed: number;
}

export interface CanvasElement {
  id: string;
  role?: "design-title";
  type: "text" | "image" | "shape" | "video" | "table";
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  src?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: "normal" | "italic";
  color?: string;
  backgroundColor?: string;
  textBackgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  preserveAspectRatio?: boolean;
  rotation?: number;
  scale?: number;
  locked?: boolean;
  opacity?: number;
  visible?: boolean;
  zIndex?: number;
  animationProps?: LayerAnimationProps;
  effectProps?: LayerEffectProps;
  textAlign?: "left" | "center" | "right" | "justify";
  textVerticalAlign?: "top" | "middle" | "bottom";
  textDecoration?: "none" | "underline";
  textTransform?: "none" | "uppercase";
  linkUrl?: string;
  listStyle?: "none" | "bulleted" | "numbered";
  listPosition?: "outside" | "inside";
  lineHeight?: number;
  letterSpacing?: number;
  shapeType?: "rectangle" | "circle" | "triangle" | "line";
  duration?: number;
  startTime?: number;
  brightness?: number;
  contrast?: number;
  vibrance?: number;
  saturation?: number;
  hueRotate?: number;
  blur?: number;
  invert?: number;
  blackAndWhite?: boolean;
  sepiaEnabled?: boolean;
  removeColorEnabled?: boolean;
  tintEnabled?: boolean;
  gammaEnabled?: boolean;
  roundnessEnabled?: boolean;
  maskShape?: "none" | "circle" | "rounded" | "triangle" | "star" | "heart";
  animation?: {
    type: "bounce" | "slide" | "fade" | "scale" | "rotate";
    duration: number;
    delay: number;
    direction: "in" | "out";
  };
  rows?: number;
  cols?: number;
  tableData?: string[][];
  cellStyles?: { [key: string]: { backgroundColor?: string; color?: string; fontWeight?: string } };
}

interface HistoryEntry {
  elements: CanvasElement[];
  canvasBackground: string;
}

let nextId = 1;
const generateId = () => String(nextId++);
const TITLE_ELEMENT_ROLE = "design-title" as const;

const createDesignTitleElement = (
  title: string,
  size: CanvasSizePreset,
): CanvasElement => {
  const width = Math.min(Math.max(size.width - 96, 240), 720);
  return {
    id: generateId(),
    role: TITLE_ELEMENT_ROLE,
    type: "text",
    x: Math.max(24, Math.round((size.width - width) / 2)),
    y: Math.max(28, Math.round(size.height * 0.1)),
    width,
    height: 88,
    content: title,
    scale: 1,
    zIndex: 1,
    visible: true,
    fontSize: Math.max(32, Math.round(Math.min(size.width, size.height) * 0.075)),
    fontFamily: "'Georgia', serif",
    fontWeight: "700",
    fontStyle: "normal",
    color: "#123a63",
    textAlign: "center",
    textVerticalAlign: "middle",
    textDecoration: "none",
    textTransform: "none",
    lineHeight: 1.05,
    animationProps: {
      activePhase: "end",
      start: { opacity: 0, x: 0, y: 20, scale: 1, rotation: 0 },
      end: { opacity: 1, x: 0, y: 0, scale: 1, rotation: 0 },
    },
  };
};

const createDefaultAnimationProps = (): LayerAnimationProps => ({
  activePhase: "end",
  start: { opacity: 0, x: 0, y: 20, scale: 1, rotation: 0 },
  end: { opacity: 1, x: 0, y: 0, scale: 1, rotation: 0 },
});

const createDefaultEffectProps = (): LayerEffectProps => ({
  preset: "none",
  glowColor: "#7650e3",
  glowIntensity: 18,
  shadowColor: "#0f172a",
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  shadowOpacity: 0,
  glassBlur: 18,
  glassOpacity: 0.18,
  strokeColor: "#ffffff",
  strokeWidth: 0,
  blendMode: "normal",
  pulseSpeed: 1,
});

const normalizeLayer = (
  layer: CanvasElement,
  fallbackZIndex: number,
): CanvasElement => ({
  ...layer,
  scale: layer.scale ?? 1,
  locked: layer.locked ?? false,
  opacity: layer.opacity ?? 100,
  visible: layer.visible ?? true,
  zIndex: layer.zIndex ?? fallbackZIndex,
  animationProps: {
    ...createDefaultAnimationProps(),
    ...layer.animationProps,
    start: {
      ...createDefaultAnimationProps().start,
      ...(layer.animationProps?.start ?? {}),
    },
    end: {
      ...createDefaultAnimationProps().end,
      ...(layer.animationProps?.end ?? {}),
    },
  },
  effectProps: {
    ...createDefaultEffectProps(),
    ...(layer.effectProps ?? {}),
  },
});

const LOCKED_POSITION_KEYS: Array<keyof CanvasElement> = [
  "x",
  "y",
  "width",
  "height",
  "rotation",
  "scale",
  "zIndex",
];

const stripLockedPositionUpdates = (
  currentElement: CanvasElement,
  updates: Partial<CanvasElement>,
): Partial<CanvasElement> => {
  if (!currentElement.locked) {
    return updates;
  }

  const sanitizedUpdates = { ...updates };
  LOCKED_POSITION_KEYS.forEach((key) => {
    delete sanitizedUpdates[key];
  });

  return sanitizedUpdates;
};

const reindexLayers = (layers: CanvasElement[]) =>
  layers.map((layer, index) => ({
    ...layer,
    zIndex: index + 1,
  }));

const getGreatestCommonDivisor = (left: number, right: number): number => {
  const safeLeft = Math.abs(Math.round(left));
  const safeRight = Math.abs(Math.round(right));

  if (!safeRight) {
    return safeLeft || 1;
  }

  return getGreatestCommonDivisor(safeRight, safeLeft % safeRight);
};

const getCanvasSizeKey = (size: Pick<CanvasSizePreset, "width" | "height">) =>
  `${size.width}x${size.height}`;

const getCanvasRatioLabel = (size: Pick<CanvasSizePreset, "width" | "height">) => {
  const divisor = getGreatestCommonDivisor(size.width, size.height);
  return `${Math.round(size.width / divisor)}:${Math.round(size.height / divisor)}`;
};

const getCanvasOrientationLabel = (size: Pick<CanvasSizePreset, "width" | "height">) => {
  if (size.width === size.height) {
    return "Square";
  }

  return size.width > size.height ? "Landscape" : "Portrait";
};

const getAutoDesignName = (size: CanvasSizePreset) => {
  const normalizedLabel = size.label?.trim() || "Custom";
  const ratio = getCanvasRatioLabel(size);
  const orientation = getCanvasOrientationLabel(size);
  const sizeLabel = `${size.width}x${size.height}`;

  if (normalizedLabel.toLowerCase() === "custom") {
    return `${orientation} ${ratio} ${sizeLabel}`;
  }

  return `${normalizedLabel} ${ratio} ${sizeLabel}`;
};

const INSERTION_MARGIN = 24;
const INSERTION_OFFSET_STEP = 28;
const INSERTION_SEARCH_LIMIT = 36;

type LayerBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const clampInsertionCoordinate = (
  value: number,
  layerSize: number,
  canvasSize: number,
) => {
  const maxCoordinate = Math.max(INSERTION_MARGIN, canvasSize - layerSize - INSERTION_MARGIN);
  return Math.min(maxCoordinate, Math.max(INSERTION_MARGIN, Math.round(value)));
};

const clampValue = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const clampLayerToCanvas = (
  layer: CanvasElement,
  canvasSize: Pick<CanvasSizePreset, "width" | "height">,
): CanvasElement => {
  const width = clampValue(Math.round(layer.width), 1, Math.max(1, canvasSize.width));
  const height = clampValue(Math.round(layer.height), 1, Math.max(1, canvasSize.height));

  return {
    ...layer,
    width,
    height,
    x: clampValue(Math.round(layer.x), 0, Math.max(0, canvasSize.width - width)),
    y: clampValue(Math.round(layer.y), 0, Math.max(0, canvasSize.height - height)),
  };
};

const getOptionalNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const getNumberOr = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const getOptionalString = (value: unknown) =>
  typeof value === "string" ? value : undefined;

const getTemplateOpacity = (value: unknown) => {
  const numericValue = getOptionalNumber(value);
  if (numericValue == null) {
    return undefined;
  }

  return numericValue <= 1 ? Math.round(numericValue * 100) : numericValue;
};

const scaleTemplateValue = (value: number, ratio: number) =>
  Math.round(value * ratio * 100) / 100;

const getTemplateOriginMode = (value: unknown): "start" | "center" | "end" | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalizedValue = value.trim().toLowerCase();
  if (["left", "top", "start"].includes(normalizedValue)) {
    return "start";
  }

  if (["center", "middle"].includes(normalizedValue)) {
    return "center";
  }

  if (["right", "bottom", "end"].includes(normalizedValue)) {
    return "end";
  }

  return undefined;
};

const getTemplateCanvasSize = (
  canvasDimensions: unknown,
  rawElements: unknown,
  fallbackCanvasSize: Pick<CanvasSizePreset, "width" | "height">,
) => {
  if (!canvasDimensions || typeof canvasDimensions !== "object") {
    return inferCanvasSizeFromRawElements(rawElements, fallbackCanvasSize);
  }

  const width = getOptionalNumber((canvasDimensions as Record<string, unknown>).width);
  const height = getOptionalNumber((canvasDimensions as Record<string, unknown>).height);

  return {
    width: width && width > 0 ? width : inferCanvasSizeFromRawElements(rawElements, fallbackCanvasSize).width,
    height: height && height > 0 ? height : inferCanvasSizeFromRawElements(rawElements, fallbackCanvasSize).height,
  };
};

const inferCanvasSizeFromRawElements = (
  rawElements: unknown,
  fallbackCanvasSize: Pick<CanvasSizePreset, "width" | "height">,
) => {
  if (!Array.isArray(rawElements) || rawElements.length === 0) {
    return fallbackCanvasSize;
  }

  let maxRight = 0;
  let maxBottom = 0;
  let hasMeasuredElement = false;

  rawElements.forEach((element) => {
    if (!element || typeof element !== "object") {
      return;
    }

    const candidate = element as Record<string, unknown>;
    const x = getNumberOr(candidate.x, 0);
    const y = getNumberOr(candidate.y, 0);
    const width = Math.max(1, getNumberOr(candidate.width, 0));
    const height = Math.max(1, getNumberOr(candidate.height, 0));

    maxRight = Math.max(maxRight, x + width);
    maxBottom = Math.max(maxBottom, y + height);
    hasMeasuredElement = true;
  });

  if (!hasMeasuredElement) {
    return fallbackCanvasSize;
  }

  return {
    width: Math.max(1, Math.round(maxRight)),
    height: Math.max(1, Math.round(maxBottom)),
  };
};

const normalizeTemplateAxis = (
  position: number,
  layerSize: number,
  sourceCanvasSize: number,
  scaleRatio: number,
  origin: "start" | "center" | "end" | undefined,
  preferCenteredCoordinates: boolean,
) => {
  const centeredPosition = position - layerSize / 2;
  const endAlignedPosition = position - layerSize;

  if (origin === "center") {
    return scaleTemplateValue(centeredPosition, scaleRatio);
  }

  if (origin === "end") {
    return scaleTemplateValue(endAlignedPosition, scaleRatio);
  }

  if (origin === "start") {
    return scaleTemplateValue(position, scaleRatio);
  }

  const overflowMargin = Math.max(24, sourceCanvasSize * 0.05);
  const fitsWithinCanvas = (candidate: number) =>
    candidate >= -overflowMargin && candidate + layerSize <= sourceCanvasSize + overflowMargin;
  const topLeftFits = fitsWithinCanvas(position);
  const centeredFits = fitsWithinCanvas(centeredPosition);

  if (preferCenteredCoordinates && centeredFits) {
    return scaleTemplateValue(centeredPosition, scaleRatio);
  }

  if (!topLeftFits && centeredFits) {
    return scaleTemplateValue(centeredPosition, scaleRatio);
  }

  return scaleTemplateValue(position, scaleRatio);
};

const normalizeTemplateElement = (
  rawElement: Record<string, unknown>,
  lockedIds: Set<string>,
  index: number,
  sourceCanvasSize: Pick<CanvasSizePreset, "width" | "height">,
  targetCanvasSize: Pick<CanvasSizePreset, "width" | "height">,
): CanvasElement | null => {
  const id = getOptionalString(rawElement.id) ?? `template-${index + 1}`;
  const rawType = getOptionalString(rawElement.type) ?? "image";
  const nextType = rawType === "logo" ? "image" : rawType;

  if (!(["text", "image", "shape", "video", "table"] as const).includes(nextType as CanvasElement["type"])) {
    return null;
  }

  const textBackgroundOpacity = getNumberOr(rawElement.backgroundOpacity, 0);
  const backgroundColor = getOptionalString(rawElement.backgroundColor);
  const rawWidth = Math.max(1, getNumberOr(rawElement.width, 120));
  const rawHeight = Math.max(1, getNumberOr(rawElement.height, 120));
  const scaleX = targetCanvasSize.width / Math.max(1, sourceCanvasSize.width);
  const scaleY = targetCanvasSize.height / Math.max(1, sourceCanvasSize.height);
  const xOrigin = getTemplateOriginMode(rawElement.originX);
  const yOrigin = getTemplateOriginMode(rawElement.originY);
  const preferCenteredCoordinates = rawType === "logo";

  return normalizeLayer(
    {
      id,
      type: nextType as CanvasElement["type"],
      x: normalizeTemplateAxis(
        getNumberOr(rawElement.x, 0),
        rawWidth,
        sourceCanvasSize.width,
        scaleX,
        xOrigin,
        preferCenteredCoordinates,
      ),
      y: normalizeTemplateAxis(
        getNumberOr(rawElement.y, 0),
        rawHeight,
        sourceCanvasSize.height,
        scaleY,
        yOrigin,
        preferCenteredCoordinates,
      ),
      width: Math.max(1, scaleTemplateValue(rawWidth, scaleX)),
      height: Math.max(1, scaleTemplateValue(rawHeight, scaleY)),
      content: getOptionalString(rawElement.content),
      src: getOptionalString(rawElement.src),
      fontSize: getOptionalNumber(rawElement.fontSize),
      fontFamily: getOptionalString(rawElement.fontFamily),
      fontWeight:
        typeof rawElement.fontWeight === "string" || typeof rawElement.fontWeight === "number"
          ? String(rawElement.fontWeight)
          : undefined,
      color: getOptionalString(rawElement.color),
      backgroundColor: nextType === "shape" ? backgroundColor : undefined,
      textBackgroundColor:
        nextType === "text" && backgroundColor && textBackgroundOpacity > 0.05
          ? backgroundColor
          : undefined,
      borderColor: getOptionalString(rawElement.borderColor),
      borderWidth: getOptionalNumber(rawElement.borderWidth),
      borderRadius: getOptionalNumber(rawElement.borderRadius),
      preserveAspectRatio: rawElement.preserveAspectRatio === true ? true : undefined,
      rotation: getOptionalNumber(rawElement.rotation),
      scale: getOptionalNumber(rawElement.scale),
      locked: lockedIds.has(id),
      opacity: getTemplateOpacity(rawElement.opacity),
      visible: rawElement.visible === false ? false : undefined,
      zIndex: getOptionalNumber(rawElement.zIndex) ?? index + 1,
      textAlign: ["left", "center", "right", "justify"].includes(String(rawElement.textAlign))
        ? (rawElement.textAlign as CanvasElement["textAlign"])
        : undefined,
      lineHeight: getOptionalNumber(rawElement.lineHeight),
      letterSpacing: getOptionalNumber(rawElement.letterSpacing),
      shapeType: ["rectangle", "circle", "triangle", "line"].includes(String(rawElement.shapeType))
        ? (rawElement.shapeType as CanvasElement["shapeType"])
        : undefined,
      duration: getOptionalNumber(rawElement.duration),
      rows: getOptionalNumber(rawElement.rows),
      cols: getOptionalNumber(rawElement.cols),
      tableData: Array.isArray(rawElement.tableData) ? (rawElement.tableData as string[][]) : undefined,
    },
    getOptionalNumber(rawElement.zIndex) ?? index + 1,
  );
};

const isCanvasElementRecord = (value: unknown): value is CanvasElement =>
  typeof value === "object" && value !== null;

const parseDimensionSize = (dimension?: string) => {
  if (!dimension) {
    return null;
  }

  const match = dimension.match(/^(\d+)x(\d+)$/i);
  if (!match) {
    return null;
  }

  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return { width, height };
};

const resolveSavedDesignCanvasSize = (
  design: CanvasDesignRecord,
  fallbackSize: CanvasSizePreset,
): CanvasSizePreset => {
  const dimensionSize = parseDimensionSize(design.dimension);
  const savedWidth = getOptionalNumber(design.json.canvasDimensions?.width);
  const savedHeight = getOptionalNumber(design.json.canvasDimensions?.height);

  // Prefer explicitly stored dimensions; fall back to the current canvas size.
  // Do NOT infer canvas size from element bounding boxes — that produces unreliable
  // results (e.g. a text layer at x:157 y:210 would produce a tiny landscape canvas).
  const width = savedWidth && savedWidth > 0
    ? savedWidth
    : dimensionSize?.width && dimensionSize.width > 0
    ? dimensionSize.width
    : fallbackSize.width;
  const height = savedHeight && savedHeight > 0
    ? savedHeight
    : dimensionSize?.height && dimensionSize.height > 0
    ? dimensionSize.height
    : fallbackSize.height;

  return {
    label: design.name || fallbackSize.label,
    width,
    height,
    description: `${width} × ${height}px`,
  };
};

const resolveTemplateCanvasSize = (
  template: TemplateApplyPayload,
  fallbackSize: CanvasSizePreset,
): CanvasSizePreset => {
  // Priority: dimension string (most explicit) → json.canvasDimensions → current canvas.
  // Do NOT infer from element bounding boxes.
  const dimensionSize = parseDimensionSize(template.dimension);
  const savedWidth = getOptionalNumber(template.json.canvasDimensions?.width);
  const savedHeight = getOptionalNumber(template.json.canvasDimensions?.height);

  const width = dimensionSize?.width && dimensionSize.width > 0
    ? dimensionSize.width
    : savedWidth && savedWidth > 0
    ? savedWidth
    : fallbackSize.width;
  const height = dimensionSize?.height && dimensionSize.height > 0
    ? dimensionSize.height
    : savedHeight && savedHeight > 0
    ? savedHeight
    : fallbackSize.height;

  return {
    label: template.name || fallbackSize.label,
    width,
    height,
    description: `${width} × ${height}px`,
  };
};

const getLayerBounds = ({ x, y, width, height }: LayerBounds): LayerBounds => ({
  x,
  y,
  width: Math.max(1, width),
  height: Math.max(1, height),
});

const getOverlapArea = (candidate: LayerBounds, existing: LayerBounds) => {
  const overlapWidth =
    Math.min(candidate.x + candidate.width, existing.x + existing.width) -
    Math.max(candidate.x, existing.x);
  const overlapHeight =
    Math.min(candidate.y + candidate.height, existing.y + existing.height) -
    Math.max(candidate.y, existing.y);

  if (overlapWidth <= 0 || overlapHeight <= 0) {
    return 0;
  }

  return overlapWidth * overlapHeight;
};

const findInsertionPosition = (
  layers: CanvasElement[],
  canvasSize: CanvasSizePreset,
  element: Pick<CanvasElement, "width" | "height" | "x" | "y">,
) => {
  const width = Math.max(1, element.width);
  const height = Math.max(1, element.height);
  const centerX = (canvasSize.width - width) / 2;
  const centerY = (canvasSize.height - height) / 2;

  const baseX = clampInsertionCoordinate(element.x ?? centerX, width, canvasSize.width);
  const baseY = clampInsertionCoordinate(element.y ?? centerY, height, canvasSize.height);
  const existingBounds = layers
    .filter((layer) => layer.visible !== false)
    .map((layer) => getLayerBounds(layer));

  let bestPosition = { x: baseX, y: baseY };
  let lowestOverlap = Number.POSITIVE_INFINITY;

  for (let index = 0; index < INSERTION_SEARCH_LIMIT; index += 1) {
    const ring = Math.floor(index / 6);
    const column = index % 6;
    const horizontalOffset = (column - 2.5) * INSERTION_OFFSET_STEP;
    const verticalDirection = ring % 2 === 0 ? 1 : -1;
    const verticalOffset = Math.ceil(ring / 2) * INSERTION_OFFSET_STEP * verticalDirection;
    const candidate = {
      x: clampInsertionCoordinate(baseX + horizontalOffset, width, canvasSize.width),
      y: clampInsertionCoordinate(baseY + verticalOffset, height, canvasSize.height),
    };
    const candidateBounds = getLayerBounds({ ...candidate, width, height });
    const overlapScore = existingBounds.reduce(
      (total, bounds) => total + getOverlapArea(candidateBounds, bounds),
      0,
    );

    if (overlapScore === 0) {
      return candidate;
    }

    if (overlapScore < lowestOverlap) {
      lowestOverlap = overlapScore;
      bestPosition = candidate;
    }
  }

  return bestPosition;
};

interface EditorShellProps {
  mode: EditorMode;
  initialSize: CanvasSizePreset;
  onBack: () => void;
}

// const MOBILE_TOOLBAR_HEIGHT = 60;
// const MOBILE_PANEL_OFFSET = 60;

export const EditorShell: React.FC<EditorShellProps> = ({ mode, initialSize, onBack }) => {
  const isMobile = useIsMobile();

  const safeInitialSize: CanvasSizePreset = initialSize ?? {
    label: "Custom",
    width: 1,
    height: 1,
  };

  const hasValidInitialSize =
    !!initialSize &&
    initialSize.width > 0 &&
    initialSize.height > 0;

  const initialTitleElementRef = React.useRef<CanvasElement | null>(null);
  if (!initialTitleElementRef.current) {
    initialTitleElementRef.current = createDesignTitleElement(
      "",
      safeInitialSize,
    );
  }

  const [activeTool, setActiveTool] = React.useState<ActiveTool>("select");
  const [selectedLayerId, setSelectedLayerId] = React.useState<string | null>(null);
  const [sidebarExpanded, setSidebarExpanded] = React.useState(false);
  const [zoom, setZoom] = React.useState(100);
  const [viewportResetKey, setViewportResetKey] = React.useState(0);
  const [canvasSize, setCanvasSize] = React.useState<CanvasSizePreset>(safeInitialSize);
  const [canvasBackground, setCanvasBackground] = React.useState("#FFFFFF");
  const [designTitle, setDesignTitle] = React.useState("");
  const [requestedMobileTab, setRequestedMobileTab] = React.useState<
    "add" | "styles" | "resize" | "background" | "title" | "layout" | null
  >(null);
  const [gridEnabled, setGridEnabled] = React.useState(false);
  const [alignmentGuides, setAlignmentGuides] = React.useState(true);
  const [bleedEnabled, setBleedEnabled] = React.useState(false);
  const [folds, setFolds] = React.useState("none");
  const [showDownloadModal, setShowDownloadModal] = React.useState(false);
  const [showResizeModal, setShowResizeModal] = React.useState(false);
  const [showAIModal, setShowAIModal] = React.useState(false);
  const [showDesignManager, setShowDesignManager] = React.useState(false);
  const [recordCaptureMode, setRecordCaptureMode] = React.useState<RecordCaptureMode | null>(null);
  const [drawSettings, setDrawSettings] = React.useState<DrawSettings>({
    tool: "pencil",
    color: "#000000",
    brushSize: 10,
  });
  const [finishDrawingRequest, setFinishDrawingRequest] = React.useState(0);
  const editorRootRef = React.useRef<HTMLDivElement>(null);
  const [videoDuration, setVideoDuration] = React.useState(10);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const pendingTextEditId = useTextEditStore((state) => state.requestedElementId);
  const requestTextEdit = useTextEditStore((state) => state.requestTextEdit);
  const clearTextEditRequest = useTextEditStore((state) => state.clearTextEditRequest);
const [mobileLayerSheetOpen, setMobileLayerSheetOpen] = React.useState(false);
  const [mobileLayerSheetSection, setMobileLayerSheetSection] = React.useState<MobileLayerSheetSection>("content");
  const [mobileLayerSheetLocked, setMobileLayerSheetLocked] = React.useState(false);
  const [currentDesignId, setCurrentDesignId] = React.useState<string | null>(null);
  const [currentDesignName, setCurrentDesignName] = React.useState("");
  const [currentDesignNameSizeKey, setCurrentDesignNameSizeKey] = React.useState<string | null>(null);
  const [savedDesigns, setSavedDesigns] = React.useState<CanvasDesignRecord[]>([]);
  const [isDesignsLoading, setIsDesignsLoading] = React.useState(false);
  const [isDesignSavePending, setIsDesignSavePending] = React.useState(false);
  const [activeDesignAction, setActiveDesignAction] = React.useState<{
    type: "load" | "rename" | "delete" | null;
    id: string | null;
  }>({ type: null, id: null });
  const exportCanvasSnapshotRef = React.useRef<(() => string | null) | null>(null);
  const [elements, setElements] = React.useState<CanvasElement[]>(() => [
    // normalizeLayer(initialTitleElementRef.current!, 0),
  ]);
  const [elementPreviewById, setElementPreviewById] = React.useState<Record<string, Partial<CanvasElement>>>({});
  const [history, setHistory] = React.useState<HistoryEntry[]>([
    {
      elements: [],
      canvasBackground: "#FFFFFF",
    },
  ]);
  const [historyIndex, setHistoryIndex] = React.useState(0);

  const pushHistory = useCallback(
    (newElements: CanvasElement[], newBg?: string) => {
      const bg = newBg ?? canvasBackground;
      setHistory((prev) => {
        const trimmed = prev.slice(0, historyIndex + 1);
        return [...trimmed, { elements: newElements, canvasBackground: bg }];
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex, canvasBackground]
  );

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const entry = history[newIndex];
      setElements(entry.elements);
      setCanvasBackground(entry.canvasBackground);
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const entry = history[newIndex];
      setElements(entry.elements);
      setCanvasBackground(entry.canvasBackground);
    }
  }, [historyIndex, history]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const getDefaultDesignName = useCallback(
    (preferredName?: string) => {
      const trimmedPreferredName = preferredName?.trim();
      if (trimmedPreferredName) {
        return trimmedPreferredName;
      }

      const trimmedTitle = designTitle.trim();
      if (trimmedTitle) {
        return trimmedTitle;
      }

      return getAutoDesignName(canvasSize);
    },
    [canvasSize, designTitle],
  );

  const getResolvedCurrentDesignName = useCallback(
    (preferredName?: string) => {
      const trimmedPreferredName = preferredName?.trim();
      if (trimmedPreferredName) {
        return trimmedPreferredName;
      }

      const trimmedCurrentDesignName = currentDesignName.trim();
      if (
        trimmedCurrentDesignName &&
        currentDesignNameSizeKey === getCanvasSizeKey(canvasSize)
      ) {
        return trimmedCurrentDesignName;
      }

      return getDefaultDesignName();
    },
    [canvasSize, currentDesignName, currentDesignNameSizeKey, getDefaultDesignName],
  );

  const createCurrentDesignSnapshot = useCallback(
    (preferredName?: string): CanvasDesignSnapshot => ({
      name: getResolvedCurrentDesignName(preferredName),
      mode,
      canvasSize,
      canvasBackground,
      elements,
      thumbnailDataUrl: exportCanvasSnapshotRef.current?.() ?? undefined,
    }),
    [canvasBackground, canvasSize, elements, getResolvedCurrentDesignName, mode],
  );

  const handleExportCanvasReady = useCallback((exporter: (() => string | null) | null) => {
    exportCanvasSnapshotRef.current = exporter;
  }, []);

  const loadSavedDesigns = useCallback(async () => {
    setIsDesignsLoading(true);

    try {
      const designs = await listCanvasDesigns();
      setSavedDesigns(designs);
    } catch {
      toast.error("Unable to load saved designs.");
    } finally {
      setIsDesignsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!showDesignManager) {
      return;
    }

    void loadSavedDesigns();
  }, [loadSavedDesigns, showDesignManager]);

  const layers = React.useMemo(
    () => [...elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0)),
    [elements],
  );
  const selectedElementIds = React.useMemo(
    () => (activeTool === "draw" ? [] : selectedLayerId ? [selectedLayerId] : []),
    [activeTool, selectedLayerId],
  );
  const selectedElement =
    layers.find((layer) => layer.id === selectedLayerId) ?? null;
  const selectedElementPreview =
    selectedElement && elementPreviewById[selectedElement.id]
      ? { ...selectedElement, ...elementPreviewById[selectedElement.id] }
      : selectedElement;
  const showDrawInspector = activeTool === "draw";

  const syncDesignTitleElement = useCallback(
    (nextTitle: string, nextCanvasSize: CanvasSizePreset = canvasSize) => {
      setDesignTitle(nextTitle);
      setElements((prev) => {
        const titleIndex = prev.findIndex((el) => el.role === TITLE_ELEMENT_ROLE);
        const titleElement = titleIndex >= 0 ? prev[titleIndex] : null;

        const nextTitleElement = titleElement
          ? {
              ...titleElement,
              content: nextTitle,
              width: Math.min(
                Math.max(nextCanvasSize.width - 96, 240),
                Math.max(titleElement.width, 240),
              ),
            }
          : createDesignTitleElement(nextTitle, nextCanvasSize);

        const next =
          titleIndex >= 0
            ? prev.map((el, index) => (index === titleIndex ? nextTitleElement : el))
            : [nextTitleElement, ...prev];

        const normalized = reindexLayers(next);
        pushHistory(normalized);
        return normalized;
      });
    },
    [canvasSize, pushHistory],
  );

  const handleToolClick = (tool: ToolType) => {
  if (isMobile) {
    setMobileLayerSheetOpen(false);
    setMobileLayerSheetLocked(false);

    if (tool === "draw") {
      setSelectedLayerId(null);
    }

    setActiveTool(tool);
    setRequestedMobileTab("add");
    return;
  }

  if (activeTool === tool && sidebarExpanded) {
    setSidebarExpanded(false);
    setActiveTool("select");
  } else {
    if (tool === "draw") {
      setSelectedLayerId(null);
    }
    setActiveTool(tool);
    setSidebarExpanded(true);
  }
};

  const updateDrawSettings = useCallback((updates: Partial<DrawSettings>) => {
    setDrawSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateElementPreview = useCallback((id: string, updates: Partial<CanvasElement>) => {
    setElementPreviewById((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? {}),
        ...updates,
      },
    }));
  }, []);

  const clearElementPreview = useCallback((id?: string) => {
    if (!id) {
      setElementPreviewById({});
      return;
    }

    setElementPreviewById((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const updateElement = useCallback(
    (id: string, updates: Partial<CanvasElement>) => {
      setElements((prev) => {
        let changed = false;
        const next = prev.map((el, index) => {
          if (el.id !== id) {
            return el;
          }

          const sanitizedUpdates = stripLockedPositionUpdates(el, updates);
          if (Object.keys(sanitizedUpdates).length === 0) {
            return el;
          }

          changed = true;
          return normalizeLayer(
            clampLayerToCanvas({ ...el, ...sanitizedUpdates }, canvasSize),
            el.zIndex ?? index + 1,
          );
        });

        if (!changed) {
          return prev;
        }

        pushHistory(next);
        return next;
      });
    },
    [canvasSize, pushHistory]
  );

  // const addElement = useCallback(
  //   (element: Omit<CanvasElement, "id">) => {
  //     const newEl = { ...element, id: generateId() };
  //     setElements((prev) => {
  //       const next = [...prev, newEl];
  //       pushHistory(next);
  //       return next;
  //     });
  //     setSelectedElementIds([newEl.id]);
  //     if (isMobile) setMobilePanel(null);
  //   },
  //   [pushHistory, isMobile]
  // );

  const moveSelectedElementsBy = useCallback(
  (dx: number, dy: number) => {
    if (!selectedLayerId) return;

    setElements((prev) => {
      const selectedLayer = prev.find((el) => el.id === selectedLayerId);
      if (!selectedLayer || selectedLayer.locked) {
        return prev;
      }

      const next = prev.map((el) =>
        el.id === selectedLayerId
          ? clampLayerToCanvas({ ...el, x: el.x + dx, y: el.y + dy }, canvasSize)
          : el
      );

      pushHistory(next);
      return next;
    });
  },
  [canvasSize, selectedLayerId, pushHistory]
);

  const addElement = useCallback(
    (element: Omit<CanvasElement, "id">) => {
      let newElementId: string | null = null;

      setElements((prev) => {
        const insertionPosition = findInsertionPosition(prev, canvasSize, element);
        const nextZIndex = prev.length + 1;
        const newEl = normalizeLayer(
          clampLayerToCanvas(
            {
              ...element,
              ...insertionPosition,
              id: generateId(),
            },
            canvasSize,
          ),
          nextZIndex,
        );

        newElementId = newEl.id;

        const next = [...prev, newEl];
        pushHistory(next);
        return next;
      });

      if (!newElementId) return;

      setSelectedLayerId(newElementId);
      if (element.type === "text") {
        requestTextEdit(newElementId);
      } else {
        clearTextEditRequest();
      }
    },
    [canvasSize, clearTextEditRequest, pushHistory, requestTextEdit],
  );

  const handleAutoEditHandled = useCallback((_id: string) => {
    clearTextEditRequest();
  }, [clearTextEditRequest]);

  const startTextEditing = useCallback((id: string) => {
    setSelectedLayerId(id);
    requestTextEdit(id);
  }, [requestTextEdit]);

  const addCenteredElement = useCallback(
    (element: Omit<CanvasElement, "id" | "x" | "y">) => {
      const width = element.width;
      const height = element.height;

      addElement({
        ...element,
        x: Math.max(24, Math.round((canvasSize.width - width) / 2)),
        y: Math.max(24, Math.round((canvasSize.height - height) / 2)),
      });
    },
    [addElement, canvasSize.height, canvasSize.width],
  );

  const handleCapturedPhoto = useCallback(
    (dataUrl: string, width: number, height: number) => {
      const maxWidth = canvasSize.width * 0.62;
      const maxHeight = canvasSize.height * 0.62;
      const scaleRatio = Math.min(maxWidth / width, maxHeight / height, 1);

      addCenteredElement({
        type: "image",
        width: Math.max(120, Math.round(width * scaleRatio)),
        height: Math.max(120, Math.round(height * scaleRatio)),
        src: dataUrl,
        opacity: 100,
      });
      setRecordCaptureMode(null);
    },
    [addCenteredElement, canvasSize.height, canvasSize.width],
  );

  const handleCapturedVideo = useCallback(
    (src: string, durationSeconds: number, width: number, height: number) => {
      const maxWidth = canvasSize.width * 0.64;
      const maxHeight = canvasSize.height * 0.58;
      const scaleRatio = Math.min(maxWidth / width, maxHeight / height, 1);

      addCenteredElement({
        type: "video",
        width: Math.max(180, Math.round(width * scaleRatio)),
        height: Math.max(120, Math.round(height * scaleRatio)),
        src,
        duration: Math.max(1, Math.round(durationSeconds || 1)),
        opacity: 100,
      });
      setRecordCaptureMode(null);
    },
    [addCenteredElement, canvasSize.height, canvasSize.width],
  );

  const handleCapturedAudio = useCallback(
    (src: string, durationSeconds: number) => {
      const secondsLabel = `${durationSeconds.toFixed(1)}s voice over`;

      addCenteredElement({
        type: "text",
        width: Math.min(420, Math.round(canvasSize.width * 0.56)),
        height: 88,
        content: `Audio Recording\n${secondsLabel}`,
        fontSize: 28,
        fontFamily: "'Inter', sans-serif",
        fontWeight: "700",
        color: "#123a63",
        backgroundColor: "#ffffff",
        textAlign: "center",
        textVerticalAlign: "middle",
        lineHeight: 1.15,
        linkUrl: src,
        opacity: 100,
      });
      setRecordCaptureMode(null);
    },
    [addCenteredElement, canvasSize.width],
  );

  const commitDrawLayer = useCallback(
    (src: string) => {
      const nextZIndex = elements.length + 1;
      const newEl = normalizeLayer(
        {
          id: generateId(),
          type: "image",
          x: 0,
          y: 0,
          width: canvasSize.width,
          height: canvasSize.height,
          src,
          opacity: 100,
        },
        nextZIndex,
      );

      setElements((prev) => {
        const next = [...prev, newEl];
        pushHistory(next);
        return next;
      });
      setSelectedLayerId(null);
    },
    [canvasSize.height, canvasSize.width, elements.length, pushHistory],
  );

  const handleFinishDrawing = useCallback(() => {
    setFinishDrawingRequest((prev) => prev + 1);
  }, []);

  const handleDrawingCommitted = useCallback(
    (dataUrl: string | null) => {
      if (dataUrl) {
        commitDrawLayer(dataUrl);
      }

      setSelectedLayerId(null);
      setActiveTool("select");
      setSidebarExpanded(false);
    },
    [commitDrawLayer],
  );

  const deleteElement = useCallback(
    (id?: string) => {
      const idsToDelete = id ? [id] : selectedLayerId ? [selectedLayerId] : [];
      setElements((prev) => {
        const next = reindexLayers(prev.filter((el) => !idsToDelete.includes(el.id)));
        pushHistory(next);
        return next;
      });
      if (!id || id === selectedLayerId) {
        setSelectedLayerId(null);
      }
    },
    [pushHistory, selectedLayerId]
  );

  const duplicateElement = useCallback(
    (id?: string) => {
      const idsToDuplicate = id ? [id] : selectedLayerId ? [selectedLayerId] : [];
      setElements((prev) => {
        const next = [...prev];
        const newIds: string[] = [];

        idsToDuplicate.forEach((currentId) => {
          const el = next.find((e) => e.id === currentId);
          if (el) {
            const newEl = normalizeLayer(
              clampLayerToCanvas(
                {
                  ...el,
                  id: generateId(),
                  x: el.x + 20,
                  y: el.y + 20,
                  zIndex: next.length + 1,
                },
                canvasSize,
              ),
              next.length + 1,
            );
            next.push(newEl);
            newIds.push(newEl.id);
          }
        });

        const normalized = reindexLayers(next);
        pushHistory(normalized);
        setSelectedLayerId(newIds[0] ?? null);
        return normalized;
      });
    },
    [canvasSize, pushHistory, selectedLayerId]
  );

  const moveElementLayer = useCallback(
    (id: string, direction: "up" | "down" | "top" | "bottom") => {
      clearElementPreview(id);
      setSelectedLayerId(id);

      setElements((prev) => {
        const ordered = [...prev].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
        const idx = ordered.findIndex((e) => e.id === id);
        if (idx === -1) return prev;

        if ((direction === "down" || direction === "bottom") && idx === 0) {
          return prev;
        }

        if ((direction === "up" || direction === "top") && idx === ordered.length - 1) {
          return prev;
        }

        const next = [...ordered];
        const [item] = next.splice(idx, 1);
        if (item.locked) return prev;

        switch (direction) {
          case "up":
            next.splice(Math.min(idx + 1, next.length), 0, item);
            break;
          case "down":
            next.splice(Math.max(idx - 1, 0), 0, item);
            break;
          case "top":
            next.push(item);
            break;
          case "bottom":
            next.unshift(item);
            break;
        }

        const normalized = reindexLayers(next);
        pushHistory(normalized);
        return normalized;
      });
    },
    [clearElementPreview, pushHistory]
  );

  const reorderLayers = useCallback(
    (activeId: string, overId: string) => {
      setElements((prev) => {
        const ordered = [...prev].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
        const activeIndex = ordered.findIndex((layer) => layer.id === activeId);
        const overIndex = ordered.findIndex((layer) => layer.id === overId);
        if (activeIndex === -1 || overIndex === -1) return prev;

        const next = [...ordered];
        const [moved] = next.splice(activeIndex, 1);
        next.splice(overIndex, 0, moved);
        const normalized = reindexLayers(next);
        pushHistory(normalized);
        return normalized;
      });
    },
    [pushHistory],
  );

  const toggleLayerVisibility = useCallback(
    (id: string) => {
      setElements((prev) => {
        const next = prev.map((layer) =>
          layer.id === id ? { ...layer, visible: layer.visible === false } : layer,
        );
        pushHistory(next);
        return next;
      });
      if (selectedLayerId === id) {
        setSelectedLayerId(null);
      }
    },
    [pushHistory, selectedLayerId],
  );

  const handleBackgroundChange = useCallback(
    (bg: string) => {
      setCanvasBackground(bg);
      pushHistory(elements, bg);
    },
    [elements, pushHistory]
  );

  const handleSelectElement = useCallback(
  (id: string | null) => {
    editorRootRef.current?.focus();

    if (!id) {
      setSelectedLayerId(null);
      setMobileLayerSheetOpen(false);
      setMobileLayerSheetLocked(false);
      return;
    }

    setSelectedLayerId(id);

    // Mobile: select only, do not auto-open inspector sheet
    if (isMobile) {
      setMobileLayerSheetOpen(false);
      setMobileLayerSheetLocked(false);
    }
  },
  [isMobile],
);




  const focusEditorRootFromTarget = React.useCallback((target: EventTarget | null) => {
      const resolvedTarget = target;

      if (
        resolvedTarget instanceof HTMLInputElement ||
        resolvedTarget instanceof HTMLTextAreaElement ||
        resolvedTarget instanceof HTMLButtonElement ||
        resolvedTarget instanceof HTMLSelectElement
      ) {
        return;
      }

      const element = resolvedTarget instanceof HTMLElement ? resolvedTarget : null;
      if (
        element?.closest(
          'button, a, input, textarea, select, label, summary, [role="button"], [contenteditable="true"]',
        )
      ) {
        return;
      }

      editorRootRef.current?.focus();
    },
    [],
  );

  const handleEditorMouseDownCapture = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      focusEditorRootFromTarget(e.target);
    },
    [focusEditorRootFromTarget],
  );

  const handleEditorTouchStartCapture = React.useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      focusEditorRootFromTarget(e.target);
    },
    [focusEditorRootFromTarget],
  );

  const handleCanvasSizeChange = useCallback(
    (preset: CanvasSizePreset) => {
      const oldSize = canvasSize;
      const newSize = preset;

      const scaleX = newSize.width / oldSize.width;
      const scaleY = newSize.height / oldSize.height;
      const resizeScale = Math.min(scaleX, scaleY);

      setElements((prev) => {
        const next = prev.map((el) => {
          if (el.role === TITLE_ELEMENT_ROLE) {
            const nextWidth = Math.min(Math.max(newSize.width - 96, 240), 720);
            return clampLayerToCanvas(
              {
                ...el,
                x: Math.max(24, Math.round((newSize.width - nextWidth) / 2)),
                y: Math.max(28, Math.round(newSize.height * 0.1)),
                width: nextWidth,
                height: Math.max(72, Math.round((el.height || 88) * resizeScale)),
                fontSize: el.fontSize
                  ? Math.max(28, Math.round(el.fontSize * resizeScale))
                  : el.fontSize,
              },
              newSize,
            );
          }

          return clampLayerToCanvas(
            {
              ...el,
              x: Math.round(el.x * scaleX),
              y: Math.round(el.y * scaleY),
              width: Math.round(el.width * resizeScale),
              height: Math.round(el.height * resizeScale),
              fontSize: el.fontSize ? Math.round(el.fontSize * resizeScale) : el.fontSize,
              borderWidth: el.borderWidth ? Math.round(el.borderWidth * resizeScale) : el.borderWidth,
              borderRadius: el.borderRadius ? Math.round(el.borderRadius * resizeScale) : el.borderRadius,
            },
            newSize,
          );
        });
        pushHistory(next);
        return next;
      });

      setCanvasSize(preset);
    },
    [canvasSize, pushHistory]
  );

  const handleApplyTemplate = useCallback(
    (template: TemplateApplyPayload) => {
      const lockedIds = new Set(template.json.lockedElementIds ?? []);
      const rawElements = Array.isArray(template.json.elements) ? template.json.elements : [];
      const nextCanvasSize = resolveTemplateCanvasSize(template, canvasSize);
      const sourceCanvasSize = getTemplateCanvasSize(
        template.json.canvasDimensions,
        rawElements,
        nextCanvasSize,
      );
      const normalizedElements = reindexLayers(
        rawElements
          .map((element, index) =>
            normalizeTemplateElement(element, lockedIds, index, sourceCanvasSize, nextCanvasSize),
          )
          .filter((element): element is CanvasElement => Boolean(element))
          .map((element) => clampLayerToCanvas(element, nextCanvasSize))
          .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0)),
      );
      const nextBackground = template.json.canvasBackground || "#FFFFFF";

      clearElementPreview();
      setSelectedLayerId(null);
      setDesignTitle(template.name);
      setCurrentDesignName(template.name);
      setCurrentDesignNameSizeKey(getCanvasSizeKey(nextCanvasSize));
      setCanvasSize(nextCanvasSize);
      setCanvasBackground(nextBackground);
      setElements(normalizedElements);
      setCurrentDesignId(null);
      pushHistory(normalizedElements, nextBackground);
      setActiveTool("select");
      setSidebarExpanded(false);
      setMobileLayerSheetOpen(false);
      setMobileLayerSheetLocked(false);
      setRequestedMobileTab(null);
      // Wait for canvas to render, then set zoom to 100%, then fit to screen
      setTimeout(() => {
        setZoom(100);
        setTimeout(() => {
          requestAnimationFrame(() => {
            setViewportResetKey((current) => current + 1);
          });
        }, 500);
      }, 50);
    },
    [canvasSize, clearElementPreview, pushHistory],
  );

  const handleDownload = useCallback((format: string) => {
    console.log(`Downloading canvas as ${format.toUpperCase()}`);
    setShowDownloadModal(false);
  }, []);

  const handleResize = useCallback(
    (size: CanvasSizePreset) => {
      handleCanvasSizeChange(size);
      setShowResizeModal(false);
    },
    [handleCanvasSizeChange]
  );

  const handleAIGenerate = useCallback((prompt: string) => {
    console.log(`Generating content with prompt: ${prompt}`);
    setShowAIModal(false);
  }, []);

  const handleSaveCurrentDesign = useCallback(
    async (name: string, saveAsCopy = false) => {
      setIsDesignSavePending(true);

      try {
        const snapshot = createCurrentDesignSnapshot(name);
        const savedDesign = currentDesignId && !saveAsCopy
          ? await updateCanvasDesign(currentDesignId, snapshot)
          : await createCanvasDesign(snapshot);

        setCurrentDesignId(savedDesign.id);
        setCurrentDesignName(savedDesign.name);
        setCurrentDesignNameSizeKey(getCanvasSizeKey(canvasSize));
        setDesignTitle(savedDesign.name);
        await loadSavedDesigns();

        toast.success(
          currentDesignId && !saveAsCopy
            ? "Canvas design updated."
            : saveAsCopy
            ? "Canvas design saved as a new copy."
            : "Canvas design saved.",
        );
      } catch {
        toast.error("Unable to save this canvas design.");
      } finally {
        setIsDesignSavePending(false);
      }
    },
    [canvasSize, createCurrentDesignSnapshot, currentDesignId, loadSavedDesigns],
  );

  const handleLoadSavedDesign = useCallback(
    async (design: CanvasDesignRecord) => {
      // If this design is already active, just close the manager — no reload needed.
      if (design.id === currentDesignId) {
        setShowDesignManager(false);
        return;
      }

      setActiveDesignAction({ type: "load", id: design.id });

      try {
        const nextCanvasSize = resolveSavedDesignCanvasSize(design, canvasSize);
        const rawElements = Array.isArray(design.json.elements) ? design.json.elements : [];
        const normalizedElements = reindexLayers(
          rawElements
            .reduce<CanvasElement[]>((accumulator, element, index) => {
              if (isCanvasElementRecord(element)) {
                accumulator.push(normalizeLayer(element, index + 1));
              }

              return accumulator;
            }, [])
            .map((element) => clampLayerToCanvas(element, nextCanvasSize))
            .sort((left, right) => (left.zIndex ?? 0) - (right.zIndex ?? 0)),
        );
        const nextBackground = design.json.canvasBackground || "#FFFFFF";

        clearElementPreview();
        clearTextEditRequest();
        setSelectedLayerId(null);
        setCanvasSize(nextCanvasSize);
        setCanvasBackground(nextBackground);
        setDesignTitle(design.name);
        setCurrentDesignName(design.name);
        setCurrentDesignNameSizeKey(getCanvasSizeKey(nextCanvasSize));
        setElements(normalizedElements);
        setHistory([
          {
            elements: normalizedElements,
            canvasBackground: nextBackground,
          },
        ]);
        setHistoryIndex(0);
        setCurrentDesignId(design.id);
        // Preserve the user's current zoom level instead of resetting to 100%.
        setCurrentTime(0);
        setIsPlaying(false);
        setActiveTool("select");
        setSidebarExpanded(false);
        setMobileLayerSheetOpen(false);
        setMobileLayerSheetLocked(false);
        setRequestedMobileTab(null);
        setShowDesignManager(false);
        // Wait for canvas to render, then set zoom to 100%, then fit to screen
        setTimeout(() => {
          setZoom(100);
          setTimeout(() => {
            requestAnimationFrame(() => {
              setViewportResetKey((current) => current + 1);
            });
          }, 100);
        }, 50);

        // toast.success("Canvas design loaded.");
      } catch {
        toast.error("Unable to load this saved design.");
      } finally {
        setActiveDesignAction({ type: null, id: null });
      }
    },
    [canvasSize, clearElementPreview, clearTextEditRequest, currentDesignId],
  );

  const handleRenameSavedDesign = useCallback(
    async (design: CanvasDesignRecord, name: string) => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return;
      }

      setActiveDesignAction({ type: "rename", id: design.id });

      try {
        const updatedDesign = await renameCanvasDesign(design.id, trimmedName);
        if (currentDesignId === updatedDesign.id) {
          setCurrentDesignName(updatedDesign.name);
          setCurrentDesignNameSizeKey(getCanvasSizeKey(canvasSize));
          setDesignTitle(updatedDesign.name);
        }
        await loadSavedDesigns();
        toast.success("Canvas design renamed.");
      } catch {
        toast.error("Unable to rename this design.");
      } finally {
        setActiveDesignAction({ type: null, id: null });
      }
    },
    [canvasSize, currentDesignId, loadSavedDesigns],
  );

  const handleDeleteSavedDesign = useCallback(
    async (design: CanvasDesignRecord) => {
      setActiveDesignAction({ type: "delete", id: design.id });

      try {
        await deleteCanvasDesign(design.id);
        if (currentDesignId === design.id) {
          setCurrentDesignId(null);
          setCurrentDesignName("");
          setCurrentDesignNameSizeKey(null);
        }
        await loadSavedDesigns();
        toast.success("Canvas design deleted.");
      } catch {
        toast.error("Unable to delete this design.");
      } finally {
        setActiveDesignAction({ type: null, id: null });
      }
    },
    [currentDesignId, loadSavedDesigns],
  );

  React.useEffect(() => {
  const el = editorRootRef.current;
  if (!el) return;

  const handler = (e: KeyboardEvent) => {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    const contentEditable = (e.target as HTMLElement)?.getAttribute?.("contenteditable");
    if (contentEditable === "true") return;

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
      e.preventDefault();
      redo();
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
      if (selectedLayerId) {
        e.preventDefault();
        duplicateElement();
      }
      return;
    }

    if (e.key === "Delete" || e.key === "Backspace") {
      if (selectedLayerId) {
        e.preventDefault();
        deleteElement();
      }
      return;
    }

    const step = e.shiftKey ? 10 : 1;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      moveSelectedElementsBy(0, -step);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveSelectedElementsBy(0, step);
      return;
    }

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      moveSelectedElementsBy(-step, 0);
      return;
    }

    if (e.key === "ArrowRight") {
      e.preventDefault();
      moveSelectedElementsBy(step, 0);
      return;
    }

    if (mode === "video" && !selectedLayerId && e.key === " ") {
      e.preventDefault();
      setIsPlaying((p) => !p);
    }
  };

  el.addEventListener("keydown", handler);
  return () => el.removeEventListener("keydown", handler);
}, [
  undo,
  redo,
  selectedLayerId,
  deleteElement,
  duplicateElement,
  moveSelectedElementsBy,
  mode,
]);

  React.useEffect(() => {
    const handleMobileSheetEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ action?: string; section?: MobileLayerSheetSection }>;
      const action = customEvent.detail?.action;
      const section = customEvent.detail?.section;

      if (action === "open" && selectedLayerId) {
        setMobileLayerSheetSection(section ?? "content");
        setMobileLayerSheetLocked(Boolean(section));
        setMobileLayerSheetOpen(true);
      }

      if (action === "close") {
        setMobileLayerSheetOpen(false);
        setMobileLayerSheetLocked(false);
      }
    };

    window.addEventListener("editor:mobile-layer-sheet", handleMobileSheetEvent as EventListener);
    return () => window.removeEventListener("editor:mobile-layer-sheet", handleMobileSheetEvent as EventListener);
  }, [selectedLayerId]);

  React.useEffect(() => {
    const handleToolAction = (event: Event) => {
      const customEvent = event as CustomEvent<EditorToolActionDetail>;
      const detail = customEvent.detail;
      if (!detail || detail.tool !== "record") return;

      if (detail.action === "photo" || detail.action === "video" || detail.action === "audio") {
        setRecordCaptureMode(detail.action);
      }
    };

    window.addEventListener("editor:tool-action", handleToolAction as EventListener);
    return () => window.removeEventListener("editor:tool-action", handleToolAction as EventListener);
  }, []);

  // React.useEffect(() => {
  //   const handler = (e: KeyboardEvent) => {
  //     if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  //     const contentEditable = (e.target as HTMLElement)?.getAttribute?.("contenteditable");
  //     if (contentEditable === "true") return;

  //     if ((e.metaKey || e.ctrlKey) && e.key === "z") {
  //       e.preventDefault();
  //       if (e.shiftKey) redo();
  //       else undo();
  //     }

  //     if ((e.metaKey || e.ctrlKey) && e.key === "y") {
  //       e.preventDefault();
  //       redo();
  //     }

  //     if (e.key === "Delete" || e.key === "Backspace") {
  //       if (selectedElementIds.length > 0) {
  //         e.preventDefault();
  //         deleteElement();
  //       }
  //     }

  //     if ((e.metaKey || e.ctrlKey) && e.key === "d") {
  //       e.preventDefault();
  //       if (selectedElementIds.length > 0) duplicateElement();
  //     }

  //     if (mode === "video" && e.key === " " && selectedElementIds.length === 0) {
  //       e.preventDefault();
  //       setIsPlaying((p) => !p);
  //     }
  //   };

  //   window.addEventListener("keydown", handler);
  //   return () => window.removeEventListener("keydown", handler);
  // }, [undo, redo, selectedElementIds, deleteElement, duplicateElement, mode]);

  // if (isMobile) {
  //   return (
  //     <div
  //       className="h-screen w-screen flex flex-col overflow-hidden bg-gray-100"
  //       style={{ paddingBottom: 0 }}
  //     >
  //       <TopBar
  //         undo={undo}
  //         redo={redo}
  //         canUndo={canUndo}
  //         canRedo={canRedo}
  //         isMobile={isMobile}
  //         mode={mode}
  //         onBack={onBack}
  //         onDownload={() => setShowDownloadModal(true)}
  //         onResize={() => setShowResizeModal(true)}
  //         onAI={() => setShowAIModal(true)}
  //         zoom={zoom}
  //         onZoomChange={setZoom}
  //         canvasSize={canvasSize}
  //         canvasBackground={canvasBackground}
  //         gridEnabled={gridEnabled}
  //         alignmentGuides={alignmentGuides}
  //         bleedEnabled={bleedEnabled}
  //       />

  //       <div
  //         className="relative flex-1 min-h-0 overflow-hidden"
  //         style={{ paddingBottom: MOBILE_TOOLBAR_HEIGHT }}
  //       >
  //         <CanvasStage
  //           elements={elements}
  //           selectedElementIds={selectedElementIds}
  //           onSelectElement={handleSelectElement}
  //           onUpdateElement={updateElement}
  //           zoom={zoom}
  //           onZoomChange={setZoom}
  //           canvasSize={canvasSize}
  //           canvasBackground={canvasBackground}
  //           gridEnabled={gridEnabled}
  //           alignmentGuides={alignmentGuides}
  //           bleedEnabled={bleedEnabled}
  //           isMobileViewport
  //         />

  //         {mobilePanel === "toolbar" && activeTool && (
  //           <div
  //             className="absolute left-0 right-0 z-30 bg-white border-t border-gray-200 overflow-y-auto shadow-lg"
  //             style={{
  //               bottom: MOBILE_PANEL_OFFSET,
  //               maxHeight: "45vh",
  //             }}
  //           >
  //             <div className="p-4">
  //               <div className="flex items-center justify-between mb-3">
  //                 <h3 className="text-sm font-semibold text-foreground capitalize">
  //                   {activeTool === "qrcode" ? "QR Code" : activeTool === "ai" ? "AI" : activeTool}
  //                 </h3>
  //                 <button
  //                   onClick={() => setMobilePanel(null)}
  //                   className="text-sm text-muted-foreground"
  //                 >
  //                   Close
  //                 </button>
  //               </div>

  //               <MobileToolContent
  //                 activeTool={activeTool}
  //                 onAddElement={addElement}
  //                 onBackgroundChange={handleBackgroundChange}
  //                 canvasBackground={canvasBackground}
  //                 mode={mode}
  //                 onCanvasSizeChange={handleCanvasSizeChange}
  //               />
  //             </div>
  //           </div>
  //         )}

  //         {mobilePanel === "inspector" && selectedElement && (
  //           <div
  //             className="absolute left-0 right-0 z-30 bg-white border-t border-gray-200 overflow-y-auto shadow-lg"
  //             style={{
  //               bottom: MOBILE_PANEL_OFFSET,
  //               maxHeight: "45vh",
  //             }}
  //           >
  //             <div className="p-4">
  //               <div className="flex items-center justify-between mb-3">
  //                 <h3 className="text-sm font-semibold text-foreground">
  //                   {selectedElement.type === "text"
  //                     ? "Text"
  //                     : selectedElement.type === "shape"
  //                     ? "Shape"
  //                     : "Image"}
  //                 </h3>
  //                 <button
  //                   onClick={() => setMobilePanel(null)}
  //                   className="text-sm text-muted-foreground"
  //                 >
  //                   Close
  //                 </button>
  //               </div>

  //               <Inspector
  //                 selectedElement={selectedElement}
  //                 onUpdateElement={updateElement}
  //                 onDeleteElement={deleteElement}
  //                 onDuplicateElement={duplicateElement}
  //                 onMoveLayer={moveElementLayer}
  //                 canvasSize={canvasSize}
  //                 canvasBackground={canvasBackground}
  //                 onBackgroundChange={handleBackgroundChange}
  //                 designTitle={designTitle}
  //                 onDesignTitleChange={setDesignTitle}
  //                 gridEnabled={gridEnabled}
  //                 onGridToggle={setGridEnabled}
  //                 alignmentGuides={alignmentGuides}
  //                 onAlignmentGuidesToggle={setAlignmentGuides}
  //                 bleedEnabled={bleedEnabled}
  //                 onBleedToggle={setBleedEnabled}
  //                 folds={folds}
  //                 onFoldsChange={setFolds}
  //                 mode={mode}
  //                 isMobile
  //               />
  //             </div>
  //           </div>
  //         )}
  //       </div>

  //       <div
  //         className="relative z-40 shrink-0"
  //         style={{ height: MOBILE_TOOLBAR_HEIGHT }}
  //       >
  //         <Toolbar
  //           activeTool={activeTool}
  //           onToolClick={handleToolClick}
  //           sidebarExpanded={false}
  //           onCloseSidebar={() => {}}
  //           isMobile
  //           onAddElement={addElement}
  //           onBackgroundChange={handleBackgroundChange}
  //           canvasBackground={canvasBackground}
  //           mode={mode}
  //           onCanvasSizeChange={handleCanvasSizeChange}
  //         />
  //       </div>

  //       {showDownloadModal && (
  //         <DownloadModal
  //           canvasSize={canvasSize}
  //           onClose={() => setShowDownloadModal(false)}
  //           onDownload={handleDownload}
  //         />
  //       )}

  //       {showResizeModal && (
  //         <ResizeModal
  //           currentSize={canvasSize}
  //           onClose={() => setShowResizeModal(false)}
  //           onResize={handleResize}
  //         />
  //       )}

  //       {showAIModal && (
  //         <AIModal
  //           onClose={() => setShowAIModal(false)}
  //           onGenerate={handleAIGenerate}
  //         />
  //       )}
  //     </div>
  //   );
  // }

  if (!hasValidInitialSize) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-red-50 text-red-700">
        <p className="text-lg">
          Invalid canvas size selected. Please go back and choose a valid preset.
        </p>
      </div>
    );
  }

  const designManager = (
    <CanvasDesignManager
      open={showDesignManager}
      onOpenChange={setShowDesignManager}
      currentDesignId={currentDesignId}
      currentDesignName={getResolvedCurrentDesignName()}
      currentCanvasSize={canvasSize}
      currentElementCount={elements.length}
      designs={savedDesigns}
      isLoading={isDesignsLoading}
      isSaving={isDesignSavePending}
      activeDesignId={activeDesignAction.id}
      activeAction={activeDesignAction.type}
      onRefresh={() => {
        void loadSavedDesigns();
      }}
      onSaveCurrent={(name) => {
        void handleSaveCurrentDesign(name, false);
      }}
      onSaveAsNew={(name) => {
        void handleSaveCurrentDesign(name, true);
      }}
      onLoadDesign={(design) => {
        void handleLoadSavedDesign(design);
      }}
      onRenameDesign={(design, name) => {
        void handleRenameSavedDesign(design, name);
      }}
      onDeleteDesign={(design) => {
        void handleDeleteSavedDesign(design);
      }}
    />
  );

  if (isMobile) {
  return (
    <div
    ref={editorRootRef}
    tabIndex={0}
    onTouchStartCapture={handleEditorTouchStartCapture}
    className="h-screen w-screen flex flex-col overflow-hidden bg-gray-100 outline-none"
  >
      <TopBar
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        isMobile={isMobile}
        mode={mode}
        onBack={onBack}
        onDownload={() => setShowDownloadModal(true)}
        onResize={() => setShowResizeModal(true)}
        onAI={() => setShowAIModal(true)}
        onMobileMenu={() => setRequestedMobileTab("add")}
        onSave={() => setShowDesignManager(true)}
      />

      <div className="grid flex-1 min-h-0 grid-cols-1 overflow-hidden bg-[#eef1f5]">
  <div className="mobile-editor-stage-shell relative min-h-0">
        <CanvasStage
          elements={layers}
          selectedElementIds={selectedElementIds}
          onSelectElement={handleSelectElement}
          onStartTextEditing={startTextEditing}
          onUpdateElement={updateElement}
          onPreviewElement={updateElementPreview}
          onClearPreviewElement={clearElementPreview}
          autoEditElementId={pendingTextEditId}
          onAutoEditHandled={handleAutoEditHandled}
          zoom={zoom}
          onZoomChange={setZoom}
          canvasSize={canvasSize}
          canvasBackground={canvasBackground}
          gridEnabled={gridEnabled}
          alignmentGuides={alignmentGuides}
          bleedEnabled={bleedEnabled}
          isMobileViewport
          bottomInset={170}
          activeTool={activeTool}
          drawSettings={drawSettings}
          finishDrawingRequest={finishDrawingRequest}
          onDrawingCommitted={handleDrawingCommitted}
          onExportCanvasReady={handleExportCanvasReady}
          viewportResetKey={viewportResetKey}
        />
        </div>

        <MobileBottomDock
          selectedElement={selectedElementPreview}
          mode={mode}
          canvasSize={canvasSize}
          canvasBackground={canvasBackground}
          designTitle={designTitle}
          gridEnabled={gridEnabled}
          alignmentGuides={alignmentGuides}
          bleedEnabled={bleedEnabled}
          folds={folds}
          activeTool={activeTool}
          onToolClick={handleToolClick}
          onAddElement={addElement}
          onApplyTemplate={handleApplyTemplate}
          onUpdateElement={updateElement}
          onDeleteElement={deleteElement}
          onDuplicateElement={duplicateElement}
          onMoveLayer={moveElementLayer}
          onBackgroundChange={handleBackgroundChange}
          onDesignTitleChange={syncDesignTitleElement}
          onGridToggle={setGridEnabled}
          onAlignmentGuidesToggle={setAlignmentGuides}
          onBleedToggle={setBleedEnabled}
          onFoldsChange={setFolds}
          onCanvasSizeChange={handleCanvasSizeChange}
          drawSettings={drawSettings}
          onUpdateDrawSettings={updateDrawSettings}
          onFinishDrawing={handleFinishDrawing}
          requestedTab={requestedMobileTab}
          onRequestedTabHandled={() => setRequestedMobileTab(null)}
        />
      </div>

      {showDownloadModal && (
        <DownloadModal
          canvasSize={canvasSize}
          onClose={() => setShowDownloadModal(false)}
          onDownload={handleDownload}
        />
      )}

      {designManager}

      {showResizeModal && (
        <ResizeModal
          currentSize={canvasSize}
          onClose={() => setShowResizeModal(false)}
          onResize={handleResize}
        />
      )}

      {showAIModal && (
        <AIModal
          onClose={() => setShowAIModal(false)}
          onGenerate={handleAIGenerate}
        />
      )}

      {recordCaptureMode && (
        <RecordCaptureModal
          mode={recordCaptureMode}
          onClose={() => setRecordCaptureMode(null)}
          onCapturePhoto={handleCapturedPhoto}
          onCaptureVideo={handleCapturedVideo}
          onCaptureAudio={handleCapturedAudio}
        />
      )}

      <MobileLayerSheet
        layer={mobileLayerSheetOpen ? selectedElementPreview : null}
        section={mobileLayerSheetSection}
        onSectionChange={setMobileLayerSheetSection}
        onClose={() => {
          setMobileLayerSheetOpen(false);
          setMobileLayerSheetLocked(false);
        }}
        onUpdateLayer={updateElement}
        onDeleteLayer={deleteElement}
        onDuplicateLayer={duplicateElement}
        onMoveLayer={moveElementLayer}
        hideSectionTabs={mobileLayerSheetLocked}
      />
    </div>
  );
}

  return (
  <div
    ref={editorRootRef}
    tabIndex={0}
    onMouseDownCapture={handleEditorMouseDownCapture}
    className="h-screen w-screen flex flex-col overflow-hidden bg-[#f7f7f8] outline-none"
  >
      <TopBar
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        isMobile={false}
        mode={mode}
        onBack={onBack}
        onDownload={() => setShowDownloadModal(true)}
        onResize={() => setShowResizeModal(true)}
        onAI={() => setShowAIModal(true)}
        onSave={() => setShowDesignManager(true)}
      />

      <div className="grid flex-1 min-h-0 grid-cols-[auto_minmax(0,1fr)_auto] overflow-hidden bg-[#f7f7f8]">
        <Toolbar
          activeTool={activeTool}
          onToolClick={handleToolClick}
          sidebarExpanded={sidebarExpanded}
          onCloseSidebar={() => setSidebarExpanded(false)}
          onAddElement={addElement}
          onApplyTemplate={handleApplyTemplate}
          onBackgroundChange={handleBackgroundChange}
          canvasBackground={canvasBackground}
          mode={mode}
          onCanvasSizeChange={handleCanvasSizeChange}
          canvasSize={canvasSize}
        />

        <CanvasStage
          elements={layers}
          selectedElementIds={selectedElementIds}
          onSelectElement={handleSelectElement}
          onStartTextEditing={startTextEditing}
          onUpdateElement={updateElement}
          onPreviewElement={updateElementPreview}
          onClearPreviewElement={clearElementPreview}
          autoEditElementId={pendingTextEditId}
          onAutoEditHandled={handleAutoEditHandled}
          zoom={zoom}
          onZoomChange={setZoom}
          canvasSize={canvasSize}
          canvasBackground={canvasBackground}
          gridEnabled={gridEnabled}
          alignmentGuides={alignmentGuides}
          bleedEnabled={bleedEnabled}
          activeTool={activeTool}
          drawSettings={drawSettings}
          finishDrawingRequest={finishDrawingRequest}
          onDrawingCommitted={handleDrawingCommitted}
          onExportCanvasReady={handleExportCanvasReady}
          viewportResetKey={viewportResetKey}
        />

        <div className="flex h-full min-h-0 w-[320px] shrink-0 flex-col border-l border-editor-inspector-border bg-editor-inspector">
          <Inspector
            selectedElement={selectedElementPreview}
            maxLayerZIndex={layers.length}
            onUpdateElement={updateElement}
            onDeleteElement={deleteElement}
            onDuplicateElement={duplicateElement}
            onMoveLayer={moveElementLayer}
            onStartTextEditing={startTextEditing}
            canvasSize={canvasSize}
            onCanvasSizeChange={handleCanvasSizeChange}
            canvasBackground={canvasBackground}
            onBackgroundChange={handleBackgroundChange}
            designTitle={designTitle}
            onDesignTitleChange={syncDesignTitleElement}
            gridEnabled={gridEnabled}
            onGridToggle={setGridEnabled}
            alignmentGuides={alignmentGuides}
            onAlignmentGuidesToggle={setAlignmentGuides}
            bleedEnabled={bleedEnabled}
            onBleedToggle={setBleedEnabled}
            folds={folds}
            onFoldsChange={setFolds}
            mode={mode}
            activeTool={activeTool}
            onAddElement={addElement}
            drawSettings={drawSettings}
            onUpdateDrawSettings={updateDrawSettings}
            onFinishDrawing={handleFinishDrawing}
          />
          {/* {!showDrawInspector && (
            <LayersPanel
              layers={layers}
              selectedLayerId={selectedLayerId}
              onSelectLayer={setSelectedLayerId}
              onToggleVisibility={toggleLayerVisibility}
              onDeleteLayer={deleteElement}
              onReorderLayers={reorderLayers}
            />
          )} */}
        </div>
      </div>

      {mode === "video" && (
        <TimelineBar
          duration={videoDuration}
          currentTime={currentTime}
          isPlaying={isPlaying}
          onTimeChange={setCurrentTime}
          onPlayPause={() => setIsPlaying((p) => !p)}
          onDurationChange={setVideoDuration}
          elements={layers}
        />
      )}

      {showDownloadModal && (
        <DownloadModal
          canvasSize={canvasSize}
          onClose={() => setShowDownloadModal(false)}
          onDownload={handleDownload}
        />
      )}

      {designManager}

      {showResizeModal && (
        <ResizeModal
          currentSize={canvasSize}
          onClose={() => setShowResizeModal(false)}
          onResize={handleResize}
        />
      )}

      {showAIModal && (
        <AIModal
          onClose={() => setShowAIModal(false)}
          onGenerate={handleAIGenerate}
        />
      )}

      {recordCaptureMode && (
        <RecordCaptureModal
          mode={recordCaptureMode}
          onClose={() => setRecordCaptureMode(null)}
          onCapturePhoto={handleCapturedPhoto}
          onCaptureVideo={handleCapturedVideo}
          onCaptureAudio={handleCapturedAudio}
        />
      )}
    </div>
  );
};

const DownloadModal: React.FC<{
  canvasSize: CanvasSizePreset;
  onClose: () => void;
  onDownload: (format: string) => void;
}> = ({ canvasSize, onClose, onDownload }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-background rounded-lg p-6 w-96 max-w-[90vw]">
      <h3 className="text-lg font-semibold mb-4">Download Design</h3>
      <div className="space-y-3 mb-6">
        <p className="text-sm text-muted-foreground">
          Size: {canvasSize.width}px × {canvasSize.height}px
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onDownload("png")}
            className="h-10 rounded-lg bg-[#7650e3] text-primary-foreground hover:bg-[#7650e3]/90 transition-colors"
          >
            PNG
          </button>
          <button
            onClick={() => onDownload("jpg")}
            className="h-10 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            JPG
          </button>
          <button
            onClick={() => onDownload("pdf")}
            className="h-10 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            PDF
          </button>
          <button
            onClick={() => onDownload("svg")}
            className="h-10 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            SVG
          </button>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 h-9 rounded-lg border border-border hover:bg-accent transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
);

const ResizeModal: React.FC<{
  currentSize: CanvasSizePreset;
  onClose: () => void;
  onResize: (size: CanvasSizePreset) => void;
}> = ({ currentSize, onClose, onResize }) => {
  const [customWidth, setCustomWidth] = React.useState(currentSize.width);
  const [customHeight, setCustomHeight] = React.useState(currentSize.height);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg p-6 w-96 max-w-[90vw]">
        <h3 className="text-lg font-semibold mb-4">Resize Canvas</h3>
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm text-muted-foreground">Width</label>
              <input
                type="number"
                value={customWidth}
                onChange={(e) => setCustomWidth(Number(e.target.value))}
                className="w-full h-9 px-3 bg-accent/50 border border-border rounded-md"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Height</label>
              <input
                type="number"
                value={customHeight}
                onChange={(e) => setCustomHeight(Number(e.target.value))}
                className="w-full h-9 px-3 bg-accent/50 border border-border rounded-md"
              />
            </div>
          </div>
          <button
            onClick={() => onResize({ ...currentSize, width: customWidth, height: customHeight })}
            className="w-full h-10 rounded-lg bg-[#7650e3] text-primary-foreground hover:bg-[#7650e3]/90 transition-colors"
          >
            Apply Resize
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 h-9 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const AIModal: React.FC<{
  onClose: () => void;
  onGenerate: (prompt: string) => void;
}> = ({ onClose, onGenerate }) => {
  const [prompt, setPrompt] = React.useState("");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg p-6 w-96 max-w-[90vw]">
        <h3 className="text-lg font-semibold mb-4">AI Writer</h3>
        <div className="space-y-4 mb-6">
          <textarea
            placeholder="Describe what you want to create..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full h-24 p-3 bg-accent/50 border border-border rounded-md resize-none"
          />
          <button
            onClick={() => onGenerate(prompt)}
            className="w-full h-10 rounded-lg bg-[#7650e3] text-primary-foreground hover:bg-[#7650e3]/90 transition-colors"
          >
            Generate
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 h-9 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const RecordCaptureModal: React.FC<{
  mode: RecordCaptureMode;
  onClose: () => void;
  onCapturePhoto: (dataUrl: string, width: number, height: number) => void;
  onCaptureVideo: (src: string, durationSeconds: number, width: number, height: number) => void;
  onCaptureAudio: (src: string, durationSeconds: number) => void;
}> = ({ mode, onClose, onCapturePhoto, onCaptureVideo, onCaptureAudio }) => {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const playbackVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const recordStartRef = React.useRef<number | null>(null);

  const [error, setError] = React.useState<string | null>(null);
  const [isReady, setIsReady] = React.useState(false);
  const [isRecording, setIsRecording] = React.useState(false);
  const [capturedUrl, setCapturedUrl] = React.useState<string | null>(null);
  const [capturedDuration, setCapturedDuration] = React.useState(0);
  const [captureSize, setCaptureSize] = React.useState({ width: 1280, height: 720 });

  React.useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera and microphone access is not supported in this browser.");
        return;
      }

      try {
        const constraints =
          mode === "photo"
            ? { video: { facingMode: "user" }, audio: false }
            : mode === "video"
            ? { video: { facingMode: "user" }, audio: true }
            : { audio: true, video: false };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const settings = videoTrack.getSettings();
          setCaptureSize({
            width: Math.round(settings.width || 1280),
            height: Math.round(settings.height || 720),
          });
        }

        if ((mode === "photo" || mode === "video") && videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }

        setIsReady(true);
      } catch (captureError) {
        const message = captureError instanceof Error ? captureError.message : "Unable to access camera or microphone.";
        setError(message);
      }
    };

    setup();

    return () => {
      cancelled = true;
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (capturedUrl) {
        URL.revokeObjectURL(capturedUrl);
      }
    };
  }, [capturedUrl, mode]);

  React.useEffect(() => {
    if (!capturedUrl) return;
    if (mode === "video" && playbackVideoRef.current) {
      playbackVideoRef.current.src = capturedUrl;
    }
    if (mode === "audio" && audioRef.current) {
      audioRef.current.src = capturedUrl;
    }
  }, [capturedUrl, mode]);

  const closeModal = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    onClose();
  };

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const width = video.videoWidth || captureSize.width;
    const height = video.videoHeight || captureSize.height;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      setError("Unable to capture photo.");
      return;
    }

    context.drawImage(video, 0, 0, width, height);
    onCapturePhoto(canvas.toDataURL("image/png"), width, height);
  };

  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream) {
      setError("No media stream available.");
      return;
    }

    const mimeCandidates =
      mode === "video"
        ? ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]
        : ["audio/webm;codecs=opus", "audio/webm"];

    const mimeType = mimeCandidates.find((candidate) => MediaRecorder.isTypeSupported(candidate));

    try {
      chunksRef.current = [];
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recordStartRef.current = performance.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blobType = mimeType || (mode === "video" ? "video/webm" : "audio/webm");
        const blob = new Blob(chunksRef.current, { type: blobType });
        const url = URL.createObjectURL(blob);
        setCapturedUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        setCapturedDuration(
          Math.max(0.5, ((performance.now() - (recordStartRef.current || performance.now())) / 1000)),
        );
        setIsRecording(false);
      };

      recorder.start();
      setCapturedUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setCapturedDuration(0);
      setIsRecording(true);
    } catch (recordError) {
      const message = recordError instanceof Error ? recordError.message : "Unable to start recording.";
      setError(message);
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  };

  const saveRecording = () => {
    if (!capturedUrl) return;

    if (mode === "video") {
      onCaptureVideo(capturedUrl, capturedDuration, captureSize.width, captureSize.height);
      return;
    }

    onCaptureAudio(capturedUrl, capturedDuration);
  };

  const title = mode === "photo" ? "Capture Photo" : mode === "video" ? "Record Video" : "Record Audio";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 px-4">
      <div className="w-full max-w-[680px] rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
          <h3 className="text-lg font-semibold text-[#1f2937]">{title}</h3>
          <button onClick={closeModal} className="rounded-md px-3 py-1.5 text-sm text-[#64748b] hover:bg-[#f8fafc]">
            Close
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {error ? <div className="rounded-xl border border-[#fecaca] bg-[#fff1f2] px-4 py-3 text-sm text-[#b42318]">{error}</div> : null}

          {(mode === "photo" || mode === "video") && (
            <div className="overflow-hidden rounded-2xl bg-[#0f172a]">
              {capturedUrl && mode === "video" ? (
                <video ref={playbackVideoRef} controls className="h-[360px] w-full bg-black object-contain" />
              ) : (
                <video ref={videoRef} muted playsInline className="h-[360px] w-full bg-black object-cover" />
              )}
            </div>
          )}

          {mode === "audio" && (
            <div className="rounded-2xl border border-[#E2E8F0] bg-[#f8fafc] px-5 py-8 text-center">
              <div className="text-base font-semibold text-[#0f172a]">Microphone Recorder</div>
              <div className="mt-2 text-sm text-[#64748b]">
                {isRecording ? "Recording in progress..." : capturedUrl ? "Preview your clip below." : isReady ? "Microphone is ready." : "Requesting microphone access..."}
              </div>
              {capturedUrl ? <audio ref={audioRef} controls className="mx-auto mt-5 w-full max-w-[420px]" /> : null}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {mode === "photo" ? (
              <button
                onClick={takePhoto}
                disabled={!isReady}
                className="rounded-xl bg-[#3182CE] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2b6cb0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Take Photo
              </button>
            ) : !isRecording ? (
              <button
                onClick={startRecording}
                disabled={!isReady}
                className="rounded-xl bg-[#3182CE] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2b6cb0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {capturedUrl ? "Record Again" : "Start Recording"}
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="rounded-xl bg-[#ef4444] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#dc2626]"
              >
                Stop Recording
              </button>
            )}

            {(mode === "video" || mode === "audio") && capturedUrl && !isRecording && (
              <button
                onClick={saveRecording}
                className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-2.5 text-sm font-semibold text-[#1D4ED8] transition hover:bg-[#DBEAFE]"
              >
                Add to Design
              </button>
            )}

            {capturedDuration > 0 && (mode === "video" || mode === "audio") ? (
              <div className="text-sm text-[#64748b]">Duration: {capturedDuration.toFixed(1)}s</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};



// interface MobileToolContentProps {
//   activeTool: ToolType;
//   onAddElement: (el: Omit<CanvasElement, "id">) => void;
//   onBackgroundChange: (bg: string) => void;
//   canvasBackground: string;
//   mode: EditorMode;
//   onCanvasSizeChange: (preset: CanvasSizePreset) => void;
// }

// const MobileToolContent: React.FC<MobileToolContentProps> = ({
//   activeTool,
//   onAddElement,
//   onBackgroundChange,
//   canvasBackground,
//   mode,
//   onCanvasSizeChange,
// }) => {
//   return (
//     <ToolbarSidePanel
//       activeTool={activeTool}
//       onAddElement={onAddElement}
//       onBackgroundChange={onBackgroundChange}
//       canvasBackground={canvasBackground}
//       mode={mode}
//       onCanvasSizeChange={onCanvasSizeChange}
//     />
//   );
// };