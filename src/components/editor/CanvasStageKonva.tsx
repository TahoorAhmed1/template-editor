import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
} from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import Konva from "konva";
import type { CanvasElement } from "./EditorShell";
import { LayerEffectOverlay } from "./LayerEffectOverlay";
import { shouldUseDomEffectOverlay } from "./layerEffectUtils";

const konvaWithTextFix = Konva as typeof Konva & {
  _fixTextRendering?: boolean;
};

konvaWithTextFix._fixTextRendering = true;

interface CanvasStageProps {
  elements: CanvasElement[];
  selectedElementIds: string[];
  onSelectElement: (id: string | null, shiftKey?: boolean) => void;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  canvasSize: { width: number; height: number; label: string };
  canvasBackground: string;
  gridEnabled?: boolean;
  alignmentGuides?: boolean;
  bleedEnabled?: boolean;
  isMobileViewport?: boolean;
  bottomInset?: number;
}

type InlineEditorState = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  rotation: number;
  fontFamily: string;
  fontWeight: string;
  fontStyle: "normal" | "italic";
  color: string;
  lineHeight: number;
  textAlign: "left" | "center" | "right" | "justify";
  textTransform: "none" | "uppercase";
};

type ParsedLinearGradient = {
  angleDeg: number;
  colorStops: Array<{ color: string; offset: number }>;
};

const GRID_SIZE = 50;
const GRID_MINOR_COLOR = "rgba(15, 23, 42, 0.14)";
const GRID_MAJOR_COLOR = "rgba(15, 23, 42, 0.24)";
const GRID_MAJOR_EVERY = 5;
const GUIDE_COLOR = "rgba(37, 99, 235, 0.9)";
const GUIDE_SNAP_THRESHOLD = 6;

type GuideBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function snap(value: number, size: number) {
  return Math.round(value / size) * size;
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
  const position = node.position();
  const scaleX = Math.abs(node.scaleX?.() ?? 1);
  const scaleY = Math.abs(node.scaleY?.() ?? 1);
  const width =
    node instanceof Konva.Group ? node.width() : (node.width?.() ?? fallbackWidth) * scaleX;
  const height =
    node instanceof Konva.Group ? node.height() : (node.height?.() ?? fallbackHeight) * scaleY;

  return {
    x: position.x,
    y: position.y,
    width: Math.max(1, width || fallbackWidth),
    height: Math.max(1, height || fallbackHeight),
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

export const CanvasStage: React.FC<CanvasStageProps> = ({
  elements,
  selectedElementIds,
  onSelectElement,
  onUpdateElement,
  zoom,
  onZoomChange,
  canvasSize,
  canvasBackground,
  gridEnabled = false,
  alignmentGuides = true,
  bleedEnabled,
  isMobileViewport = false,
  bottomInset = 96,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageWrapperRef = useRef<HTMLDivElement>(null);
  const konvaContainerRef = useRef<HTMLDivElement>(null);

  const stageRef = useRef<Konva.Stage | null>(null);
  const layerRef = useRef<Konva.Layer | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const gridLayerRef = useRef<Konva.Layer | null>(null);
  const guideLayerRef = useRef<Konva.Layer | null>(null);
  const shapeRefs = useRef<Map<string, Konva.Node>>(new Map());
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const inlineEditorRef = useRef<InlineEditorState | null>(null);
  const editingTextRef = useRef("");
  const isClosingRef = useRef(false);
  const closeInlineEditingRef = useRef<(save: boolean) => void>(() => {});

  const [inlineEditor, setInlineEditor] = useState<InlineEditorState | null>(
    null,
  );
  const [editingText, setEditingText] = useState("");
  const [pulseProgress, setPulseProgress] = useState(0);

  const scale = zoom / 100;
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
        node.width() * Math.abs(node.scaleX()) * scale,
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
        fontSize: element.fontSize || 24,
        rotation: node.rotation() || 0,
        fontFamily: element.fontFamily || "sans-serif",
        fontWeight: element.fontWeight || "normal",
        fontStyle: element.fontStyle || "normal",
        color: element.color || "#000000",
        lineHeight: element.lineHeight || 1.2,
        textAlign: element.textAlign || "left",
        textTransform: element.textTransform || "none",
      };
    },
    [scale],
  );

  const syncInlineEditorSize = useCallback(
    (editor: InlineEditorState, textarea: HTMLTextAreaElement) => {
      textarea.style.width = "auto";
      textarea.style.height = "auto";

      const nextWidth = Math.max(editor.width, textarea.scrollWidth + 2);
      const nextHeight = Math.max(editor.height, textarea.scrollHeight);

      textarea.style.width = `${nextWidth}px`;
      textarea.style.height = `${nextHeight}px`;

      return {
        width: nextWidth,
        height: nextHeight,
      };
    },
    [],
  );

  const startInlineEditing = useCallback(
    (element: CanvasElement, node: Konva.Text) => {
      // If already editing, commit current edit first
      if (inlineEditorRef.current && !isClosingRef.current) {
        isClosingRef.current = true;
        const prevId = inlineEditorRef.current.id;
        const prevTextarea = textInputRef.current;
        const prevText = prevTextarea?.value ?? editingTextRef.current;
        const prevNode = shapeRefs.current.get(prevId);
        if (prevNode instanceof Konva.Text) prevNode.show();
        onUpdateElement(prevId, { content: prevText });
        isClosingRef.current = false;
      }

      node.hide();
      layerRef.current?.draw();

      const nextEditingText = element.content || "";
      const nextInlineEditor = getInlineEditorState(element, node);

      editingTextRef.current = nextEditingText;
      inlineEditorRef.current = nextInlineEditor;
      setEditingText(nextEditingText);
      setInlineEditor(nextInlineEditor);
      onSelectElement(element.id);
    },
    [getInlineEditorState, onSelectElement, onUpdateElement],
  );

  const closeInlineEditing = useCallback(
    (save: boolean) => {
      if (isClosingRef.current) return;
      const currentInlineEditor = inlineEditorRef.current;
      if (!currentInlineEditor) return;

      isClosingRef.current = true;
      inlineEditorRef.current = null;

      const textarea = textInputRef.current;
      const nextText = textarea?.value ?? editingTextRef.current;
      const nextSize =
        textarea != null
          ? syncInlineEditorSize(currentInlineEditor, textarea)
          : {
              width: currentInlineEditor.width,
              height: currentInlineEditor.height,
            };

      // Show the Konva text node immediately so it's visible before React re-renders
      const node = shapeRefs.current.get(currentInlineEditor.id);
      if (node instanceof Konva.Text) {
        node.show();
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
      boundBoxFunc: (oldBox, newBox) => {
        if (newBox.width < 20 || newBox.height < 20) {
          return oldBox;
        }
        return newBox;
      },
    });

    layer.add(transformer);

    stageRef.current = stage;
    gridLayerRef.current = gridLayer;
    layerRef.current = layer;
    transformerRef.current = transformer;
    guideLayerRef.current = guideLayer;

    stage.on(
      "click tap",
      (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        if (e.target === stage) {
          clearAlignmentGuides();
          onSelectElement(null);
        }
      },
    );

    return () => {
      stage.destroy();
      stageRef.current = null;
      gridLayerRef.current = null;
      layerRef.current = null;
      transformerRef.current = null;
      guideLayerRef.current = null;
      currentShapeRefs.clear();
    };
  }, [canvasSize.width, canvasSize.height, clearAlignmentGuides, onSelectElement, scale]);

  useEffect(() => {
    syncStageScale();
  }, [syncStageScale]);

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
      .forEach((element) => {
      const shape = createKonvaShape(element);
      if (!shape) return;

      layer.add(shape as Konva.Shape | Konva.Group);
      shapeRefs.current.set(element.id, shape);

      shape.on(
        "click tap",
        (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
          e.cancelBubble = true;

          if (element.type === "text" && shape instanceof Konva.Text) {
            const alreadyOnlySelected =
              selectedElementIds.length === 1 &&
              selectedElementIds[0] === element.id;

            if (alreadyOnlySelected) {
              startInlineEditing(element, shape);
              return;
            }
          }

          onSelectElement(element.id, Boolean((e.evt as MouseEvent)?.shiftKey));
        },
      );

      if (element.type === "text" && shape instanceof Konva.Text) {
        shape.on("dblclick dbltap", () => {
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

      shape.on("transformend", () => {
        clearAlignmentGuides();
        const pos = shape.position();
        const motion = getActiveAnimationState(element);

        let nextX = pos.x - motion.x;
        let nextY = pos.y - motion.y;
        let nextWidth: number;
        let nextHeight: number;

        if (shape instanceof Konva.Group) {
          nextWidth = shape.width();
          nextHeight = shape.height();
        } else {
          nextWidth = (shape.width() || 0) * (shape.scaleX?.() || 1);
          nextHeight = (shape.height() || 0) * (shape.scaleY?.() || 1);
          shape.scaleX(1);
          shape.scaleY(1);
        }

        if (gridEnabled) {
          nextX = snap(nextX, GRID_SIZE);
          nextY = snap(nextY, GRID_SIZE);
          nextWidth = Math.max(GRID_SIZE, snap(nextWidth, GRID_SIZE));
          nextHeight = Math.max(GRID_SIZE, snap(nextHeight, GRID_SIZE));
          shape.position({ x: nextX, y: nextY });
        }

        onUpdateElement(element.id, {
          x: Math.round(nextX),
          y: Math.round(nextY),
          width: Math.round(nextWidth),
          height: Math.round(nextHeight),
          rotation: Math.round(shape.rotation() || 0),
        });

        if (inlineEditor?.id === element.id && shape instanceof Konva.Text) {
          setInlineEditor(getInlineEditorState(element, shape));
        }
      });

      if (inlineEditor?.id === element.id && shape instanceof Konva.Text) {
        shape.hide();
      }
    });

    if (selectedElementIds.length > 0) {
      const selectedNodes = selectedElementIds
        .map((id) => shapeRefs.current.get(id))
        .filter(Boolean) as Konva.Node[];

      if (transformer && selectedNodes.length > 0) {
        transformer.nodes(selectedNodes);
      } else {
        transformer.nodes([]);
      }
    } else {
      transformer.nodes([]);
    }

    layer.draw();
  }, [
    canvasSize,
    clearAlignmentGuides,
    drawAlignmentGuides,
    elements,
    selectedElementIds,
    inlineEditor?.id,
    onSelectElement,
    onUpdateElement,
    startInlineEditing,
    getInlineEditorState,
    alignmentGuides,
    gridEnabled,
  ]);

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

  useEffect(() => {
    if (!inlineEditor || !textInputRef.current) return;

    const textarea = textInputRef.current;
    textarea.focus();

    const len = textarea.value.length;
    textarea.setSelectionRange(len, len);

    const nextSize = syncInlineEditorSize(inlineEditor, textarea);
    if (
      nextSize.width !== inlineEditor.width ||
      nextSize.height !== inlineEditor.height
    ) {
      const updated = {
        ...inlineEditor,
        width: nextSize.width,
        height: nextSize.height,
      };
      inlineEditorRef.current = updated;
      setInlineEditor(updated);
    }
  }, [inlineEditor, syncInlineEditorSize]);

  useEffect(() => {
    if (!inlineEditor || !textInputRef.current) return;

    const textarea = textInputRef.current;
    const nextSize = syncInlineEditorSize(inlineEditor, textarea);
    if (
      nextSize.width !== inlineEditor.width ||
      nextSize.height !== inlineEditor.height
    ) {
      const updated = {
        ...inlineEditor,
        width: nextSize.width,
        height: nextSize.height,
      };
      inlineEditorRef.current = updated;
      setInlineEditor(updated);
    }
  }, [editingText, inlineEditor, syncInlineEditorSize]);

  const handleEditingChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setEditingText(e.target.value);
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
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      e.stopPropagation();

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

    const nextZoom = Math.max(
      isMobileViewport ? 10 : 20,
      Math.min(Math.round(fitZoom), isMobileViewport ? 100 : 140),
    );

    onZoomChange(nextZoom);
  }, [bottomInset, canvasSize.width, canvasSize.height, isMobileViewport, onZoomChange]);

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

  const showTransparentPreview = canvasBackground === "transparent";
  const wrapperBackground =
    !showTransparentPreview && canvasBackground ? canvasBackground : "#ffffff";
  const stageAspectRatio =
    canvasSize.label === "Instagram Story"
      ? "9 / 16"
      : `${canvasSize.width} / ${canvasSize.height}`;

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
            paddingLeft: isMobileViewport ? 8 : 40,
            paddingRight: isMobileViewport ? 8 : 40,
            paddingTop: isMobileViewport ? 8 : 56,
            paddingBottom: isMobileViewport ? bottomInset : 40,
          }}
        >
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
              willChange: "transform, filter",
              transform: "translateZ(0)",
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
                willChange: "transform, filter",
                transform: "translateZ(0)",
              }}
            />

            <LayerEffectOverlay
              elements={elements}
              scale={scale}
              editingLayerId={inlineEditor?.id}
              pulseProgress={pulseProgress}
              isMobile={isMobileViewport}
            />

            {inlineEditor && (
              <textarea
                ref={textInputRef}
                value={editingText}
                onChange={handleEditingChange}
                onBlur={handleEditingBlur}
                onKeyDown={handleEditingKeyDown}
                onPointerDown={(e) => e.stopPropagation()}
                spellCheck={false}
                className="absolute resize-none overflow-hidden focus:outline-none"
                style={{
                  left: inlineEditor.x,
                  top: inlineEditor.y,
                  width: inlineEditor.width,
                  minHeight: inlineEditor.height,
                  fontSize: `${inlineEditor.fontSize * scale}px`,
                  fontFamily: inlineEditor.fontFamily,
                  fontWeight: inlineEditor.fontWeight,
                  fontStyle: inlineEditor.fontStyle,
                  color: inlineEditor.color,
                  lineHeight: String(inlineEditor.lineHeight),
                  textAlign: inlineEditor.textAlign,
                  textTransform: inlineEditor.textTransform,
                  background: "transparent",
                  border: "none",
                  borderRadius: 0,
                  padding: 0,
                  margin: 0,
                  outline: "none",
                  boxShadow: "none",
                  overflow: "hidden",
                  zIndex: 20,
                  transform: `rotate(${inlineEditor.rotation}deg)`,
                  transformOrigin: "top left",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              />
            )}
          </div>
        </div>
      </div>

      {!isMobileViewport && (
        <div className="absolute bottom-4 right-4 flex flex-col overflow-hidden rounded-xl border border-[#d9dde3] bg-white shadow-sm">
          <div className="px-3 pt-3 pb-2 text-[11px] font-semibold text-[#6b7280] tabular-nums">
            {zoom}%
          </div>
          <button
            onClick={() => onZoomChange(Math.min(200, zoom + 10))}
            className="flex h-9 w-10 items-center justify-center text-[#667085] hover:bg-[#f5f7fa]"
          >
            <ZoomIn size={16} strokeWidth={1.6} />
          </button>
          <button
            onClick={() => onZoomChange(Math.max(10, zoom - 10))}
            className="flex h-9 w-10 items-center justify-center text-[#667085] hover:bg-[#f5f7fa]"
          >
            <ZoomOut size={16} strokeWidth={1.6} />
          </button>
        </div>
      )}
    </div>
  );
};

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
      draggable: true,
    };

    if (renderable.type === "text") {
      return new Konva.Text({
        ...baseConfig,
        width: renderable.width,
        height: renderable.height,
        text: textContent,
        fontSize: renderable.fontSize || 24,
        fontFamily: renderable.fontFamily || "sans-serif",
        fontStyle: mapFontStyleToKonva(renderable.fontWeight, renderable.fontStyle),
        fill: renderable.color || "#000000",
        align: renderable.textAlign || "center",
        verticalAlign: renderable.textVerticalAlign || "middle",
        lineHeight: renderable.lineHeight || 1.2,
        letterSpacing: renderable.letterSpacing || 0,
        textDecoration:
          renderable.textDecoration && renderable.textDecoration !== "none"
            ? renderable.textDecoration
            : undefined,
        wrap: "word",
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
      const img = new window.Image();
      img.src = renderable.src;

      return new Konva.Image({
        ...baseConfig,
        width: renderable.width,
        height: renderable.height,
        image: img,
      });
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

    if (renderable.type === "video") {
      const group = new Konva.Group({
        ...baseConfig,
        width: renderable.width,
        height: renderable.height,
      });

      group.add(
        new Konva.Rect({
          x: 0,
          y: 0,
          width: renderable.width,
          height: renderable.height,
          fill: "#1a1a1a",
        }),
      );

      group.add(
        new Konva.Text({
          x: 0,
          y: renderable.height / 2 - 20,
          width: renderable.width,
          text: "VIDEO",
          fontSize: 24,
          fontFamily: "Arial",
          fill: "#ffffff",
          align: "center",
        }),
      );

      group.add(
        new Konva.Text({
          x: 0,
          y: renderable.height / 2 + 10,
          width: renderable.width,
          text: `${renderable.duration || 0}s`,
          fontSize: 14,
          fontFamily: "Arial",
          fill: "#999999",
          align: "center",
        }),
      );

      return group;
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

  const gradient = parseLinearGradient(canvasBackground);
  if (gradient) {
    const { start, end } = getGradientPoints(gradient.angleDeg, width, height);
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
      fillLinearGradientColorStops: gradient.colorStops.flatMap((stop) => [
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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