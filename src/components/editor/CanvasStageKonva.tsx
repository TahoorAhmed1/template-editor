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
  color: string;
  lineHeight: number;
  textAlign: "left" | "center" | "right";
};

type ParsedLinearGradient = {
  angleDeg: number;
  colorStops: Array<{ color: string; offset: number }>;
};

const GRID_SIZE = 50;
const GRID_MINOR_COLOR = "rgba(15, 23, 42, 0.14)";
const GRID_MAJOR_COLOR = "rgba(15, 23, 42, 0.24)";
const GRID_MAJOR_EVERY = 5;

function snap(value: number, size: number) {
  return Math.round(value / size) * size;
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
  bleedEnabled,
  isMobileViewport = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageWrapperRef = useRef<HTMLDivElement>(null);
  const konvaContainerRef = useRef<HTMLDivElement>(null);

  const stageRef = useRef<Konva.Stage | null>(null);
  const layerRef = useRef<Konva.Layer | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const gridLayerRef = useRef<Konva.Layer | null>(null);
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

  const scale = zoom / 100;

  const syncStageScale = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;

    stage.width(canvasSize.width);
    stage.height(canvasSize.height);
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
        color: element.color || "#000000",
        lineHeight: element.lineHeight || 1.2,
        textAlign: element.textAlign || "left",
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
    closeInlineEditingRef.current = closeInlineEditing;
  }, [closeInlineEditing]);

  useEffect(() => {
    if (!konvaContainerRef.current) return;

    const stage = new Konva.Stage({
      container: konvaContainerRef.current,
      width: canvasSize.width,
      height: canvasSize.height,
      draggable: false,
    });

    const gridLayer = new Konva.Layer({ listening: false });
    const layer = new Konva.Layer();

    stage.add(gridLayer);
    stage.add(layer);

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

    stage.on(
      "click tap",
      (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        if (e.target === stage) {
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
      shapeRefs.current.clear();
    };
  }, [canvasSize.width, canvasSize.height, onSelectElement]);

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

    elements.forEach((element) => {
      const shape = createKonvaShape(element);
      if (!shape) return;

      layer.add(shape);
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
        if (!gridEnabled) return;

        const pos = shape.position();
        shape.position({
          x: snap(pos.x, GRID_SIZE),
          y: snap(pos.y, GRID_SIZE),
        });

        layer.draw();
      });

      shape.on("dragend", () => {
        const pos = shape.position();
        const nextX = gridEnabled ? snap(pos.x, GRID_SIZE) : pos.x;
        const nextY = gridEnabled ? snap(pos.y, GRID_SIZE) : pos.y;

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
        const pos = shape.position();

        let nextX = pos.x;
        let nextY = pos.y;
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
    elements,
    selectedElementIds,
    inlineEditor?.id,
    onSelectElement,
    onUpdateElement,
    startInlineEditing,
    getInlineEditorState,
    gridEnabled,
  ]);

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
    const paddingY = isMobileViewport ? 24 : 110;

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
  }, [canvasSize.width, canvasSize.height, isMobileViewport, onZoomChange]);

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
            paddingBottom: isMobileViewport ? 72 : 40,
          }}
        >
          <div
            ref={stageWrapperRef}
            className="relative shrink-0 rounded-[2px]"
            style={{
              width: canvasSize.width * scale,
              height: canvasSize.height * scale,
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              overflow: "hidden",
              background: wrapperBackground,
            }}
          >
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
              }}
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
                  color: inlineEditor.color,
                  lineHeight: String(inlineEditor.lineHeight),
                  textAlign: inlineEditor.textAlign,
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
    const baseConfig = {
      id: element.id,
      x: element.x,
      y: element.y,
      rotation: element.rotation || 0,
      opacity: element.opacity != null ? element.opacity / 100 : 1,
      draggable: true,
    };

    if (element.type === "text") {
      return new Konva.Text({
        ...baseConfig,
        width: element.width,
        height: element.height,
        text: element.content || "",
        fontSize: element.fontSize || 24,
        fontFamily: element.fontFamily || "sans-serif",
        fontStyle: mapFontWeightToKonvaFontStyle(element.fontWeight),
        fill: element.color || "#000000",
        align: element.textAlign || "center",
        verticalAlign: "middle",
        lineHeight: element.lineHeight || 1.2,
        letterSpacing: element.letterSpacing || 0,
        wrap: "word",
      });
    }

    if (element.type === "shape") {
      if (element.shapeType === "circle") {
        return new Konva.Circle({
          ...baseConfig,
          x: element.x + element.width / 2,
          y: element.y + element.height / 2,
          radius: Math.min(element.width, element.height) / 2,
          fill: element.backgroundColor || "#4488FF",
          stroke: element.borderColor || "transparent",
          strokeWidth: element.borderWidth || 0,
        });
      }

      if (element.shapeType === "triangle") {
        return new Konva.Line({
          ...baseConfig,
          points: [
            element.width / 2,
            0,
            element.width,
            element.height,
            0,
            element.height,
          ],
          closed: true,
          fill: element.backgroundColor || "#4488FF",
          stroke: element.borderColor || "transparent",
          strokeWidth: element.borderWidth || 0,
        });
      }

      if (element.shapeType === "line") {
        return new Konva.Line({
          ...baseConfig,
          points: [0, element.height / 2, element.width, element.height / 2],
          stroke: element.backgroundColor || "#000000",
          strokeWidth: element.borderWidth || 2,
        });
      }

      return new Konva.Rect({
        ...baseConfig,
        width: element.width,
        height: element.height,
        fill: element.backgroundColor || "#4488FF",
        stroke: element.borderColor || "transparent",
        strokeWidth: element.borderWidth || 0,
        cornerRadius: element.borderRadius || 0,
      });
    }

    if (element.type === "image" && element.src) {
      const img = new window.Image();
      img.src = element.src;

      return new Konva.Image({
        ...baseConfig,
        width: element.width,
        height: element.height,
        image: img,
      });
    }

    if (element.type === "table") {
      const group = new Konva.Group({
        ...baseConfig,
        width: element.width,
        height: element.height,
      });

      const rows = element.rows || 3;
      const cols = element.cols || 3;
      const cellWidth = element.width / cols;
      const cellHeight = element.height / rows;

      for (let i = 0; i <= rows; i++) {
        group.add(
          new Konva.Line({
            points: [0, i * cellHeight, element.width, i * cellHeight],
            stroke: element.borderColor || "#000",
            strokeWidth: element.borderWidth || 1,
          }),
        );
      }

      for (let i = 0; i <= cols; i++) {
        group.add(
          new Konva.Line({
            points: [i * cellWidth, 0, i * cellWidth, element.height],
            stroke: element.borderColor || "#000",
            strokeWidth: element.borderWidth || 1,
          }),
        );
      }

      if (element.tableData) {
        element.tableData.forEach((row, rowIndex) => {
          row.forEach((cell, colIndex) => {
            group.add(
              new Konva.Text({
                x: colIndex * cellWidth,
                y: rowIndex * cellHeight,
                width: cellWidth,
                height: cellHeight,
                text: cell || "",
                fontSize: element.fontSize || 14,
                fontFamily: element.fontFamily || "sans-serif",
                fill: element.color || "#000000",
                align: "center",
                verticalAlign: "middle",
              }),
            );
          });
        });
      }

      return group;
    }

    if (element.type === "video") {
      const group = new Konva.Group({
        ...baseConfig,
        width: element.width,
        height: element.height,
      });

      group.add(
        new Konva.Rect({
          x: 0,
          y: 0,
          width: element.width,
          height: element.height,
          fill: "#1a1a1a",
        }),
      );

      group.add(
        new Konva.Text({
          x: 0,
          y: element.height / 2 - 20,
          width: element.width,
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
          y: element.height / 2 + 10,
          width: element.width,
          text: `${element.duration || 0}s`,
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

function mapFontWeightToKonvaFontStyle(fontWeight?: string): string {
  if (!fontWeight) return "normal";

  const value = String(fontWeight).toLowerCase();

  if (value === "bold") return "bold";
  if (value === "italic") return "italic";
  if (value === "bold italic") return "bold italic";

  const numeric = Number(value);
  if (!Number.isNaN(numeric)) {
    return numeric >= 600 ? "bold" : "normal";
  }

  return "normal";
}