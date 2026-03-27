import React, { useCallback } from "react";
import { TopBar } from "./TopBar";
import { Toolbar } from "./Toolbar";
import { CanvasStage } from "./CanvasStageKonva";
import { Inspector } from "./Inspector";
import { TimelineBar } from "./TimelineBar";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileBottomDock } from "./MobileBottomDock";
import { LayersPanel } from "./LayersPanel";
import { MobileLayerSheet } from "./MobileLayerSheet";

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
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  rotation?: number;
  scale?: number;
  opacity?: number;
  visible?: boolean;
  zIndex?: number;
  animationProps?: LayerAnimationProps;
  textAlign?: "left" | "center" | "right";
  lineHeight?: number;
  letterSpacing?: number;
  shapeType?: "rectangle" | "circle" | "triangle" | "line";
  duration?: number;
  startTime?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  hueRotate?: number;
  blur?: number;
  invert?: number;
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
    color: "#123a63",
    textAlign: "center",
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

const normalizeLayer = (
  layer: CanvasElement,
  fallbackZIndex: number,
): CanvasElement => ({
  scale: 1,
  opacity: 100,
  visible: true,
  zIndex: fallbackZIndex,
  animationProps: createDefaultAnimationProps(),
  ...layer,
  scale: layer.scale ?? 1,
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
});

const reindexLayers = (layers: CanvasElement[]) =>
  layers.map((layer, index) => ({
    ...layer,
    zIndex: index + 1,
  }));

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
      "A New Design",
      safeInitialSize,
    );
  }

  const [activeTool, setActiveTool] = React.useState<ToolType | null>(null);
  const [selectedLayerId, setSelectedLayerId] = React.useState<string | null>(null);
  const [sidebarExpanded, setSidebarExpanded] = React.useState(false);
  const [zoom, setZoom] = React.useState(100);
  const [canvasSize, setCanvasSize] = React.useState<CanvasSizePreset>(safeInitialSize);
  const [canvasBackground, setCanvasBackground] = React.useState("#FFFFFF");
  const [designTitle, setDesignTitle] = React.useState("A New Design");
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
  const editorRootRef = React.useRef<HTMLDivElement>(null);
  const [videoDuration, setVideoDuration] = React.useState(10);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);

  const [elements, setElements] = React.useState<CanvasElement[]>(() => [
    normalizeLayer(initialTitleElementRef.current!, 1),
  ]);
  const [history, setHistory] = React.useState<HistoryEntry[]>([
    {
      elements: [normalizeLayer(initialTitleElementRef.current!, 1)],
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

  const layers = React.useMemo(
    () => [...elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0)),
    [elements],
  );
  const selectedElementIds = selectedLayerId ? [selectedLayerId] : [];
  const selectedElement =
    layers.find((layer) => layer.id === selectedLayerId) ?? null;

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
    setActiveTool(tool);
    setRequestedMobileTab("add");
    return;
  }

  if (activeTool === tool && sidebarExpanded) {
    setSidebarExpanded(false);
    setActiveTool(null);
  } else {
    setActiveTool(tool);
    setSidebarExpanded(true);
  }
};

  const updateElement = useCallback(
    (id: string, updates: Partial<CanvasElement>) => {
      setElements((prev) => {
        const next = prev.map((el, index) =>
          el.id === id
            ? normalizeLayer({ ...el, ...updates }, el.zIndex ?? index + 1)
            : el,
        );
        pushHistory(next);
        return next;
      });
    },
    [pushHistory]
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
      const next = prev.map((el) =>
        el.id === selectedLayerId
          ? { ...el, x: el.x + dx, y: el.y + dy }
          : el
      );

      pushHistory(next);
      return next;
    });
  },
  [selectedLayerId, pushHistory]
);

  const addElement = useCallback(
  (element: Omit<CanvasElement, "id">) => {
    const nextZIndex = elements.length + 1;
    const newEl = normalizeLayer({ ...element, id: generateId() }, nextZIndex);
    setElements((prev) => {
      const next = [...prev, newEl];
      pushHistory(next);
      return next;
    });
    setSelectedLayerId(newEl.id);
  },
  [elements.length, pushHistory]
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
              {
                ...el,
                id: generateId(),
                x: el.x + 20,
                y: el.y + 20,
                zIndex: next.length + 1,
              },
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
    [pushHistory, selectedLayerId]
  );

  const moveElementLayer = useCallback(
    (id: string, direction: "up" | "down" | "top" | "bottom") => {
      setElements((prev) => {
        const ordered = [...prev].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
        const idx = ordered.findIndex((e) => e.id === id);
        if (idx === -1) return prev;

        const next = [...ordered];
        const [item] = next.splice(idx, 1);

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
    [pushHistory]
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
  (id: string | null, shiftKey: boolean = false) => {
    editorRootRef.current?.focus();

    if (!id) {
      setSelectedLayerId(null);
      return;
    }

    setSelectedLayerId(id);
  },
  []
);

  const handleEditorPointerDownCapture = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const target = e.target;

      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const element = target instanceof HTMLElement ? target : null;
      if (element?.closest('[contenteditable="true"]')) {
        return;
      }

      editorRootRef.current?.focus();
    },
    [],
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
            return {
              ...el,
              x: Math.max(24, Math.round((newSize.width - nextWidth) / 2)),
              y: Math.max(28, Math.round(newSize.height * 0.1)),
              width: nextWidth,
              height: Math.max(72, Math.round((el.height || 88) * resizeScale)),
              fontSize: el.fontSize
                ? Math.max(28, Math.round(el.fontSize * resizeScale))
                : el.fontSize,
            };
          }

          return {
            ...el,
            x: Math.round(el.x * scaleX),
            y: Math.round(el.y * scaleY),
            width: Math.round(el.width * resizeScale),
            height: Math.round(el.height * resizeScale),
            fontSize: el.fontSize ? Math.round(el.fontSize * resizeScale) : el.fontSize,
            borderWidth: el.borderWidth ? Math.round(el.borderWidth * resizeScale) : el.borderWidth,
            borderRadius: el.borderRadius ? Math.round(el.borderRadius * resizeScale) : el.borderRadius,
          };
        });
        pushHistory(next);
        return next;
      });

      setCanvasSize(preset);
    },
    [canvasSize, pushHistory]
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

  if (isMobile) {
  return (
    <div
    ref={editorRootRef}
    tabIndex={0}
    // onMouseDownCapture={() => editorRootRef.current?.focus()}
    onPointerDownCapture={handleEditorPointerDownCapture}
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
      />

      <div className="grid flex-1 min-h-0 grid-cols-1 overflow-hidden bg-[#eef1f5]">
  <div className="relative min-h-0">
        <CanvasStage
          elements={layers}
          selectedElementIds={selectedElementIds}
          onSelectElement={handleSelectElement}
          onUpdateElement={updateElement}
          zoom={zoom}
          onZoomChange={setZoom}
          canvasSize={canvasSize}
          canvasBackground={canvasBackground}
          gridEnabled={gridEnabled}
          alignmentGuides={alignmentGuides}
          bleedEnabled={bleedEnabled}
          isMobileViewport
          bottomInset={170}
        />
        </div>

        <MobileBottomDock
          selectedElement={null}
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

      <MobileLayerSheet
        layer={selectedElement}
        onClose={() => setSelectedLayerId(null)}
        onUpdateLayer={updateElement}
        onDeleteLayer={deleteElement}
        onDuplicateLayer={duplicateElement}
        onMoveLayer={moveElementLayer}
      />
    </div>
  );
}

  return (
  <div
    ref={editorRootRef}
    tabIndex={0}
    // onMouseDownCapture={() => editorRootRef.current?.focus()}
    onPointerDownCapture={handleEditorPointerDownCapture}
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
      />

      <div className="grid flex-1 min-h-0 grid-cols-[auto_minmax(0,1fr)_auto] overflow-hidden bg-[#f7f7f8]">
        <Toolbar
          activeTool={activeTool}
          onToolClick={handleToolClick}
          sidebarExpanded={sidebarExpanded}
          onCloseSidebar={() => setSidebarExpanded(false)}
          onAddElement={addElement}
          onBackgroundChange={handleBackgroundChange}
          canvasBackground={canvasBackground}
          mode={mode}
          onCanvasSizeChange={handleCanvasSizeChange}
        />

        <CanvasStage
          elements={layers}
          selectedElementIds={selectedElementIds}
          onSelectElement={handleSelectElement}
          onUpdateElement={updateElement}
          zoom={zoom}
          onZoomChange={setZoom}
          canvasSize={canvasSize}
          canvasBackground={canvasBackground}
          gridEnabled={gridEnabled}
          alignmentGuides={alignmentGuides}
          bleedEnabled={bleedEnabled}
        />

        <div className="flex h-full min-h-0 w-[320px] shrink-0 flex-col border-l border-editor-inspector-border bg-editor-inspector">
          <Inspector
            selectedElement={selectedElement}
            onUpdateElement={updateElement}
            onDeleteElement={deleteElement}
            onDuplicateElement={duplicateElement}
            onMoveLayer={moveElementLayer}
            canvasSize={canvasSize}
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
          />
          <LayersPanel
            layers={layers}
            selectedLayerId={selectedLayerId}
            onSelectLayer={setSelectedLayerId}
            onToggleVisibility={toggleLayerVisibility}
            onDeleteLayer={deleteElement}
            onReorderLayers={reorderLayers}
          />
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
            className="h-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
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
            className="w-full h-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
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
            className="w-full h-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
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