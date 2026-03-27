import React, { useCallback } from "react";
import { TopBar } from "./TopBar";
import { Toolbar } from "./Toolbar";
import { CanvasStage } from "./CanvasStageKonva";
import { Inspector } from "./Inspector";
import { TimelineBar } from "./TimelineBar";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileBottomDock } from "./MobileBottomDock";
import { ToolbarSidePanel } from "./ToolbarSidePanel";

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

export interface CanvasElement {
  id: string;
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
  opacity?: number;
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

  const [activeTool, setActiveTool] = React.useState<ToolType | null>(null);
  const [selectedElementIds, setSelectedElementIds] = React.useState<string[]>([]);
  const [sidebarExpanded, setSidebarExpanded] = React.useState(false);
  const [zoom, setZoom] = React.useState(100);
  const [canvasSize, setCanvasSize] = React.useState<CanvasSizePreset>(safeInitialSize);
  const [canvasBackground, setCanvasBackground] = React.useState("#FFFFFF");
  const [designTitle, setDesignTitle] = React.useState("A New Design");
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

  const [elements, setElements] = React.useState<CanvasElement[]>([]);
  const [history, setHistory] = React.useState<HistoryEntry[]>([
    { elements: [], canvasBackground: "#FFFFFF" },
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

  const selectedElements = elements.filter((el) => selectedElementIds.includes(el.id));
  const selectedElement = selectedElements.length === 1 ? selectedElements[0] : null;

  const handleToolClick = (tool: ToolType) => {
  if (isMobile) {
    setActiveTool(tool);
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
        const next = prev.map((el) => (el.id === id ? { ...el, ...updates } : el));
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
    if (selectedElementIds.length === 0) return;

    setElements((prev) => {
      const next = prev.map((el) =>
        selectedElementIds.includes(el.id)
          ? { ...el, x: el.x + dx, y: el.y + dy }
          : el
      );

      pushHistory(next);
      return next;
    });
  },
  [selectedElementIds, pushHistory]
);

  const addElement = useCallback(
  (element: Omit<CanvasElement, "id">) => {
    const newEl = { ...element, id: generateId() };
    setElements((prev) => {
      const next = [...prev, newEl];
      pushHistory(next);
      return next;
    });
    setSelectedElementIds([newEl.id]);
  },
  [pushHistory]
);

  const deleteElement = useCallback(
    (id?: string) => {
      const idsToDelete = id ? [id] : selectedElementIds;
      setElements((prev) => {
        const next = prev.filter((el) => !idsToDelete.includes(el.id));
        pushHistory(next);
        return next;
      });
      setSelectedElementIds([]);
    },
    [pushHistory, selectedElementIds]
  );

  const duplicateElement = useCallback(
    (id?: string) => {
      const idsToDuplicate = id ? [id] : selectedElementIds;
      setElements((prev) => {
        const next = [...prev];
        const newIds: string[] = [];

        idsToDuplicate.forEach((currentId) => {
          const el = next.find((e) => e.id === currentId);
          if (el) {
            const newEl = { ...el, id: generateId(), x: el.x + 20, y: el.y + 20 };
            next.push(newEl);
            newIds.push(newEl.id);
          }
        });

        pushHistory(next);
        setSelectedElementIds(newIds);
        return next;
      });
    },
    [pushHistory, selectedElementIds]
  );

  const moveElementLayer = useCallback(
    (id: string, direction: "up" | "down" | "top" | "bottom") => {
      setElements((prev) => {
        const idx = prev.findIndex((e) => e.id === id);
        if (idx === -1) return prev;

        const next = [...prev];
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

        pushHistory(next);
        return next;
      });
    },
    [pushHistory]
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
      setSelectedElementIds([]);
      return;
    }

    if (shiftKey) {
      setSelectedElementIds((prev) => {
        if (prev.includes(id)) {
          return prev.filter((i) => i !== id);
        }
        return [...prev, id];
      });
    } else {
      setSelectedElementIds([id]);
    }
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
        const next = prev.map((el) => ({
          ...el,
          x: Math.round(el.x * scaleX),
          y: Math.round(el.y * scaleY),
          width: Math.round(el.width * resizeScale),
          height: Math.round(el.height * resizeScale),
          fontSize: el.fontSize ? Math.round(el.fontSize * resizeScale) : el.fontSize,
          borderWidth: el.borderWidth ? Math.round(el.borderWidth * resizeScale) : el.borderWidth,
          borderRadius: el.borderRadius ? Math.round(el.borderRadius * resizeScale) : el.borderRadius,
        }));
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
      if (selectedElementIds.length > 0) {
        e.preventDefault();
        duplicateElement();
      }
      return;
    }

    if (e.key === "Delete" || e.key === "Backspace") {
      if (selectedElementIds.length > 0) {
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

    if (mode === "video" && e.key === " " && selectedElementIds.length === 0) {
      e.preventDefault();
      setIsPlaying((p) => !p);
    }
  };

  el.addEventListener("keydown", handler);
  return () => el.removeEventListener("keydown", handler);
}, [
  undo,
  redo,
  selectedElementIds,
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
        zoom={zoom}
        onZoomChange={setZoom}
        canvasSize={canvasSize}
        canvasBackground={canvasBackground}
        gridEnabled={gridEnabled}
        alignmentGuides={alignmentGuides}
        bleedEnabled={bleedEnabled}
      />

      <div className="relative flex-1 min-h-0 overflow-hidden">
  <div className="absolute inset-0">
        <CanvasStage
          elements={elements}
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
        />
        </div>

        <MobileBottomDock
          selectedElement={selectedElement}
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
          onDesignTitleChange={setDesignTitle}
          onGridToggle={setGridEnabled}
          onAlignmentGuidesToggle={setAlignmentGuides}
          onBleedToggle={setBleedEnabled}
          onFoldsChange={setFolds}
          onCanvasSizeChange={handleCanvasSizeChange}
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

      <div className="flex flex-1 overflow-hidden bg-[#f7f7f8]">
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
          elements={elements}
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
          onDesignTitleChange={setDesignTitle}
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
      </div>

      {mode === "video" && (
        <TimelineBar
          duration={videoDuration}
          currentTime={currentTime}
          isPlaying={isPlaying}
          onTimeChange={setCurrentTime}
          onPlayPause={() => setIsPlaying((p) => !p)}
          onDurationChange={setVideoDuration}
          elements={elements}
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