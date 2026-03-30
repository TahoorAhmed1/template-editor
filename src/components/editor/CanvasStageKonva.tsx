import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
} from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import Konva from "konva";
import type { ActiveTool, CanvasElement, DrawSettings } from "./EditorShell";
import { getLinearGradientPoints as getSharedLinearGradientPoints, getRadialGradientGeometry, parseLinearGradient as parseSharedLinearGradient, parseRadialGradient } from "./backgroundUtils";
import { LayerEffectOverlay } from "./LayerEffectOverlay";
import { shouldUseDomEffectOverlay } from "./layerEffectUtils";
import { useTextEditStore } from "@/stores/useTextEditStore";

const konvaWithTextFix = Konva as typeof Konva & {
  _fixTextRendering?: boolean;
};

konvaWithTextFix._fixTextRendering = true;

interface CanvasStageProps {
  elements: CanvasElement[];
  selectedElementIds: string[];
  onSelectElement: (id: string | null, shiftKey?: boolean) => void;
  onStartTextEditing?: (id: string) => void;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onPreviewElement?: (id: string, updates: Partial<CanvasElement>) => void;
  onClearPreviewElement?: (id?: string) => void;
  autoEditElementId?: string | null;
  onAutoEditHandled?: (id: string) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  canvasSize: { width: number; height: number; label: string };
  canvasBackground: string;
  gridEnabled?: boolean;
  alignmentGuides?: boolean;
  bleedEnabled?: boolean;
  isMobileViewport?: boolean;
  bottomInset?: number;
  activeTool?: ActiveTool;
  drawSettings?: DrawSettings;
  finishDrawingRequest?: number;
  onDrawingCommitted?: (dataUrl: string | null) => void;
}

type InlineEditorState = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  nodeOpacity: number;
  fontSize: number;
  rotation: number;
  fontFamily: string;
  fontWeight: string;
  fontStyle: "normal" | "italic";
  color: string;
  lineHeight: number;
  letterSpacing: number;
  textAlign: "left" | "center" | "right" | "justify";
  textTransform: "none" | "uppercase";
};

type ParsedLinearGradient = {
  angleDeg: number;
  colorStops: Array<{ color: string; offset: number }>;
};

type TransformSession = {
  activeAnchor: string | null;
  originalElement: CanvasElement;
  isCornerHandle: boolean;
  originalBounds: GuideBounds;
  startPointer: ViewportPoint | null;
  aspectRatio: number;
};

type ViewportPoint = {
  x: number;
  y: number;
};

type PinchSession = {
  startDistance: number;
  startZoom: number;
  anchorPoint: ViewportPoint;
};

const GRID_SIZE = 50;
const GRID_MINOR_COLOR = "rgba(15, 23, 42, 0.14)";
const GRID_MAJOR_COLOR = "rgba(15, 23, 42, 0.24)";
const GRID_MAJOR_EVERY = 5;
const GUIDE_COLOR = "rgba(37, 99, 235, 0.9)";
const GUIDE_SNAP_THRESHOLD = 6;
const TRANSFORM_GHOST_COLOR = "rgba(59, 130, 246, 0.7)";
const MIN_ZOOM_PERCENT = 10;
const MAX_DESKTOP_ZOOM_PERCENT = 200;
const MAX_MOBILE_ZOOM_PERCENT = 500;
const MOBILE_VIEWPORT_GUTTER = 12;
const MIN_TRANSFORM_SIZE = 20;
const PREVIEW_SYNC_INTERVAL_MS = 20;
const INLINE_EDITOR_WIDTH_OFFSET = 50;
const DEFAULT_TRANSFORM_ANCHORS = [
  "top-left",
  "top-center",
  "top-right",
  "middle-right",
  "bottom-right",
  "bottom-center",
  "bottom-left",
  "middle-left",
] as const;
const TEXT_TRANSFORM_ANCHORS = [
  "top-left",
  "top-center",
  "top-right",
  "middle-right",
  "bottom-right",
  "bottom-center",
  "bottom-left",
  "middle-left",
] as const;

const imageAssetCache = new Map<string, HTMLImageElement>();
const videoAssetCache = new Map<string, HTMLVideoElement>();

type GuideBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function snap(value: number, size: number) {
  return Math.round(value / size) * size;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampZoomPercent(value: number, isMobileViewport: boolean) {
  return clamp(
    Math.round(value),
    MIN_ZOOM_PERCENT,
    isMobileViewport ? MAX_MOBILE_ZOOM_PERCENT : MAX_DESKTOP_ZOOM_PERCENT,
  );
}

function clampViewportOffset(
  value: number,
  viewportSize: number,
  contentSize: number,
  gutter: number,
) {
  const safeViewport = Math.max(1, viewportSize);

  if (contentSize <= safeViewport - gutter * 2) {
    const centered = (safeViewport - contentSize) / 2;
    const slack = Math.min(64, Math.max(18, (safeViewport - contentSize) / 2 - gutter));
    return clamp(Math.round(value), Math.round(centered - slack), Math.round(centered + slack));
  }

  const minOffset = safeViewport - contentSize - gutter;
  const maxOffset = gutter;
  return clamp(Math.round(value), Math.round(minOffset), Math.round(maxOffset));
}

function getOppositeCorner(bounds: GuideBounds, activeAnchor: string | null): ViewportPoint {
  switch (activeAnchor) {
    case "top-left":
      return { x: bounds.x + bounds.width, y: bounds.y + bounds.height };
    case "top-right":
      return { x: bounds.x, y: bounds.y + bounds.height };
    case "bottom-left":
      return { x: bounds.x + bounds.width, y: bounds.y };
    case "bottom-right":
    default:
      return { x: bounds.x, y: bounds.y };
  }
}

function getAnchoredBoxFromCorner(
  activeAnchor: string | null,
  fixedCorner: ViewportPoint,
  width: number,
  height: number,
): GuideBounds {
  switch (activeAnchor) {
    case "top-left":
      return {
        x: fixedCorner.x - width,
        y: fixedCorner.y - height,
        width,
        height,
      };
    case "top-right":
      return {
        x: fixedCorner.x,
        y: fixedCorner.y - height,
        width,
        height,
      };
    case "bottom-left":
      return {
        x: fixedCorner.x - width,
        y: fixedCorner.y,
        width,
        height,
      };
    case "bottom-right":
    default:
      return {
        x: fixedCorner.x,
        y: fixedCorner.y,
        width,
        height,
      };
  }
}

function applyMediaNodeCrop(node: Konva.Image, width: number, height: number) {
  const source = node.image();

  if (source instanceof HTMLImageElement) {
    const crop = getCoverCrop(source, width, height);
    if (crop) {
      node.crop(crop);
    }
    return;
  }

  if (source instanceof HTMLVideoElement) {
    const crop = getVideoCoverCrop(source, width, height);
    if (crop) {
      node.crop(crop);
    }
  }
}

function getMinimumScaleFactor(width: number, height: number) {
  return Math.max(MIN_TRANSFORM_SIZE / Math.max(1, width), MIN_TRANSFORM_SIZE / Math.max(1, height));
}

function isLayerLocked(element: CanvasElement | null | undefined) {
  return Boolean(element?.locked);
}

function getImageTransformPreviewBounds(
  session: TransformSession,
  pointer: ViewportPoint,
): GuideBounds {
  const { originalBounds, activeAnchor, startPointer } = session;
  if (!startPointer) {
    return originalBounds;
  }

  const deltaX = pointer.x - startPointer.x;
  const deltaY = pointer.y - startPointer.y;

  if (activeAnchor === "middle-right") {
    const width = Math.max(MIN_TRANSFORM_SIZE, Math.round(originalBounds.width + deltaX));
    return {
      x: originalBounds.x,
      y: originalBounds.y,
      width,
      height: originalBounds.height,
    };
  }

  if (activeAnchor === "middle-left") {
    const width = Math.max(MIN_TRANSFORM_SIZE, Math.round(originalBounds.width - deltaX));
    return {
      x: originalBounds.x + (originalBounds.width - width),
      y: originalBounds.y,
      width,
      height: originalBounds.height,
    };
  }

  if (activeAnchor === "bottom-center") {
    const height = Math.max(MIN_TRANSFORM_SIZE, Math.round(originalBounds.height + deltaY));
    return {
      x: originalBounds.x,
      y: originalBounds.y,
      width: originalBounds.width,
      height,
    };
  }

  if (activeAnchor === "top-center") {
    const height = Math.max(MIN_TRANSFORM_SIZE, Math.round(originalBounds.height - deltaY));
    return {
      x: originalBounds.x,
      y: originalBounds.y + (originalBounds.height - height),
      width: originalBounds.width,
      height,
    };
  }

  const widthDirection = activeAnchor?.includes("left") ? -1 : 1;
  const heightDirection = activeAnchor?.startsWith("top") ? -1 : 1;
  const normalizedDeltaX = (deltaX * widthDirection) / Math.max(1, originalBounds.width);
  const normalizedDeltaY = (deltaY * heightDirection) / Math.max(1, originalBounds.height);
  const dominantDelta =
    Math.abs(normalizedDeltaX) >= Math.abs(normalizedDeltaY)
      ? normalizedDeltaX
      : normalizedDeltaY;

  const scaleFactor = Math.max(
    getMinimumScaleFactor(originalBounds.width, originalBounds.height),
    1 + dominantDelta,
  );
  const width = Math.max(MIN_TRANSFORM_SIZE, Math.round(originalBounds.width * scaleFactor));
  const height = Math.max(MIN_TRANSFORM_SIZE, Math.round(originalBounds.height * scaleFactor));
  const fixedCorner = getOppositeCorner(originalBounds, activeAnchor);

  return getAnchoredBoxFromCorner(activeAnchor, fixedCorner, width, height);
}

function getTextTransformPreview(
  session: TransformSession,
  pointer: ViewportPoint,
): { bounds: GuideBounds; fontSize: number } {
  const { originalBounds, activeAnchor, startPointer, originalElement } = session;
  const baseFontSize = originalElement.fontSize || 24;

  if (!startPointer) {
    return {
      bounds: originalBounds,
      fontSize: baseFontSize,
    };
  }

  const deltaX = pointer.x - startPointer.x;
  const deltaY = pointer.y - startPointer.y;

  if (activeAnchor === "middle-right") {
    const width = Math.max(40, Math.round(originalBounds.width + deltaX));
    const measured = measureTextBox(originalElement, width, baseFontSize);
    return {
      bounds: {
        x: originalBounds.x,
        y: originalBounds.y,
        width,
        height: Math.max(originalBounds.height, measured.height),
      },
      fontSize: baseFontSize,
    };
  }

  if (activeAnchor === "middle-left") {
    const width = Math.max(40, Math.round(originalBounds.width - deltaX));
    const measured = measureTextBox(originalElement, width, baseFontSize);
    return {
      bounds: {
        x: originalBounds.x + (originalBounds.width - width),
        y: originalBounds.y,
        width,
        height: Math.max(originalBounds.height, measured.height),
      },
      fontSize: baseFontSize,
    };
  }

  if (activeAnchor === "top-center" || activeAnchor === "bottom-center") {
    const heightDirection = activeAnchor === "top-center" ? -1 : 1;
    const height = Math.max(20, Math.round(originalBounds.height + deltaY * heightDirection));
    return {
      bounds: {
        x: originalBounds.x,
        y:
          activeAnchor === "top-center"
            ? originalBounds.y + (originalBounds.height - height)
            : originalBounds.y,
        width: originalBounds.width,
        height,
      },
      fontSize: baseFontSize,
    };
  }

  // Corner drag: uniformly scale the whole text object (box + font)
  const widthDirection = activeAnchor?.includes("left") ? -1 : 1;
  const heightDirection = activeAnchor?.startsWith("top") ? -1 : 1;
  const normalizedDeltaX = (deltaX * widthDirection) / Math.max(1, originalBounds.width);
  const normalizedDeltaY = (deltaY * heightDirection) / Math.max(1, originalBounds.height);
  const dominantDelta =
    Math.abs(normalizedDeltaX) >= Math.abs(normalizedDeltaY)
      ? normalizedDeltaX
      : normalizedDeltaY;
  const scaleFactor = Math.max(
    getMinimumScaleFactor(originalBounds.width, originalBounds.height),
    1 + dominantDelta,
  );
  const fontSize = Math.max(8, Math.round(baseFontSize * scaleFactor));
  const width = Math.max(40, Math.round(originalBounds.width * scaleFactor));
  const measured = measureTextBox(originalElement, width, fontSize);
  const height = Math.max(Math.round(originalBounds.height * scaleFactor), measured.height);
  const fixedCorner = getOppositeCorner(originalBounds, activeAnchor);

  return {
    bounds: getAnchoredBoxFromCorner(activeAnchor, fixedCorner, width, height),
    fontSize,
  };
}

function getStableImageTransformBounds(
  session: TransformSession,
  rawBounds: GuideBounds,
): GuideBounds {
  const scaleFactor = Math.max(
    rawBounds.width / Math.max(1, session.originalBounds.width),
    rawBounds.height / Math.max(1, session.originalBounds.height),
  );
  const nextWidth = Math.max(
    MIN_TRANSFORM_SIZE,
    Math.round(session.originalElement.width * scaleFactor),
  );
  const nextHeight = Math.max(
    MIN_TRANSFORM_SIZE,
    Math.round(session.originalElement.height * scaleFactor),
  );
  const fixedCorner = getOppositeCorner(session.originalBounds, session.activeAnchor);

  return getAnchoredBoxFromCorner(
    session.activeAnchor,
    fixedCorner,
    nextWidth,
    nextHeight,
  );
}

function getElementGuideBounds(element: CanvasElement): GuideBounds {
  return {
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
  };
}

function getNodeGuideBounds(
  node: Konva.Node,
  fallbackWidth: number,
  fallbackHeight: number,
): GuideBounds {
  if (node instanceof Konva.Circle) {
    const position = node.position();
    const radius = node.radius() * Math.abs(node.scaleX?.() ?? 1);
    const diameter = Math.max(1, radius * 2);

    return {
      x: position.x - radius,
      y: position.y - radius,
      width: diameter,
      height: diameter,
    };
  }

  const position = node.position();
  const scaleX = Math.abs(node.scaleX?.() ?? 1);
  const scaleY = Math.abs(node.scaleY?.() ?? 1);
  const width = (node.width?.() ?? fallbackWidth) * scaleX;
  const height = (node.height?.() ?? fallbackHeight) * scaleY;

  return {
    x: position.x,
    y: position.y,
    width: Math.max(1, width || fallbackWidth),
    height: Math.max(1, height || fallbackHeight),
  };
}

function isPointInsideBounds(point: ViewportPoint, bounds: GuideBounds) {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

function isCanvasElementTarget(target: Konva.Node | null | undefined) {
  if (!target) return false;

  const targetId = target.id?.();
  return Boolean(targetId && targetId !== "" && targetId !== "Transformer");
}

function isCornerAnchor(anchor: string | null) {
  return anchor === "top-left" || anchor === "top-right" || anchor === "bottom-left" || anchor === "bottom-right";
}

function getEditableTextContent(element: HTMLDivElement | null | undefined) {
  if (!element) {
    return "";
  }

  return element.innerText
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/\u200B/g, "");
}

function moveCaretToEnd(element: HTMLDivElement) {
  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function insertEditableLineBreak() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return false;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();

  const fragment = document.createDocumentFragment();
  const br = document.createElement("br");
  const marker = document.createTextNode("\u200B");
  fragment.append(br, marker);
  range.insertNode(fragment);

  range.setStartAfter(marker);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

function shouldShowTransformGhost(element: CanvasElement) {
  return element.type !== "text";
}

function measureTextBox(element: CanvasElement, width: number, fontSize: number) {
  const probe = new Konva.Text({
    text:
      element.textTransform === "uppercase"
        ? (element.content || "").toUpperCase()
        : element.content || "",
    width: Math.max(1, width),
    fontSize,
    fontFamily: element.fontFamily || "sans-serif",
    fontStyle: mapFontStyleToKonva(element.fontWeight, element.fontStyle),
    lineHeight: element.lineHeight || 1.2,
    letterSpacing: element.letterSpacing || 0,
    wrap: "word",
    padding: 0,
  });

  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(probe.height())),
  };
}

function measureSingleLineTextWidth(element: CanvasElement, text: string, fontSize: number) {
  const probe = new Konva.Text({
    text,
    fontSize,
    fontFamily: element.fontFamily || "sans-serif",
    fontStyle: mapFontStyleToKonva(element.fontWeight, element.fontStyle),
    lineHeight: element.lineHeight || 1.2,
    letterSpacing: element.letterSpacing || 0,
    wrap: "none",
    padding: 0,
  });

  return Math.max(1, Math.round(probe.width()));
}

function getImageAsset(src: string) {
  const cached = imageAssetCache.get(src);
  if (cached) return cached;

  const image = new window.Image();
  image.src = src;
  imageAssetCache.set(src, image);
  return image;
}

function getVideoAsset(src: string) {
  const cached = videoAssetCache.get(src);
  if (cached) return cached;

  const video = document.createElement("video");
  video.src = src;
  video.muted = true;
  video.loop = true;
  video.autoplay = true;
  video.playsInline = true;
  video.preload = "auto";
  video.crossOrigin = "anonymous";
  videoAssetCache.set(src, video);
  return video;
}

function getCoverCrop(image: HTMLImageElement, width: number, height: number) {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;

  if (!sourceWidth || !sourceHeight || width <= 0 || height <= 0) {
    return undefined;
  }

  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = width / height;

  if (sourceRatio > targetRatio) {
    const cropWidth = sourceHeight * targetRatio;
    return {
      x: (sourceWidth - cropWidth) / 2,
      y: 0,
      width: cropWidth,
      height: sourceHeight,
    };
  }

  const cropHeight = sourceWidth / targetRatio;
  return {
    x: 0,
    y: (sourceHeight - cropHeight) / 2,
    width: sourceWidth,
    height: cropHeight,
  };
}

function resolveAlignmentGuides(
  activeId: string,
  bounds: GuideBounds,
  elements: CanvasElement[],
  canvasSize: { width: number; height: number },
) {
  const verticalStops = [0, canvasSize.width / 2, canvasSize.width];
  const horizontalStops = [0, canvasSize.height / 2, canvasSize.height];

  elements.forEach((element) => {
    if (element.id === activeId) return;

    const box = getElementGuideBounds(element);
    verticalStops.push(box.x, box.x + box.width / 2, box.x + box.width);
    horizontalStops.push(box.y, box.y + box.height / 2, box.y + box.height);
  });

  const verticalEdges = [
    { position: bounds.x, offset: 0 },
    { position: bounds.x + bounds.width / 2, offset: bounds.width / 2 },
    { position: bounds.x + bounds.width, offset: bounds.width },
  ];
  const horizontalEdges = [
    { position: bounds.y, offset: 0 },
    { position: bounds.y + bounds.height / 2, offset: bounds.height / 2 },
    { position: bounds.y + bounds.height, offset: bounds.height },
  ];

  let bestVertical: { stop: number; offset: number; diff: number } | null = null;
  let bestHorizontal: { stop: number; offset: number; diff: number } | null = null;

  verticalStops.forEach((stop) => {
    verticalEdges.forEach((edge) => {
      const diff = stop - edge.position;
      if (Math.abs(diff) > GUIDE_SNAP_THRESHOLD) return;

      if (!bestVertical || Math.abs(diff) < Math.abs(bestVertical.diff)) {
        bestVertical = { stop, offset: edge.offset, diff };
      }
    });
  });

  horizontalStops.forEach((stop) => {
    horizontalEdges.forEach((edge) => {
      const diff = stop - edge.position;
      if (Math.abs(diff) > GUIDE_SNAP_THRESHOLD) return;

      if (!bestHorizontal || Math.abs(diff) < Math.abs(bestHorizontal.diff)) {
        bestHorizontal = { stop, offset: edge.offset, diff };
      }
    });
  });

  return {
    snappedX: bestVertical ? bestVertical.stop - bestVertical.offset : bounds.x,
    snappedY: bestHorizontal ? bestHorizontal.stop - bestHorizontal.offset : bounds.y,
    verticalGuide: bestVertical?.stop,
    horizontalGuide: bestHorizontal?.stop,
  };
}

function getActiveAnimationState(element: CanvasElement) {
  const animationProps = element.animationProps;
  if (!animationProps) {
    return { opacity: 1, x: 0, y: 0, scale: 1, rotation: 0 };
  }

  return animationProps[animationProps.activePhase] ?? {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
  };
}

function getRenderableLayer(element: CanvasElement) {
  const motion = getActiveAnimationState(element);
  const baseScale = element.scale ?? 1;

  return {
    ...element,
    x: element.x + motion.x,
    y: element.y + motion.y,
    rotation: (element.rotation || 0) + motion.rotation,
    opacity: (element.opacity ?? 100) * motion.opacity,
    scale: baseScale * motion.scale,
  };
}

const CanvasStageComponent: React.FC<CanvasStageProps> = ({
  elements,
  selectedElementIds,
  onSelectElement,
  onUpdateElement,
  onPreviewElement,
  onClearPreviewElement,
  autoEditElementId,
  onAutoEditHandled,
  zoom,
  onZoomChange,
  canvasSize,
  canvasBackground,
  gridEnabled = false,
  alignmentGuides = true,
  bleedEnabled,
  isMobileViewport = false,
  bottomInset = 96,
  activeTool = "select",
  drawSettings = { tool: "pencil", color: "#000000", brushSize: 10 },
  finishDrawingRequest = 0,
  onDrawingCommitted,
}) => {
  const requestedTextEditId = useTextEditStore((state) => state.requestedElementId);
  const textEditRequestKey = useTextEditStore((state) => state.requestKey);
  const consumeTextEditRequest = useTextEditStore((state) => state.consumeTextEditRequest);
  const containerRef = useRef<HTMLDivElement>(null);
  const stageWrapperRef = useRef<HTMLDivElement>(null);
  const konvaContainerRef = useRef<HTMLDivElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const pinchSessionRef = useRef<PinchSession | null>(null);
  const fitZoomRef = useRef(zoom);
  const hasManualMobileTransformRef = useRef(false);

  const stageRef = useRef<Konva.Stage | null>(null);
  const layerRef = useRef<Konva.Layer | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const gridLayerRef = useRef<Konva.Layer | null>(null);
  const guideLayerRef = useRef<Konva.Layer | null>(null);
  const transformSessionRef = useRef<TransformSession | null>(null);
  const transformPreviewFrameRef = useRef<number | null>(null);
  const pendingTransformPreviewRef = useRef<{ id: string; updates: Partial<CanvasElement> } | null>(null);
  const lastPreviewSyncAtRef = useRef(0);
  const shapeRefs = useRef<Map<string, Konva.Node>>(new Map());
  const elementsRef = useRef(elements);
  const selectedElementIdsRef = useRef(selectedElementIds);
  const textInputRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const lastDrawPointRef = useRef<{ x: number; y: number } | null>(null);
  const hasDrawingRef = useRef(false);
  const handledFinishRequestRef = useRef(0);
  const inlineEditorRef = useRef<InlineEditorState | null>(null);
  const editingTextRef = useRef("");
  const isClosingRef = useRef(false);
  const closeInlineEditingRef = useRef<(save: boolean) => void>(() => {});

  const [inlineEditor, setInlineEditor] = useState<InlineEditorState | null>(
    null,
  );
  const [editingText, setEditingText] = useState("");
  const [pulseProgress, setPulseProgress] = useState(0);
  const [mobilePan, setMobilePan] = useState<ViewportPoint>({ x: 0, y: 0 });

  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  useEffect(() => {
    selectedElementIdsRef.current = selectedElementIds;
  }, [selectedElementIds]);

  const scale = zoom / 100;
  const isDrawMode = activeTool === "draw";
  const stagePressEvent = isMobileViewport ? "touchstart" : "mousedown";
  const stageActivateEvent = isMobileViewport ? "tap" : "click";
  const stageDoubleActivateEvent = isMobileViewport ? "dbltap" : "dblclick";
  const pulseFrequency =
    elements
      .filter((element) => element.visible !== false)
      .filter((element) => element.effectProps?.preset === "pulse")
      .reduce((max, element) => Math.max(max, element.effectProps?.pulseSpeed ?? 1), 1) || 1;

  const clearAlignmentGuides = useCallback(() => {
    const guideLayer = guideLayerRef.current;
    if (!guideLayer) return;

    guideLayer.destroyChildren();
    guideLayer.draw();
  }, []);

  const drawTransformGhost = useCallback((bounds: GuideBounds) => {
    const guideLayer = guideLayerRef.current;
    if (!guideLayer) return;

    guideLayer.destroyChildren();
    guideLayer.add(
      new Konva.Rect({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        stroke: TRANSFORM_GHOST_COLOR,
        strokeWidth: 1,
        dash: [6, 5],
        fill: "rgba(59, 130, 246, 0.04)",
        listening: false,
      }),
    );
    guideLayer.draw();
  }, []);

  const flushTransformPreview = useCallback(() => {
    transformPreviewFrameRef.current = null;
    if (!pendingTransformPreviewRef.current) return;

    const now = performance.now();
    if (now - lastPreviewSyncAtRef.current < PREVIEW_SYNC_INTERVAL_MS) {
      transformPreviewFrameRef.current = requestAnimationFrame(flushTransformPreview);
      return;
    }

    const { id, updates } = pendingTransformPreviewRef.current;
    pendingTransformPreviewRef.current = null;
    lastPreviewSyncAtRef.current = now;
    onPreviewElement?.(id, updates);
  }, [onPreviewElement]);

  const scheduleTransformPreview = useCallback(
    (id: string, updates: Partial<CanvasElement>) => {
      pendingTransformPreviewRef.current = { id, updates };
      if (transformPreviewFrameRef.current != null) return;

      transformPreviewFrameRef.current = requestAnimationFrame(flushTransformPreview);
    },
    [flushTransformPreview],
  );

  const clearDrawingCanvas = useCallback(() => {
    const canvas = drawingCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    isDrawingRef.current = false;
    lastDrawPointRef.current = null;
    hasDrawingRef.current = false;
  }, []);

  const getCanvasPointerPosition = useCallback((): ViewportPoint | null => {
    const stage = stageRef.current;
    const pointer = stage?.getPointerPosition();
    if (!pointer) return null;

    return {
      x: pointer.x / Math.max(scale, 0.001),
      y: pointer.y / Math.max(scale, 0.001),
    };
  }, [scale]);

  const getViewportMetrics = useCallback(() => {
    const container = containerRef.current;
    if (!container) return null;

    const rect = container.getBoundingClientRect();
    const usableHeight = Math.max(1, rect.height - (isMobileViewport ? bottomInset : 0));

    return {
      rect,
      width: rect.width,
      height: rect.height,
      usableHeight,
    };
  }, [bottomInset, isMobileViewport]);

  const getCenteredMobilePan = useCallback(
    (nextZoom: number): ViewportPoint => {
      const metrics = getViewportMetrics();
      if (!metrics) return { x: 0, y: 0 };

      const nextScale = nextZoom / 100;
      const contentWidth = canvasSize.width * nextScale;
      const contentHeight = canvasSize.height * nextScale;

      return {
        x: clampViewportOffset(
          (metrics.width - contentWidth) / 2,
          metrics.width,
          contentWidth,
          MOBILE_VIEWPORT_GUTTER,
        ),
        y: clampViewportOffset(
          (metrics.usableHeight - contentHeight) / 2,
          metrics.usableHeight,
          contentHeight,
          MOBILE_VIEWPORT_GUTTER,
        ),
      };
    },
    [canvasSize.height, canvasSize.width, getViewportMetrics],
  );

  const clampMobilePan = useCallback(
    (nextPan: ViewportPoint, nextZoom: number): ViewportPoint => {
      const metrics = getViewportMetrics();
      if (!metrics) return nextPan;

      const nextScale = nextZoom / 100;
      const contentWidth = canvasSize.width * nextScale;
      const contentHeight = canvasSize.height * nextScale;

      return {
        x: clampViewportOffset(
          nextPan.x,
          metrics.width,
          contentWidth,
          MOBILE_VIEWPORT_GUTTER,
        ),
        y: clampViewportOffset(
          nextPan.y,
          metrics.usableHeight,
          contentHeight,
          MOBILE_VIEWPORT_GUTTER,
        ),
      };
    },
    [canvasSize.height, canvasSize.width, getViewportMetrics],
  );

  const getRelativeViewportPoint = useCallback(
    (point: ViewportPoint): ViewportPoint | null => {
      const metrics = getViewportMetrics();
      if (!metrics) return null;

      return {
        x: point.x - metrics.rect.left,
        y: point.y - metrics.rect.top,
      };
    },
    [getViewportMetrics],
  );

  const syncMobileZoomTransform = useCallback(
    (nextZoom: number, nextPan?: ViewportPoint, options?: { manual?: boolean }) => {
      const clampedZoom = clampZoomPercent(nextZoom, true);
      const resolvedPan = clampMobilePan(nextPan ?? mobilePan, clampedZoom);

      if (options?.manual) {
        hasManualMobileTransformRef.current = true;
      }

      setMobilePan((currentPan) => {
        if (currentPan.x === resolvedPan.x && currentPan.y === resolvedPan.y) {
          return currentPan;
        }
        return resolvedPan;
      });

      if (clampedZoom !== zoom) {
        onZoomChange(clampedZoom);
      }
    },
    [clampMobilePan, mobilePan, onZoomChange, zoom],
  );

  const getDrawPoint = useCallback((clientX: number, clientY: number) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  }, []);

  const stampCircleBrush = useCallback(
    (context: CanvasRenderingContext2D, point: { x: number; y: number }, erase: boolean) => {
      const radius = Math.max(4, drawSettings.brushSize * 0.7);
      context.save();
      context.globalCompositeOperation = erase ? "destination-out" : "source-over";
      context.strokeStyle = drawSettings.color;
      context.lineWidth = Math.max(1.5, drawSettings.brushSize * 0.18);
      context.beginPath();
      context.arc(point.x, point.y, radius, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    },
    [drawSettings.brushSize, drawSettings.color],
  );

  const stampSprayBrush = useCallback(
    (context: CanvasRenderingContext2D, point: { x: number; y: number }, erase: boolean) => {
      const radius = Math.max(4, drawSettings.brushSize * 0.9);
      const density = Math.max(12, Math.round(drawSettings.brushSize * 2.2));

      context.save();
      context.globalCompositeOperation = erase ? "destination-out" : "source-over";
      context.fillStyle = drawSettings.color;

      for (let index = 0; index < density; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * radius;
        const dotSize = Math.max(0.8, Math.random() * (drawSettings.brushSize / 5));
        const x = point.x + Math.cos(angle) * distance;
        const y = point.y + Math.sin(angle) * distance;

        context.beginPath();
        context.arc(x, y, dotSize, 0, Math.PI * 2);
        context.fill();
      }

      context.restore();
    },
    [drawSettings.brushSize, drawSettings.color],
  );

  const drawSegment = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const canvas = drawingCanvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) return;

      const erase = drawSettings.tool === "eraser";
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const distance = Math.max(Math.hypot(dx, dy), 1);
      const steps = Math.max(1, Math.ceil(distance / Math.max(2, drawSettings.brushSize / 2)));

      if (drawSettings.tool === "pencil" || drawSettings.tool === "eraser") {
        context.save();
        context.globalCompositeOperation = erase ? "destination-out" : "source-over";
        context.strokeStyle = drawSettings.color;
        context.lineWidth = drawSettings.brushSize;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.beginPath();
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.stroke();
        context.restore();
      } else {
        for (let step = 0; step <= steps; step += 1) {
          const progress = step / steps;
          const point = {
            x: from.x + dx * progress,
            y: from.y + dy * progress,
          };

          if (drawSettings.tool === "circle") {
            stampCircleBrush(context, point, false);
          } else {
            stampSprayBrush(context, point, false);
          }
        }
      }

      hasDrawingRef.current = true;
    },
    [drawSettings, stampCircleBrush, stampSprayBrush],
  );

  const drawAlignmentGuides = useCallback(
    (verticalGuide?: number, horizontalGuide?: number) => {
      const guideLayer = guideLayerRef.current;
      if (!guideLayer) return;

      guideLayer.destroyChildren();

      if (typeof verticalGuide === "number") {
        guideLayer.add(
          new Konva.Line({
            points: [verticalGuide, 0, verticalGuide, canvasSize.height],
            stroke: GUIDE_COLOR,
            strokeWidth: 1,
            dash: [6, 6],
            listening: false,
          }),
        );
      }

      if (typeof horizontalGuide === "number") {
        guideLayer.add(
          new Konva.Line({
            points: [0, horizontalGuide, canvasSize.width, horizontalGuide],
            stroke: GUIDE_COLOR,
            strokeWidth: 1,
            dash: [6, 6],
            listening: false,
          }),
        );
      }

      guideLayer.draw();
    },
    [canvasSize.height, canvasSize.width],
  );

  const syncStageScale = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;

    stage.width(canvasSize.width * scale);
    stage.height(canvasSize.height * scale);
    stage.scale({ x: scale, y: scale });
    stage.draw();
  }, [canvasSize.width, canvasSize.height, scale]);

  const getInlineEditorState = useCallback(
    (element: CanvasElement, node: Konva.Text): InlineEditorState => {
      const pos = node.absolutePosition();
      const width = Math.max(
        20,
        node.width() * Math.abs(node.scaleX()) * scale + INLINE_EDITOR_WIDTH_OFFSET,
      );
      const height = Math.max(
        20,
        node.height() * Math.abs(node.scaleY()) * scale,
      );

      return {
        id: element.id,
        x: pos.x,
        y: pos.y,
        width,
        height,
        nodeOpacity: node.opacity(),
        fontSize: element.fontSize || 24,
        rotation: node.rotation() || 0,
        fontFamily: element.fontFamily || "sans-serif",
        fontWeight: element.fontWeight || "normal",
        fontStyle: element.fontStyle || "normal",
        color: element.color || "#000000",
        lineHeight: element.lineHeight || 1.2,
        letterSpacing: element.letterSpacing || 0,
        textAlign: element.textAlign || "left",
        textTransform: element.textTransform || "none",
      };
    },
    [scale],
  );

  const syncInlineEditorSize = useCallback(
    (
      editor: InlineEditorState,
      editable: HTMLDivElement,
      textValue: string = getEditableTextContent(editable),
    ) => {
      const canvasScale = Math.max(scale, 0.001);
      const maxDisplayWidth = Math.max(
        20,
        Math.round(canvasSize.width * scale - editor.x),
      );
      const maxCanvasWidth = Math.max(24, Math.round(maxDisplayWidth / canvasScale));
      const widthOffsetInCanvasUnits = Math.max(
        1,
        Math.round(INLINE_EDITOR_WIDTH_OFFSET / canvasScale),
      );
      const baseCanvasWidth = Math.max(1, Math.round(Math.max(20, editor.width) / canvasScale));
      const transformedText =
        editor.textTransform === "uppercase" ? textValue.toUpperCase() : textValue;
      const singleLine = !transformedText.includes("\n");
      const intrinsicCanvasWidth = singleLine
        ? measureSingleLineTextWidth(
            {
              id: editor.id,
              type: "text",
              x: 0,
              y: 0,
              width: baseCanvasWidth,
              height: Math.max(1, Math.round(editor.height / canvasScale)),
              content: transformedText || " ",
              fontSize: editor.fontSize,
              fontFamily: editor.fontFamily,
              fontWeight: editor.fontWeight,
              fontStyle: editor.fontStyle,
              lineHeight: editor.lineHeight,
              letterSpacing: editor.letterSpacing,
              textAlign: editor.textAlign,
              textTransform: editor.textTransform,
            },
            transformedText || " ",
            editor.fontSize,
          ) + 8 + widthOffsetInCanvasUnits
        : baseCanvasWidth;
      const nextCanvasWidth = singleLine
        ? Math.max(24, Math.min(intrinsicCanvasWidth, maxCanvasWidth))
        : Math.min(baseCanvasWidth, maxCanvasWidth);
      const measured = measureTextBox(
        {
          id: editor.id,
          type: "text",
          x: 0,
          y: 0,
          width: nextCanvasWidth,
          height: Math.max(1, Math.round(editor.height / canvasScale)),
          content: textValue,
          fontSize: editor.fontSize,
          fontFamily: editor.fontFamily,
          fontWeight: editor.fontWeight,
          fontStyle: editor.fontStyle,
          lineHeight: editor.lineHeight,
          letterSpacing: editor.letterSpacing,
          textAlign: editor.textAlign,
          textTransform: editor.textTransform,
        },
        nextCanvasWidth,
        editor.fontSize,
      );
      const nextWidth = Math.max(20, Math.round(nextCanvasWidth * canvasScale));
      const nextHeight = Math.max(20, Math.round(measured.height * canvasScale));

      editable.style.width = `${nextWidth}px`;
      editable.style.height = `${nextHeight}px`;

      return {
        width: nextWidth,
        height: nextHeight,
      };
    },
    [canvasSize.width, scale],
  );

  const startInlineEditing = useCallback(
    (element: CanvasElement, node: Konva.Text) => {
      // If already editing, commit current edit first
      if (inlineEditorRef.current && !isClosingRef.current) {
        closeInlineEditingRef.current(true);
      }

      const nextEditingText = element.content || "";
      const nextInlineEditor = getInlineEditorState(element, node);

      node.visible(false);
      layerRef.current?.draw();

      editingTextRef.current = nextEditingText;
      inlineEditorRef.current = nextInlineEditor;
      setEditingText(nextEditingText);
      setInlineEditor(nextInlineEditor);
      onSelectElement(element.id);
    },
    [getInlineEditorState, onSelectElement],
  );

  const startInlineEditingByElementId = useCallback(
    (elementId: string) => {
      const element = elementsRef.current.find(
        (candidate) => candidate.id === elementId && candidate.type === "text",
      );
      if (!element) return false;

      const node = shapeRefs.current.get(elementId);
      if (!(node instanceof Konva.Text)) return false;

      startInlineEditing(element, node);
      return true;
    },
    [startInlineEditing],
  );

  const closeInlineEditing = useCallback(
    (save: boolean) => {
      if (isClosingRef.current) return;
      const currentInlineEditor = inlineEditorRef.current;
      if (!currentInlineEditor) return;

      isClosingRef.current = true;
      inlineEditorRef.current = null;

      const editable = textInputRef.current;
      const nextText = getEditableTextContent(editable) || editingTextRef.current;
      const nextSize =
        editable != null
          ? syncInlineEditorSize(currentInlineEditor, editable)
          : {
              width: currentInlineEditor.width,
              height: currentInlineEditor.height,
            };

      // Show the Konva text node immediately so it's visible before React re-renders
      const node = shapeRefs.current.get(currentInlineEditor.id);
      if (node instanceof Konva.Text) {
        node.visible(true);
        node.opacity(currentInlineEditor.nodeOpacity);
      }
      layerRef.current?.draw();

      setInlineEditor(null);
      setEditingText("");
      editingTextRef.current = "";

      if (save) {
        onUpdateElement(currentInlineEditor.id, {
          content: nextText,
          width: Math.max(1, Math.round(nextSize.width / scale)),
          height: Math.max(1, Math.round(nextSize.height / scale)),
        });
      }

      isClosingRef.current = false;
    },
    [onUpdateElement, scale, syncInlineEditorSize],
  );

  useEffect(() => {
    editingTextRef.current = editingText;
  }, [editingText]);

  useEffect(() => {
    let frameId = 0;
    let start = performance.now();

    const tick = (timestamp: number) => {
      const elapsed = (timestamp - start) / 1000;
      const normalized = (Math.sin(elapsed * Math.PI * 2 * pulseFrequency) + 1) / 2;
      setPulseProgress(normalized);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      start = 0;
    };
  }, [pulseFrequency]);

  useEffect(() => {
    closeInlineEditingRef.current = closeInlineEditing;
  }, [closeInlineEditing]);

  useEffect(() => {
    if (!konvaContainerRef.current) return;

    const currentShapeRefs = shapeRefs.current;

    const stage = new Konva.Stage({
      container: konvaContainerRef.current,
      width: canvasSize.width * scale,
      height: canvasSize.height * scale,
      draggable: false,
    });

    const gridLayer = new Konva.Layer({ listening: false });
    const layer = new Konva.Layer();
    const guideLayer = new Konva.Layer({ listening: false });

    stage.add(gridLayer);
    stage.add(layer);
    stage.add(guideLayer);

    const transformer = new Konva.Transformer({
      rotateEnabled: true,
      enabledAnchors: [...DEFAULT_TRANSFORM_ANCHORS],
      flipEnabled: false,
      centeredScaling: false,
      keepRatio: false,
      shouldOverdrawWholeArea: false,
      anchorSize: 24,
      borderStroke: "#3b82f6",
      borderStrokeWidth: 1,
      borderDash: [4, 4],
      anchorStroke: "#3b82f6",
      anchorStrokeWidth: 1.5,
      anchorFill: "#ffffff",
      anchorCornerRadius: 999,
      boundBoxFunc: (oldBox, newBox) => {
        if (newBox.width < MIN_TRANSFORM_SIZE || newBox.height < MIN_TRANSFORM_SIZE) {
          return oldBox;
        }
        return newBox;
      },
    });

    transformer.anchorStyleFunc((anchor) => {
      anchor.opacity(1);
      anchor.stroke("#3b82f6");
      anchor.fill("#ffffff");
      anchor.cornerRadius(999);
    });

    layer.add(transformer);

    stageRef.current = stage;
    gridLayerRef.current = gridLayer;
    layerRef.current = layer;
    transformerRef.current = transformer;
    guideLayerRef.current = guideLayer;

    const handleEmptyCanvasInteraction = (
      e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
    ) => {
        const target = e.target;
        const clickedAnchor =
          target && typeof target.hasName === "function" && target.hasName("_anchor");
        const clickedElement = isCanvasElementTarget(target);

        if (clickedAnchor || clickedElement) {
          return;
        }

        if (inlineEditorRef.current) {
          closeInlineEditingRef.current(true);
          return;
        }

        const pointer = stage.getPointerPosition();
        const selectedElementId =
          selectedElementIdsRef.current.length === 1
            ? selectedElementIdsRef.current[0]
            : null;

        if (pointer && selectedElementId) {
          const selectedElement = elementsRef.current.find(
            (element) => element.id === selectedElementId,
          );
          const node = shapeRefs.current.get(selectedElementId);

          if (selectedElement?.type === "text" && node instanceof Konva.Text) {
            const canvasPoint = {
              x: pointer.x / Math.max(scale, 0.001),
              y: pointer.y / Math.max(scale, 0.001),
            };
            const bounds = getNodeGuideBounds(
              node,
              selectedElement.width,
              selectedElement.height,
            );

            if (isPointInsideBounds(canvasPoint, bounds)) {
              return;
            }
          }
        }

        clearAlignmentGuides();
        onSelectElement(null);
    };

    stage.on(stagePressEvent, handleEmptyCanvasInteraction);
    stage.on(stageActivateEvent, handleEmptyCanvasInteraction);

    return () => {
      stage.off(stagePressEvent, handleEmptyCanvasInteraction);
      stage.off(stageActivateEvent, handleEmptyCanvasInteraction);
      stage.destroy();
      stageRef.current = null;
      gridLayerRef.current = null;
      layerRef.current = null;
      transformerRef.current = null;
      guideLayerRef.current = null;
      currentShapeRefs.clear();
    };
  }, [canvasSize.width, canvasSize.height, clearAlignmentGuides, onSelectElement, scale, stageActivateEvent, stagePressEvent]);

  useEffect(() => {
    return () => {
      if (transformPreviewFrameRef.current != null) {
        cancelAnimationFrame(transformPreviewFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    syncStageScale();
  }, [syncStageScale]);

  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    clearDrawingCanvas();
  }, [canvasSize.height, canvasSize.width, clearDrawingCanvas]);

  useEffect(() => {
    if (isDrawMode) return;
    clearDrawingCanvas();
  }, [clearDrawingCanvas, isDrawMode]);

  const commitDrawing = useCallback(() => {
    const canvas = drawingCanvasRef.current;
    const dataUrl = canvas && hasDrawingRef.current ? canvas.toDataURL("image/png") : null;

    clearDrawingCanvas();
    onDrawingCommitted?.(dataUrl);
  }, [clearDrawingCanvas, onDrawingCommitted]);

  useEffect(() => {
    if (!finishDrawingRequest || handledFinishRequestRef.current === finishDrawingRequest) {
      return;
    }

    handledFinishRequestRef.current = finishDrawingRequest;
    commitDrawing();
  }, [commitDrawing, finishDrawingRequest]);

  // Re-position the inline editor when zoom changes (but not on every elements change)
  useEffect(() => {
    const currentEditor = inlineEditorRef.current;
    if (!currentEditor) return;
    const node = shapeRefs.current.get(currentEditor.id);
    if (!(node instanceof Konva.Text)) return;

    const element = elements.find((el) => el.id === currentEditor.id);
    if (!element) return;

    const updated = getInlineEditorState(element, node);
    inlineEditorRef.current = updated;
    setInlineEditor(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  useEffect(() => {
    const layer = layerRef.current;
    const transformer = transformerRef.current;
    if (!layer || !stageRef.current) return;

    const oldShapes = layer.getChildren((node) => node !== transformer);
    oldShapes.forEach((shape) => shape.destroy());
    shapeRefs.current.clear();

    elements
      .filter((element) => element.visible !== false)
      .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
      .forEach((element, index) => {
      const shape = createKonvaShape(element);
      if (!shape) return;

      layer.add(shape as Konva.Shape | Konva.Group);
      shape.zIndex(index);
      shapeRefs.current.set(element.id, shape);

      shape.on(
        stagePressEvent,
        (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
          onSelectElement(element.id, Boolean((e.evt as MouseEvent)?.shiftKey));
        },
      );

      shape.on(
        stageActivateEvent,
        (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
          e.cancelBubble = true;

          onSelectElement(element.id, Boolean((e.evt as MouseEvent)?.shiftKey));
        },
      );

      if (element.type === "text" && shape instanceof Konva.Text) {
        shape.on(stageDoubleActivateEvent, (e) => {
          e.cancelBubble = true;
          startInlineEditing(element, shape);
        });
      }

      shape.on("dragmove", () => {
        const bounds = getNodeGuideBounds(shape, element.width, element.height);
        let nextX = bounds.x;
        let nextY = bounds.y;

        if (gridEnabled) {
          nextX = snap(nextX, GRID_SIZE);
          nextY = snap(nextY, GRID_SIZE);
        }

        if (alignmentGuides) {
          const guideResult = resolveAlignmentGuides(
            element.id,
            { ...bounds, x: nextX, y: nextY },
            elements,
            canvasSize,
          );
          nextX = guideResult.snappedX;
          nextY = guideResult.snappedY;
          drawAlignmentGuides(
            guideResult.verticalGuide,
            guideResult.horizontalGuide,
          );
        } else {
          clearAlignmentGuides();
        }

        shape.position({ x: nextX, y: nextY });

        layer.draw();
      });

      shape.on("dragend", () => {
        clearAlignmentGuides();
        const pos = shape.position();
        const motion = getActiveAnimationState(element);
        const nextX = (gridEnabled ? snap(pos.x, GRID_SIZE) : pos.x) - motion.x;
        const nextY = (gridEnabled ? snap(pos.y, GRID_SIZE) : pos.y) - motion.y;

        shape.position({ x: nextX, y: nextY });

        onUpdateElement(element.id, {
          x: Math.round(nextX),
          y: Math.round(nextY),
        });

        if (inlineEditor?.id === element.id && shape instanceof Konva.Text) {
          setInlineEditor(getInlineEditorState(element, shape));
        }
      });

      shape.on("transformstart", () => {
        const transformerInstance = transformerRef.current;
        const activeAnchor = transformerInstance?.getActiveAnchor() ?? null;
        const isCornerHandle = isCornerAnchor(activeAnchor);
        const motion = getActiveAnimationState(element);

        transformSessionRef.current = {
          activeAnchor,
          originalElement: element,
          isCornerHandle,
          originalBounds: {
            x: element.x + motion.x,
            y: element.y + motion.y,
            width: element.width,
            height: element.height,
          },
          startPointer: getCanvasPointerPosition(),
          aspectRatio: element.width / Math.max(1, element.height),
        };

        lastPreviewSyncAtRef.current = 0;
        transformerInstance?.keepRatio(isCornerHandle);
        if (shouldShowTransformGhost(element)) {
          drawTransformGhost(getNodeGuideBounds(shape, element.width, element.height));
        } else {
          clearAlignmentGuides();
        }
        onPreviewElement?.(element.id, {
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
          ...(element.type === "text" && element.fontSize ? { fontSize: element.fontSize } : {}),
        });
      });

      shape.on("transform", () => {
        const session = transformSessionRef.current;
        if (!session) return;

        const rawBounds = getNodeGuideBounds(shape, element.width, element.height);
        let previewBounds = rawBounds;

        let previewWidth = rawBounds.width;
        let previewHeight = rawBounds.height;
        let previewFontSize = session.originalElement.fontSize;

        if (session.originalElement.type === "text") {
          const pointer = getCanvasPointerPosition();
          const textPreview = pointer
            ? getTextTransformPreview(session, pointer)
            : {
                bounds: rawBounds,
                fontSize: session.originalElement.fontSize || 24,
              };
          previewBounds = textPreview.bounds;
          previewWidth = textPreview.bounds.width;
          previewHeight = textPreview.bounds.height;
          previewFontSize = textPreview.fontSize;
        }

        if (session.originalElement.type === "image") {
          const pointer = getCanvasPointerPosition();
          const imagePreview = pointer
            ? getImageTransformPreviewBounds(session, pointer)
            : getStableImageTransformBounds(session, rawBounds);
          previewBounds = imagePreview;
          previewWidth = imagePreview.width;
          previewHeight = imagePreview.height;
        }

        if (shouldShowTransformGhost(session.originalElement)) {
          drawTransformGhost(previewBounds);
        } else {
          clearAlignmentGuides();
        }

        const rawRight = previewBounds.x + previewBounds.width;
        const rawBottom = previewBounds.y + previewBounds.height;
        const activeAnchor = session.activeAnchor ?? "bottom-right";
        const motion = getActiveAnimationState(session.originalElement);

        let previewX = previewBounds.x;
        let previewY = previewBounds.y;

        if (activeAnchor.includes("left")) {
          previewX = rawRight - previewWidth;
        } else if (!activeAnchor.includes("right")) {
          previewX = previewBounds.x + (previewBounds.width - previewWidth) / 2;
        }

        if (activeAnchor.startsWith("top")) {
          previewY = rawBottom - previewHeight;
        } else if (!activeAnchor.startsWith("bottom")) {
          previewY = previewBounds.y + (previewBounds.height - previewHeight) / 2;
        }

        previewX -= motion.x;
        previewY -= motion.y;

        scheduleTransformPreview(session.originalElement.id, {
          x: Math.round(previewX),
          y: Math.round(previewY),
          width: Math.round(previewWidth),
          height: Math.round(previewHeight),
          ...(session.originalElement.type === "text" && previewFontSize
            ? { fontSize: previewFontSize }
            : {}),
        });
      });

      shape.on("transformend", () => {
        const session = transformSessionRef.current;
        transformSessionRef.current = null;
        transformerRef.current?.keepRatio(false);

        const motion = getActiveAnimationState(element);

        const rawBounds = getNodeGuideBounds(shape, element.width, element.height);
        let finalBounds = rawBounds;
        let nextWidth = Math.max(MIN_TRANSFORM_SIZE, Math.round(rawBounds.width));
        let nextHeight = Math.max(MIN_TRANSFORM_SIZE, Math.round(rawBounds.height));
        let nextFontSize = element.fontSize;

        if (session?.activeAnchor && element.type === "text") {
          if (session.isCornerHandle) {
            const scaleFactor = Math.max(
              rawBounds.width / Math.max(1, session.originalBounds.width),
              rawBounds.height / Math.max(1, session.originalBounds.height),
            );
            nextFontSize = Math.max(8, Math.round((session.originalElement.fontSize || 24) * scaleFactor));
            nextWidth = Math.max(40, Math.round(session.originalElement.width * scaleFactor));
            const measured = measureTextBox(session.originalElement, nextWidth, nextFontSize);
            nextWidth = measured.width;
            nextHeight = Math.max(
              Math.round(session.originalElement.height * scaleFactor),
              measured.height,
            );
            const fixedCorner = getOppositeCorner(session.originalBounds, session.activeAnchor);
            finalBounds = getAnchoredBoxFromCorner(
              session.activeAnchor,
              fixedCorner,
              nextWidth,
              nextHeight,
            );
          } else if (
            session.activeAnchor === "top-center" ||
            session.activeAnchor === "bottom-center"
          ) {
            nextFontSize = session.originalElement.fontSize || 24;
            nextWidth = session.originalElement.width;
            const measured = measureTextBox(
              session.originalElement,
              nextWidth,
              nextFontSize,
            );
            nextHeight = Math.max(Math.round(rawBounds.height), measured.height);
            finalBounds = {
              x: rawBounds.x,
              y: rawBounds.y,
              width: nextWidth,
              height: nextHeight,
            };
          } else {
            const affectsWidth = session.activeAnchor.includes("left") || session.activeAnchor.includes("right");
            nextWidth = affectsWidth ? Math.max(40, Math.round(rawBounds.width)) : session.originalElement.width;
            const measured = measureTextBox(session.originalElement, nextWidth, session.originalElement.fontSize || 24);
            nextHeight = Math.max(session.originalElement.height, measured.height);
            nextFontSize = session.originalElement.fontSize || 24;
            finalBounds = {
              x: rawBounds.x,
              y: rawBounds.y,
              width: nextWidth,
              height: nextHeight,
            };
          }
        }

        if (session?.activeAnchor && element.type === "image") {
          finalBounds = getStableImageTransformBounds(session, rawBounds);
          nextWidth = Math.max(MIN_TRANSFORM_SIZE, Math.round(finalBounds.width));
          nextHeight = Math.max(MIN_TRANSFORM_SIZE, Math.round(finalBounds.height));
        }

        if (session?.activeAnchor && element.type === "table") {
          finalBounds = rawBounds;
          nextWidth = Math.max(MIN_TRANSFORM_SIZE, Math.round(finalBounds.width));
          nextHeight = Math.max(MIN_TRANSFORM_SIZE, Math.round(finalBounds.height));

          const baseFontSize = session.originalElement.fontSize || 14;
          const widthScale = rawBounds.width / Math.max(1, session.originalBounds.width);
          const heightScale = rawBounds.height / Math.max(1, session.originalBounds.height);

          if (session.isCornerHandle) {
            nextFontSize = Math.max(8, Math.round(baseFontSize * Math.min(widthScale, heightScale)));
          } else if (
            session.activeAnchor === "top-center" ||
            session.activeAnchor === "bottom-center"
          ) {
            nextFontSize = Math.max(8, Math.round(baseFontSize * heightScale));
          } else {
            nextFontSize = baseFontSize;
          }
        }

        const rawRight = finalBounds.x + finalBounds.width;
        const rawBottom = finalBounds.y + finalBounds.height;
        const activeAnchor = session?.activeAnchor ?? "bottom-right";

        let nextX = finalBounds.x;
        let nextY = finalBounds.y;

        if (activeAnchor.includes("left")) {
          nextX = rawRight - nextWidth;
        } else if (!activeAnchor.includes("right")) {
          nextX = finalBounds.x + (finalBounds.width - nextWidth) / 2;
        }

        if (activeAnchor.startsWith("top")) {
          nextY = rawBottom - nextHeight;
        } else if (!activeAnchor.startsWith("bottom")) {
          nextY = finalBounds.y + (finalBounds.height - nextHeight) / 2;
        }

        nextX -= motion.x;
        nextY -= motion.y;

        if (gridEnabled) {
          nextX = snap(nextX, GRID_SIZE);
          nextY = snap(nextY, GRID_SIZE);
          nextWidth = Math.max(GRID_SIZE, snap(nextWidth, GRID_SIZE));
          nextHeight = Math.max(GRID_SIZE, snap(nextHeight, GRID_SIZE));
        }

        shape.position({ x: nextX, y: nextY });

        if (
          shape instanceof Konva.Text ||
          shape instanceof Konva.Image ||
          shape instanceof Konva.Rect ||
          shape instanceof Konva.Group
        ) {
          shape.width(nextWidth);
          shape.height(nextHeight);
        }

        shape.scale({ x: 1, y: 1 });

        if (shape instanceof Konva.Image) {
          applyMediaNodeCrop(shape, nextWidth, nextHeight);
        }

        layer.batchDraw();
        clearAlignmentGuides();
        onClearPreviewElement?.(element.id);

        onUpdateElement(element.id, {
          x: Math.round(nextX),
          y: Math.round(nextY),
          width: Math.round(nextWidth),
          height: Math.round(nextHeight),
          ...((element.type === "text" || element.type === "table") && nextFontSize
            ? { fontSize: nextFontSize }
            : {}),
          rotation: Math.round(shape.rotation() || 0),
        });

        if (inlineEditor?.id === element.id && shape instanceof Konva.Text) {
          setInlineEditor(getInlineEditorState(element, shape));
        }
      });

      if (
        shape instanceof Konva.Text &&
        (inlineEditor?.id === element.id || autoEditElementId === element.id)
      ) {
        shape.visible(false);
      } else if (shape instanceof Konva.Text) {
        shape.visible(true);
      }
    });

    transformer.moveToTop();
    layer.batchDraw();
  }, [
    canvasSize,
    clearAlignmentGuides,
    drawAlignmentGuides,
    elements,
    autoEditElementId,
    inlineEditor?.id,
    onSelectElement,
    onUpdateElement,
    startInlineEditing,
    getInlineEditorState,
    alignmentGuides,
    gridEnabled,
    drawTransformGhost,
    onPreviewElement,
    onClearPreviewElement,
    scheduleTransformPreview,
    getCanvasPointerPosition,
    stageActivateEvent,
    stageDoubleActivateEvent,
    stagePressEvent,
  ]);

  useEffect(() => {
    const layer = layerRef.current;
    const transformer = transformerRef.current;
    if (!layer || !transformer) return;

    const isInlineEditingActive = Boolean(inlineEditor?.id);
    const selectedElementId = selectedElementIds.length === 1 ? selectedElementIds[0] : null;
    const selectedElement = selectedElementId
      ? elements.find((element) => element.id === selectedElementId) ?? null
      : null;
    const isSingleSelectedText = Boolean(
      selectedElement && selectedElement.type === "text" && !isInlineEditingActive,
    );
    const isLockedSelection = isLayerLocked(selectedElement);
    const selectedTextNode = selectedElementId
      ? shapeRefs.current.get(selectedElementId)
      : null;

    transformer.shouldOverdrawWholeArea(false);

    if (selectedElementIds.length > 0 && !isInlineEditingActive && !isLockedSelection) {
      const selectedNodes = selectedElementIds
        .map((id) => shapeRefs.current.get(id))
        .filter(Boolean) as Konva.Node[];

      transformer.nodes(selectedNodes.length > 0 ? selectedNodes : []);
    } else {
      transformer.nodes([]);
    }

    transformer.enabledAnchors([
      ...(isLockedSelection
        ? []
        : isSingleSelectedText
        ? TEXT_TRANSFORM_ANCHORS
        : DEFAULT_TRANSFORM_ANCHORS),
    ]);

    const transformerBack = transformer.findOne(".back");
    const transformerInlineEditEvent = `${stageDoubleActivateEvent}.inlineEdit`;
    transformerBack?.off(transformerInlineEditEvent);

    if (
      transformerBack &&
      isSingleSelectedText &&
      !isLockedSelection &&
      selectedElement?.type === "text" &&
      selectedTextNode instanceof Konva.Text
    ) {
      transformerBack.listening(!isInlineEditingActive);
      transformerBack.on(transformerInlineEditEvent, (event) => {
        event.cancelBubble = true;
        startInlineEditingByElementId(selectedElement.id);
      });
    } else {
      transformerBack?.listening(!isInlineEditingActive);
    }

    transformer.find("._anchor").forEach((anchor) => {
      anchor.listening(!isInlineEditingActive);
    });

    transformer.forceUpdate();
    layer.draw();
  }, [elements, inlineEditor?.id, selectedElementIds, stageActivateEvent, stageDoubleActivateEvent, startInlineEditingByElementId]);

  useEffect(() => {
    if (!alignmentGuides) {
      clearAlignmentGuides();
    }
  }, [alignmentGuides, clearAlignmentGuides]);

  useEffect(() => {
    const gridLayer = gridLayerRef.current;
    if (!gridLayer) return;

    gridLayer.destroyChildren();

    const backgroundNode = createCanvasBackgroundNode(
      canvasBackground,
      canvasSize.width,
      canvasSize.height,
    );

    if (backgroundNode) {
      gridLayer.add(backgroundNode);
    }

    if (gridEnabled) {
      drawGrid(gridLayer, canvasSize.width, canvasSize.height, GRID_SIZE);
    }

    gridLayer.draw();
  }, [
    canvasBackground,
    canvasSize.width,
    canvasSize.height,
    gridEnabled,
  ]);

  useEffect(() => {
    const redrawGridLayer = () => {
      const stage = stageRef.current;
      const gridLayer = gridLayerRef.current;
      if (!stage || !gridLayer) return;

      gridLayer.visible(true);
      gridLayer.draw();
      stage.draw();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestAnimationFrame(redrawGridLayer);
      }
    };

    const handleFocus = () => {
      requestAnimationFrame(redrawGridLayer);
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("resize", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("resize", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const gridLayer = gridLayerRef.current;
    if (!gridLayer) return;
    gridLayer.draw();
  }, [zoom]);

  const inlineEditorId = inlineEditor?.id ?? null;

  useEffect(() => {
    const currentEditor = inlineEditorRef.current;
    if (!inlineEditorId || !currentEditor || !textInputRef.current) return;

    const editable = textInputRef.current;
    const nextText = editingTextRef.current;

    if (getEditableTextContent(editable) !== nextText) {
      editable.textContent = nextText;
    }

    editable.focus();
    moveCaretToEnd(editable);

    editable.style.width = `${currentEditor.width}px`;
    editable.style.height = `${currentEditor.height}px`;
  }, [inlineEditorId, syncInlineEditorSize]);

  useEffect(() => {
    const currentEditor = inlineEditorRef.current;
    if (!inlineEditorId || !currentEditor || !textInputRef.current) return;

    const editable = textInputRef.current;
    const nextText = getEditableTextContent(editable) || editingTextRef.current;

    const nextSize = syncInlineEditorSize(currentEditor, editable, nextText);
    if (
      nextSize.width !== currentEditor.width ||
      nextSize.height !== currentEditor.height
    ) {
      const updated = {
        ...currentEditor,
        width: nextSize.width,
        height: nextSize.height,
      };
      inlineEditorRef.current = updated;
      setInlineEditor(updated);
    }
  }, [scale, inlineEditorId, syncInlineEditorSize]);

  useEffect(() => {
    const currentEditor = inlineEditorRef.current;
    if (!inlineEditorId || !currentEditor || !textInputRef.current) return;

    const editable = textInputRef.current;
    const liveText = getEditableTextContent(editable);
    const nextSize = syncInlineEditorSize(currentEditor, editable, liveText);
    if (
      nextSize.width !== currentEditor.width ||
      nextSize.height !== currentEditor.height
    ) {
      const updated = {
        ...currentEditor,
        width: nextSize.width,
        height: nextSize.height,
      };
      inlineEditorRef.current = updated;
      setInlineEditor(updated);
    }
  }, [editingText, inlineEditorId, syncInlineEditorSize]);

  useEffect(() => {
    const resolvedAutoEditElementId = requestedTextEditId ?? autoEditElementId;

    if (!resolvedAutoEditElementId || inlineEditorRef.current) return;

    if (!startInlineEditingByElementId(resolvedAutoEditElementId)) return;

    if (requestedTextEditId === resolvedAutoEditElementId) {
      consumeTextEditRequest(textEditRequestKey);
    } else {
      onAutoEditHandled?.(resolvedAutoEditElementId);
    }
  }, [
    autoEditElementId,
    consumeTextEditRequest,
    elements,
    onAutoEditHandled,
    requestedTextEditId,
    startInlineEditingByElementId,
    textEditRequestKey,
  ]);

  const handleEditingChange = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      setEditingText(getEditableTextContent(e.currentTarget));
    },
    [],
  );

  const handleEditingBlur = useCallback(() => {
    // Use setTimeout(0) so the blur completes before we mutate state.
    // This avoids races with React's focus management and Konva's click handlers.
    setTimeout(() => {
      closeInlineEditingRef.current(true);
    }, 0);
  }, []);

  const handleEditingKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      e.stopPropagation();

      if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        if (insertEditableLineBreak()) {
          const editable = e.currentTarget;
          requestAnimationFrame(() => {
            setEditingText(getEditableTextContent(editable));
          });
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        closeInlineEditing(false);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        closeInlineEditing(true);
      }
    },
    [closeInlineEditing],
  );

  const fitToScreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const clientWidth = rect.width;
    const clientHeight = rect.height;

    if (clientWidth <= 0 || clientHeight <= 0) return;

    const paddingX = isMobileViewport ? 24 : 140;
    const paddingY = isMobileViewport ? bottomInset + 36 : 110;

    const usableWidth = Math.max(1, clientWidth - paddingX);
    const usableHeight = Math.max(1, clientHeight - paddingY);

    const scaleX = usableWidth / canvasSize.width;
    const scaleY = usableHeight / canvasSize.height;
    const fitZoom = Math.min(scaleX, scaleY) * 100;

    const rawFitZoom = Math.max(
      isMobileViewport ? MIN_ZOOM_PERCENT : 20,
      Math.min(Math.round(fitZoom), isMobileViewport ? 100 : 140),
    );
    const nextZoom = clampZoomPercent(rawFitZoom, isMobileViewport);

    fitZoomRef.current = nextZoom;
    onZoomChange(nextZoom);

    if (isMobileViewport) {
      setMobilePan((currentPan) => {
        if (!hasManualMobileTransformRef.current) {
          return getCenteredMobilePan(nextZoom);
        }
        return clampMobilePan(currentPan, nextZoom);
      });
    }
  }, [
    bottomInset,
    canvasSize.width,
    canvasSize.height,
    clampMobilePan,
    getCenteredMobilePan,
    isMobileViewport,
    onZoomChange,
  ]);

  useLayoutEffect(() => {
    const raf = requestAnimationFrame(() => {
      fitToScreen();
    });

    return () => cancelAnimationFrame(raf);
  }, [fitToScreen]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const rerun = () => {
      requestAnimationFrame(() => fitToScreen());
    };

    const observer = new ResizeObserver(() => {
      rerun();
    });

    observer.observe(el);
    window.addEventListener("resize", rerun);

    const vv = window.visualViewport;
    vv?.addEventListener("resize", rerun);
    vv?.addEventListener("scroll", rerun);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", rerun);
      vv?.removeEventListener("resize", rerun);
      vv?.removeEventListener("scroll", rerun);
    };
  }, [fitToScreen]);

  useEffect(() => {
    if (!isMobileViewport) return;

    setMobilePan((currentPan) => {
      if (!hasManualMobileTransformRef.current) {
        return getCenteredMobilePan(zoom);
      }
      return clampMobilePan(currentPan, zoom);
    });
  }, [clampMobilePan, getCenteredMobilePan, isMobileViewport, zoom]);

  useEffect(() => {
    const el = containerRef.current;
    if (!isMobileViewport || !el) return;

    const preventGesture = (event: Event) => {
      event.preventDefault();
    };

    const preventMultiTouch = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    };

    el.addEventListener("gesturestart", preventGesture, { passive: false } as AddEventListenerOptions);
    el.addEventListener("gesturechange", preventGesture, { passive: false } as AddEventListenerOptions);
    el.addEventListener("gestureend", preventGesture, { passive: false } as AddEventListenerOptions);
    el.addEventListener("touchmove", preventMultiTouch, { passive: false });

    return () => {
      el.removeEventListener("gesturestart", preventGesture as EventListener);
      el.removeEventListener("gesturechange", preventGesture as EventListener);
      el.removeEventListener("gestureend", preventGesture as EventListener);
      el.removeEventListener("touchmove", preventMultiTouch as EventListener);
    };
  }, [isMobileViewport]);

  const handleDrawMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawMode) return;

      const point = getDrawPoint(event.clientX, event.clientY);
      if (!point) return;

      event.preventDefault();
      event.stopPropagation();
      isDrawingRef.current = true;
      lastDrawPointRef.current = point;
      drawSegment(point, point);
    },
    [drawSegment, getDrawPoint, isDrawMode],
  );

  const handleDrawMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawMode || !isDrawingRef.current) return;

      const point = getDrawPoint(event.clientX, event.clientY);
      const previous = lastDrawPointRef.current;
      if (!point || !previous) return;

      event.preventDefault();
      event.stopPropagation();
      drawSegment(previous, point);
      lastDrawPointRef.current = point;
    },
    [drawSegment, getDrawPoint, isDrawMode],
  );

  const handleDrawMouseUp = useCallback(() => {
      if (!isDrawMode) return;

      isDrawingRef.current = false;
      lastDrawPointRef.current = null;
    },
    [isDrawMode],
  );

  const handleDrawTouchStart = useCallback(
    (event: React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawMode) return;

      const touch = event.touches[0];
      if (!touch) return;

      const point = getDrawPoint(touch.clientX, touch.clientY);
      if (!point) return;

      event.preventDefault();
      event.stopPropagation();
      isDrawingRef.current = true;
      lastDrawPointRef.current = point;
      drawSegment(point, point);
    },
    [drawSegment, getDrawPoint, isDrawMode],
  );

  const handleDrawTouchMove = useCallback(
    (event: React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawMode || !isDrawingRef.current) return;

      const touch = event.touches[0];
      const previous = lastDrawPointRef.current;
      if (!touch || !previous) return;

      const point = getDrawPoint(touch.clientX, touch.clientY);
      if (!point) return;

      event.preventDefault();
      event.stopPropagation();
      drawSegment(previous, point);
      lastDrawPointRef.current = point;
    },
    [drawSegment, getDrawPoint, isDrawMode],
  );

  const handleDrawTouchEnd = useCallback(
    (event: React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawMode) return;

      const shouldCommit = isMobileViewport && hasDrawingRef.current;

      event.preventDefault();
      event.stopPropagation();
      isDrawingRef.current = false;
      lastDrawPointRef.current = null;

      if (shouldCommit) {
        commitDrawing();
      }
    },
    [commitDrawing, isDrawMode, isMobileViewport],
  );

  const showTransparentPreview = canvasBackground === "transparent";
  const wrapperBackground =
    !showTransparentPreview && canvasBackground ? canvasBackground : "#ffffff";
  const stageAspectRatio =
    canvasSize.label === "Instagram Story"
      ? "9 / 16"
      : `${canvasSize.width} / ${canvasSize.height}`;

  const handleMobileViewportTouchStartCapture = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (!isMobileViewport || event.touches.length !== 2) return;

      const points = Array.from(event.touches).slice(0, 2).map((touch) => ({
        x: touch.clientX,
        y: touch.clientY,
      }));
      const midpoint = getRelativeViewportPoint({
        x: (points[0].x + points[1].x) / 2,
        y: (points[0].y + points[1].y) / 2,
      });

      if (!midpoint) return;

      const startDistance = Math.hypot(
        points[0].x - points[1].x,
        points[0].y - points[1].y,
      );

      if (startDistance <= 0) return;

      const startScale = zoom / 100;
      pinchSessionRef.current = {
        startDistance,
        startZoom: zoom,
        anchorPoint: {
          x: (midpoint.x - mobilePan.x) / Math.max(0.001, startScale),
          y: (midpoint.y - mobilePan.y) / Math.max(0.001, startScale),
        },
      };

      hasManualMobileTransformRef.current = true;
      stageRef.current?.stopDrag();
      event.preventDefault();
      event.stopPropagation();
    },
    [getRelativeViewportPoint, isMobileViewport, mobilePan.x, mobilePan.y, zoom],
  );

  const handleMobileViewportTouchMoveCapture = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (!isMobileViewport || event.touches.length < 2) return;

      const pinchSession = pinchSessionRef.current;
      if (!pinchSession) return;

      const points = Array.from(event.touches).slice(0, 2).map((touch) => ({
        x: touch.clientX,
        y: touch.clientY,
      }));
      const midpoint = getRelativeViewportPoint({
        x: (points[0].x + points[1].x) / 2,
        y: (points[0].y + points[1].y) / 2,
      });

      if (!midpoint) return;

      const distance = Math.hypot(
        points[0].x - points[1].x,
        points[0].y - points[1].y,
      );

      if (distance <= 0) return;

      const nextZoom = clampZoomPercent(
        pinchSession.startZoom * (distance / pinchSession.startDistance),
        true,
      );
      const nextScale = nextZoom / 100;
      const nextPan = {
        x: midpoint.x - pinchSession.anchorPoint.x * nextScale,
        y: midpoint.y - pinchSession.anchorPoint.y * nextScale,
      };

      stageRef.current?.stopDrag();
      syncMobileZoomTransform(nextZoom, nextPan, { manual: true });
      event.preventDefault();
      event.stopPropagation();
    },
    [getRelativeViewportPoint, isMobileViewport, syncMobileZoomTransform],
  );

  const handleMobileViewportTouchEndCapture = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (!isMobileViewport) return;

      if (pinchSessionRef.current && event.touches.length < 2) {
        pinchSessionRef.current = null;
        event.preventDefault();
        event.stopPropagation();
      }
    },
    [isMobileViewport],
  );

  const renderCanvasSurface = (surfaceTransform?: React.CSSProperties["transform"]) => (
    <div
      ref={stageWrapperRef}
      className="relative shrink-0 rounded-[2px]"
      style={{
        width: canvasSize.width * scale,
        height: canvasSize.height * scale,
        aspectRatio: stageAspectRatio,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        overflow: "hidden",
        background: wrapperBackground,
        touchAction: "none",
        willChange: "transform, width, height",
        backfaceVisibility: "hidden",
        transform: surfaceTransform,
      }}
    >
      {gridEnabled && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(15, 23, 42, 0.12) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(15, 23, 42, 0.12) 1px, transparent 1px)
            `,
            backgroundSize: `${GRID_SIZE * scale}px ${GRID_SIZE * scale}px`,
            zIndex: 1,
          }}
        />
      )}

      {showTransparentPreview && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(45deg, #d9d9d9 25%, transparent 25%),
              linear-gradient(-45deg, #d9d9d9 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #d9d9d9 75%),
              linear-gradient(-45deg, transparent 75%, #d9d9d9 75%)
            `,
            backgroundSize: "20px 20px",
            backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
          }}
        />
      )}

      {bleedEnabled && (
        <div
          className="absolute pointer-events-none border border-dashed"
          style={{
            top: 18 * scale,
            left: 18 * scale,
            right: 18 * scale,
            bottom: 18 * scale,
            borderColor: "rgba(255,0,0,0.28)",
          }}
        />
      )}

      <div
        ref={konvaContainerRef}
        className="absolute inset-0"
        style={{
          width: canvasSize.width * scale,
          height: canvasSize.height * scale,
          overflow: "hidden",
          touchAction: "none",
          userSelect: "none",
          willChange: "transform, width, height",
          backfaceVisibility: "hidden",
          transform: "translateZ(0)",
        }}
      />

      <canvas
        ref={drawingCanvasRef}
        className="absolute inset-0"
        style={{
          width: canvasSize.width * scale,
          height: canvasSize.height * scale,
          zIndex: 14,
          pointerEvents: isDrawMode ? "auto" : "none",
          touchAction: "none",
          cursor: drawSettings.tool === "eraser" ? "cell" : "crosshair",
        }}
        onMouseDown={handleDrawMouseDown}
        onMouseMove={handleDrawMouseMove}
        onMouseUp={handleDrawMouseUp}
        onMouseLeave={handleDrawMouseUp}
        onTouchStart={handleDrawTouchStart}
        onTouchMove={handleDrawTouchMove}
        onTouchEnd={handleDrawTouchEnd}
        onTouchCancel={handleDrawTouchEnd}
      />

      <LayerEffectOverlay
        elements={elements}
        scale={scale}
        editingLayerId={inlineEditor?.id}
        pulseProgress={pulseProgress}
        isMobile={isMobileViewport}
      />

      {inlineEditor && (
        <div
          ref={textInputRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleEditingChange}
          onBlur={handleEditingBlur}
          onKeyDown={handleEditingKeyDown}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          spellCheck={false}
          className="absolute overflow-hidden focus:outline-none"
          style={{
            left: inlineEditor.x,
            top: inlineEditor.y,
            width: inlineEditor.width,
            minHeight: inlineEditor.height,
            display: "block",
            boxSizing: "border-box",
            fontSize: `${inlineEditor.fontSize * scale}px`,
            fontFamily: inlineEditor.fontFamily,
            fontWeight: inlineEditor.fontWeight,
            fontStyle: inlineEditor.fontStyle,
            color: inlineEditor.color,
            lineHeight: String(inlineEditor.lineHeight),
            letterSpacing: `${inlineEditor.letterSpacing * scale}px`,
            textAlign: inlineEditor.textAlign,
            textTransform: inlineEditor.textTransform,
            background: "rgba(255, 255, 255, 0.98)",
            border: "1px solid #bfdbfe",
            borderRadius: 2,
            padding: `${Math.max(2, Math.round(scale * 2))}px ${Math.max(3, Math.round(scale * 6))}px`,
            margin: 0,
            outline: "none",
            boxShadow: "0 0 0 1px rgba(59, 130, 246, 0.08)",
            overflow: "hidden",
            zIndex: 24,
            userSelect: "text",
            WebkitUserSelect: "text",
            caretColor: inlineEditor.color || "#000000",
            transform: `rotate(${inlineEditor.rotation}deg)`,
            transformOrigin: "top left",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            pointerEvents: "auto",
          }}
        />
      )}
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="relative flex-1 h-full min-h-0 min-w-0 overflow-hidden"
      style={{
        backgroundColor: "#f7f7f8",
        backgroundImage: "radial-gradient(#d7d9dd 0.8px, transparent 0.8px)",
        backgroundSize: "18px 18px",
      }}
    >
      {isMobileViewport ? (
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ overscrollBehavior: "contain" }}
          onTouchStartCapture={handleMobileViewportTouchStartCapture}
          onTouchMoveCapture={handleMobileViewportTouchMoveCapture}
          onTouchEndCapture={handleMobileViewportTouchEndCapture}
          onTouchCancelCapture={handleMobileViewportTouchEndCapture}
        >
          {renderCanvasSurface(`translate3d(${mobilePan.x}px, ${mobilePan.y}px, 0)`)}
        </div>
      ) : (
        <div
          className="absolute inset-0 overflow-y-auto overflow-x-auto"
          style={{
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
          }}
        >
          <div
            className="min-w-full min-h-full flex items-start justify-center"
            style={{
              paddingLeft: 40,
              paddingRight: 40,
              paddingTop: 56,
              paddingBottom: 40,
            }}
          >
            {renderCanvasSurface("translateZ(0)")}
          </div>
        </div>
      )}

      {!isMobileViewport && (
        <div className="absolute bottom-4 right-4 flex flex-col overflow-hidden rounded-xl border border-[#d9dde3] bg-white shadow-sm">
          <div className="px-3 pt-3 pb-2 text-[11px] font-semibold text-[#6b7280] tabular-nums">
            {zoom}%
          </div>
          <button
            onClick={() => onZoomChange(clampZoomPercent(zoom + 10, false))}
            className="flex h-9 w-10 items-center justify-center text-[#667085] hover:bg-[#f5f7fa]"
          >
            <ZoomIn size={16} strokeWidth={1.6} />
          </button>
          <button
            onClick={() => onZoomChange(clampZoomPercent(zoom - 10, false))}
            className="flex h-9 w-10 items-center justify-center text-[#667085] hover:bg-[#f5f7fa]"
          >
            <ZoomOut size={16} strokeWidth={1.6} />
          </button>
        </div>
      )}
    </div>
  );
};

function areCanvasStagePropsEqual(prev: CanvasStageProps, next: CanvasStageProps) {
  return (
    prev.elements === next.elements &&
    prev.selectedElementIds.length === next.selectedElementIds.length &&
    prev.selectedElementIds.every((id, index) => id === next.selectedElementIds[index]) &&
    prev.onSelectElement === next.onSelectElement &&
    prev.onUpdateElement === next.onUpdateElement &&
    prev.onPreviewElement === next.onPreviewElement &&
    prev.onClearPreviewElement === next.onClearPreviewElement &&
    prev.autoEditElementId === next.autoEditElementId &&
    prev.onAutoEditHandled === next.onAutoEditHandled &&
    prev.zoom === next.zoom &&
    prev.onZoomChange === next.onZoomChange &&
    prev.canvasSize.width === next.canvasSize.width &&
    prev.canvasSize.height === next.canvasSize.height &&
    prev.canvasSize.label === next.canvasSize.label &&
    prev.canvasBackground === next.canvasBackground &&
    prev.gridEnabled === next.gridEnabled &&
    prev.alignmentGuides === next.alignmentGuides &&
    prev.bleedEnabled === next.bleedEnabled &&
    prev.isMobileViewport === next.isMobileViewport &&
    prev.bottomInset === next.bottomInset &&
    prev.activeTool === next.activeTool &&
    prev.drawSettings === next.drawSettings &&
    prev.finishDrawingRequest === next.finishDrawingRequest &&
    prev.onDrawingCommitted === next.onDrawingCommitted
  );
}

export const CanvasStage = React.memo(CanvasStageComponent, areCanvasStagePropsEqual);

function createKonvaShape(element: CanvasElement): Konva.Node | null {
  try {
    const renderable = getRenderableLayer(element);
    const useDomOverlay = shouldUseDomEffectOverlay(element);
    const textContent =
      renderable.type === "text" && renderable.textTransform === "uppercase"
        ? (renderable.content || "").toUpperCase()
        : renderable.content || "";
    const baseConfig = {
      id: renderable.id,
      x: renderable.x,
      y: renderable.y,
      rotation: renderable.rotation || 0,
      opacity:
        renderable.opacity != null
          ? (useDomOverlay ? 0.01 : renderable.opacity / 100)
          : 1,
      scaleX: renderable.scale ?? 1,
      scaleY: renderable.scale ?? 1,
      draggable: !renderable.locked,
    };

    if (renderable.type === "text") {
      const effect = renderable.effectProps;
      const fontSize = renderable.fontSize || 24;
      const singleLine = !textContent.includes("\n");
      const intrinsicWidth = singleLine
        ? measureSingleLineTextWidth(renderable, textContent || " ", fontSize)
        : renderable.width;
      const effectiveWidth = singleLine
        ? Math.max(24, intrinsicWidth + 8, renderable.width || 0)
        : renderable.width;
      const measured = measureTextBox(
        renderable,
        effectiveWidth,
        fontSize,
      );
      const textNodeHeight = Math.max(renderable.height || 0, measured.height);
      const usesGlow = effect?.preset === "neon-glow" || effect?.preset === "pulse";
      const usesShadow = usesGlow || effect?.preset === "drop-shadow" || (effect?.shadowBlur ?? 0) > 0;
      const shadowColor = usesGlow
        ? effect?.glowColor || "#38bdf8"
        : effect?.shadowColor || "#0f172a";
      const shadowBlur = usesGlow
        ? Math.max(4, effect?.glowIntensity ?? 18)
        : Math.max(0, effect?.shadowBlur ?? 0);
      const shadowOffsetX = usesGlow ? 0 : effect?.shadowOffsetX ?? 0;
      const shadowOffsetY = usesGlow ? 0 : effect?.shadowOffsetY ?? 0;
      const shadowOpacity = usesGlow ? 1 : effect?.shadowOpacity ?? 0.28;

      return new Konva.Text({
        ...baseConfig,
        listening: true,
        name: "selectable-text",
        width: effectiveWidth,
        height: textNodeHeight,
        text: textContent,
        fontSize,
        fontFamily: renderable.fontFamily || "sans-serif",
        fontStyle: mapFontStyleToKonva(renderable.fontWeight, renderable.fontStyle),
        fill: renderable.color || "#000000",
        align: renderable.textAlign || "center",
        verticalAlign: renderable.textVerticalAlign || "top",
        lineHeight: renderable.lineHeight || 1.2,
        letterSpacing: renderable.letterSpacing || 0,
        textDecoration:
          renderable.textDecoration && renderable.textDecoration !== "none"
            ? renderable.textDecoration
            : undefined,
        stroke:
          (effect?.strokeWidth ?? 0) > 0
            ? effect?.strokeColor || "#ffffff"
            : undefined,
        strokeWidth: effect?.strokeWidth ?? 0,
        shadowColor: usesShadow ? shadowColor : undefined,
        shadowBlur: usesShadow ? shadowBlur : 0,
        shadowOffsetX,
        shadowOffsetY,
        shadowOpacity: usesShadow ? shadowOpacity : 0,
        wrap: "word",
        hitFunc: (context, shape) => {
          context.beginPath();
          context.rect(0, 0, effectiveWidth, textNodeHeight);
          context.closePath();
          context.fillStrokeShape(shape);
        },
      });
    }

    if (renderable.type === "shape") {
      if (renderable.shapeType === "circle") {
        return new Konva.Circle({
          ...baseConfig,
          x: renderable.x + renderable.width / 2,
          y: renderable.y + renderable.height / 2,
          radius: Math.min(renderable.width, renderable.height) / 2,
          fill: renderable.backgroundColor || "#4488FF",
          stroke: renderable.borderColor || "transparent",
          strokeWidth: renderable.borderWidth || 0,
        });
      }

      if (renderable.shapeType === "triangle") {
        return new Konva.Line({
          ...baseConfig,
          points: [
            renderable.width / 2,
            0,
            renderable.width,
            renderable.height,
            0,
            renderable.height,
          ],
          closed: true,
          fill: renderable.backgroundColor || "#4488FF",
          stroke: renderable.borderColor || "transparent",
          strokeWidth: renderable.borderWidth || 0,
        });
      }

      if (renderable.shapeType === "line") {
        return new Konva.Line({
          ...baseConfig,
          points: [0, renderable.height / 2, renderable.width, renderable.height / 2],
          stroke: renderable.backgroundColor || "#000000",
          strokeWidth: renderable.borderWidth || 2,
        });
      }

      return new Konva.Rect({
        ...baseConfig,
        width: renderable.width,
        height: renderable.height,
        fill: renderable.backgroundColor || "#4488FF",
        stroke: renderable.borderColor || "transparent",
        strokeWidth: renderable.borderWidth || 0,
        cornerRadius: renderable.borderRadius || 0,
      });
    }

    if (renderable.type === "image" && renderable.src) {
      const img = getImageAsset(renderable.src);
      const imageNode = new Konva.Image({
        ...baseConfig,
        width: renderable.width,
        height: renderable.height,
        image: img,
      });

      const applyCrop = () => {
        applyMediaNodeCrop(imageNode, renderable.width, renderable.height);
        imageNode.getLayer()?.batchDraw();
      };

      if ((img.naturalWidth || img.width) && (img.naturalHeight || img.height)) {
        applyCrop();
      } else {
        img.addEventListener("load", applyCrop, { once: true });
      }

      return imageNode;
    }

    if (renderable.type === "table") {
      const group = new Konva.Group({
        ...baseConfig,
        width: renderable.width,
        height: renderable.height,
      });

      const rows = renderable.rows || 3;
      const cols = renderable.cols || 3;
      const cellWidth = renderable.width / cols;
      const cellHeight = renderable.height / rows;

      for (let i = 0; i <= rows; i++) {
        group.add(
          new Konva.Line({
            points: [0, i * cellHeight, renderable.width, i * cellHeight],
            stroke: renderable.borderColor || "#000",
            strokeWidth: renderable.borderWidth || 1,
          }),
        );
      }

      for (let i = 0; i <= cols; i++) {
        group.add(
          new Konva.Line({
            points: [i * cellWidth, 0, i * cellWidth, renderable.height],
            stroke: renderable.borderColor || "#000",
            strokeWidth: renderable.borderWidth || 1,
          }),
        );
      }

      if (renderable.tableData) {
        renderable.tableData.forEach((row, rowIndex) => {
          row.forEach((cell, colIndex) => {
            group.add(
              new Konva.Text({
                x: colIndex * cellWidth,
                y: rowIndex * cellHeight,
                width: cellWidth,
                height: cellHeight,
                text: cell || "",
                fontSize: renderable.fontSize || 14,
                fontFamily: renderable.fontFamily || "sans-serif",
                fill: renderable.color || "#000000",
                align: "center",
                verticalAlign: "middle",
              }),
            );
          });
        });
      }

      return group;
    }

    if (renderable.type === "video" && renderable.src) {
      const video = getVideoAsset(renderable.src);
      const videoNode = new Konva.Image({
        ...baseConfig,
        width: renderable.width,
        height: renderable.height,
        image: video,
      });

      const applyCrop = () => {
        applyMediaNodeCrop(videoNode, renderable.width, renderable.height);
        videoNode.getLayer()?.batchDraw();
      };

      const drawFrame = () => {
        videoNode.getLayer()?.batchDraw();
        if (!video.paused && !video.ended) {
          requestAnimationFrame(drawFrame);
        }
      };

      const startPlayback = () => {
        applyCrop();
        video.play().then(() => {
          requestAnimationFrame(drawFrame);
        }).catch(() => {
          videoNode.getLayer()?.batchDraw();
        });
      };

      if (video.readyState >= 1) {
        startPlayback();
      } else {
        video.addEventListener("loadedmetadata", startPlayback, { once: true });
      }

      return videoNode;
    }

    return null;
  } catch (error) {
    console.error("Error creating Konva shape:", error);
    return null;
  }
}

function createCanvasBackgroundNode(
  canvasBackground: string,
  width: number,
  height: number,
): Konva.Rect | null {
  if (!canvasBackground || canvasBackground === "transparent") {
    return null;
  }

  const linearGradient = parseSharedLinearGradient(canvasBackground);
  if (linearGradient) {
    const { start, end } = getSharedLinearGradientPoints(linearGradient.angleDeg, width, height);
    return new Konva.Rect({
      x: 0,
      y: 0,
      width,
      height,
      listening: false,
      draggable: false,
      fillPriority: "linear-gradient",
      fillLinearGradientStartPoint: start,
      fillLinearGradientEndPoint: end,
      fillLinearGradientColorStops: linearGradient.colorStops.flatMap((stop) => [
        stop.offset,
        stop.color,
      ]),
      name: "canvas-background",
    });
  }

  const radialGradient = parseRadialGradient(canvasBackground);
  if (radialGradient) {
    const geometry = getRadialGradientGeometry(radialGradient, width, height);

    return new Konva.Rect({
      x: 0,
      y: 0,
      width,
      height,
      listening: false,
      draggable: false,
      fillPriority: "radial-gradient",
      fillRadialGradientStartPoint: geometry.startPoint,
      fillRadialGradientStartRadius: geometry.startRadius,
      fillRadialGradientEndPoint: geometry.endPoint,
      fillRadialGradientEndRadius: geometry.endRadius,
      fillRadialGradientColorStops: radialGradient.colorStops.flatMap((stop) => [
        stop.offset,
        stop.color,
      ]),
      name: "canvas-background",
    });
  }

  return new Konva.Rect({
    x: 0,
    y: 0,
    width,
    height,
    fill: canvasBackground,
    listening: false,
    draggable: false,
    name: "canvas-background",
  });
}

function drawGrid(
  layer: Konva.Layer,
  width: number,
  height: number,
  gridSize: number = GRID_SIZE,
) {
  for (let x = 0; x <= width; x += gridSize) {
    const isMajor = x % (gridSize * GRID_MAJOR_EVERY) === 0;

    layer.add(
      new Konva.Line({
        points: [x, 0, x, height],
        stroke: isMajor ? GRID_MAJOR_COLOR : GRID_MINOR_COLOR,
        strokeWidth: isMajor ? 1.2 : 1,
        listening: false,
      }),
    );
  }

  for (let y = 0; y <= height; y += gridSize) {
    const isMajor = y % (gridSize * GRID_MAJOR_EVERY) === 0;

    layer.add(
      new Konva.Line({
        points: [0, y, width, y],
        stroke: isMajor ? GRID_MAJOR_COLOR : GRID_MINOR_COLOR,
        strokeWidth: isMajor ? 1.2 : 1,
        listening: false,
      }),
    );
  }
}

function isProbablyColor(value: string): boolean {
  const v = value.trim().toLowerCase();

  return (
    v.startsWith("#") ||
    v.startsWith("rgb(") ||
    v.startsWith("rgba(") ||
    v.startsWith("hsl(") ||
    v.startsWith("hsla(") ||
    /^[a-z]+$/.test(v)
  );
}

function parseLinearGradient(input: string): ParsedLinearGradient | null {
  const value = input.trim();
  if (
    !value.toLowerCase().startsWith("linear-gradient(") ||
    !value.endsWith(")")
  ) {
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
    .filter((stop): stop is { color: string; offset?: number } =>
      Boolean(stop),
    );

  if (rawStops.length < 2) return null;

  const normalizedStops = normalizeGradientStops(rawStops);
  return {
    angleDeg,
    colorStops: normalizedStops,
  };
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
    const n = parseFloat(v.replace("deg", "").trim());
    return Number.isFinite(n) ? n : 180;
  }

  if (v.startsWith("to ")) {
    const dir = v.slice(3).trim();

    if (dir === "top") return 0;
    if (dir === "top right" || dir === "right top") return 45;
    if (dir === "right") return 90;
    if (dir === "bottom right" || dir === "right bottom") return 135;
    if (dir === "bottom") return 180;
    if (dir === "bottom left" || dir === "left bottom") return 225;
    if (dir === "left") return 270;
    if (dir === "top left" || dir === "left top") return 315;
  }

  return 180;
}

function parseGradientStop(
  part: string,
): { color: string; offset?: number } | null {
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
  if (result[result.length - 1].offset == null) {
    result[result.length - 1].offset = 1;
  }

  let i = 0;
  while (i < result.length) {
    if (result[i].offset != null) {
      i += 1;
      continue;
    }

    const startIndex = i - 1;
    let endIndex = i;
    while (endIndex < result.length && result[endIndex].offset == null) {
      endIndex += 1;
    }

    const startOffset = result[startIndex]?.offset ?? 0;
    const endOffset = result[endIndex]?.offset ?? 1;
    const gap = endIndex - startIndex;

    for (let j = 1; j < gap; j += 1) {
      const t = j / gap;
      result[startIndex + j].offset =
        startOffset + (endOffset - startOffset) * t;
    }

    i = endIndex + 1;
  }

  return result.map((stop) => ({
    color: stop.color,
    offset: clamp(stop.offset ?? 0, 0, 1),
  }));
}

function getGradientPoints(
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
    start: {
      x: cx - dx * halfLen,
      y: cy - dy * halfLen,
    },
    end: {
      x: cx + dx * halfLen,
      y: cy + dy * halfLen,
    },
  };
}

function mapFontStyleToKonva(
  fontWeight?: string,
  fontStyle?: "normal" | "italic",
): string {
  const isItalic = fontStyle === "italic";
  if (!fontWeight) return isItalic ? "italic" : "normal";

  const value = String(fontWeight).toLowerCase();

  if (value === "bold") return isItalic ? "bold italic" : "bold";
  if (value === "italic") return "italic";
  if (value === "bold italic") return "bold italic";

  const numeric = Number(value);
  if (!Number.isNaN(numeric)) {
    if (numeric >= 600) {
      return isItalic ? "bold italic" : "bold";
    }

    return isItalic ? "italic" : "normal";
  }

  return isItalic ? "italic" : "normal";
}

function getVideoCoverCrop(video: HTMLVideoElement, width: number, height: number) {
  const sourceWidth = video.videoWidth || 0;
  const sourceHeight = video.videoHeight || 0;

  if (!sourceWidth || !sourceHeight || width <= 0 || height <= 0) {
    return undefined;
  }

  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = width / height;

  if (sourceRatio > targetRatio) {
    const cropWidth = sourceHeight * targetRatio;
    return {
      x: (sourceWidth - cropWidth) / 2,
      y: 0,
      width: cropWidth,
      height: sourceHeight,
    };
  }

  const cropHeight = sourceWidth / targetRatio;
  return {
    x: 0,
    y: (sourceHeight - cropHeight) / 2,
    width: sourceWidth,
    height: cropHeight,
  };
}