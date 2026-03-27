import React from "react";
import {
  Upload,
  LayoutGrid,
  Images,
  Type,
  Sparkles,
  ScanLine,
  LayoutTemplate,
  CircleDot,
  PanelsTopLeft,
  QrCode,
  Paintbrush,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type {
  ActiveTool,
  ToolType,
  CanvasElement,
  EditorMode,
  CanvasSizePreset,
} from "./EditorShell";
import { ToolbarSidePanel } from "./ToolbarSidePanel";

interface ToolItem {
  id: ToolType;
  label: string;
  icon: React.ElementType;
  modes: EditorMode[];
}

const tools: ToolItem[] = [
  { id: "uploads", label: "My Uploads", icon: Upload, modes: ["image", "video"] },
  { id: "templates", label: "Templates", icon: LayoutGrid, modes: ["image", "video"] },
  { id: "media", label: "Media", icon: Images, modes: ["image", "video"] },
  { id: "text", label: "Text", icon: Type, modes: ["image", "video"] },
  { id: "ai", label: "AI", icon: Sparkles, modes: ["image", "video"] },
  { id: "background", label: "Background", icon: ScanLine, modes: ["image", "video"] },
  // { id: "layout", label: "Layout", icon: LayoutTemplate, modes: ["image", "video"] },
  // { id: "record", label: "Record", icon: CircleDot, modes: ["image", "video"] },
  { id: "draw", label: "Draw", icon: Paintbrush, modes: ["image", "video"] },
  // { id: "slideshow", label: "Slideshow", icon: PanelsTopLeft, modes: ["image", "video"] },
  { id: "qrcode", label: "QR Code", icon: QrCode, modes: ["image", "video"] },
];


interface ToolbarProps {
  activeTool: ActiveTool;
  onToolClick: (tool: ToolType) => void;
  sidebarExpanded: boolean;
  onCloseSidebar: () => void;
  isMobile?: boolean;
  onAddElement: (el: Omit<CanvasElement, "id">) => void;
  onBackgroundChange: (bg: string) => void;
  canvasBackground: string;
  mode: EditorMode;
  onCanvasSizeChange: (preset: CanvasSizePreset) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onToolClick,
  sidebarExpanded,
  onCloseSidebar,
  isMobile,
  onAddElement,
  onBackgroundChange,
  canvasBackground,
  mode,
  onCanvasSizeChange,
}) => {
  const filteredTools = tools.filter((t) => t.modes.includes(mode));
  const usesInspectorPanel = sidebarExpanded && activeTool === "draw";

  const [panelHeight, setPanelHeight] = React.useState(560);
  const buttonRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const [anchorRect, setAnchorRect] = React.useState<DOMRect | null>(null);

  const VIEWPORT_MARGIN = 16;

  React.useLayoutEffect(() => {
    if (!panelRef.current) return;
    const nextHeight = panelRef.current.offsetHeight;
    if (nextHeight && nextHeight !== panelHeight) {
      setPanelHeight(nextHeight);
    }
  }, [activeTool, sidebarExpanded, panelHeight]);

  React.useEffect(() => {
    if (!activeTool || !sidebarExpanded) {
      setAnchorRect(null);
      return;
    }

    const btn = buttonRefs.current[activeTool];
    if (!btn) return;

    const updateRect = () => {
      setAnchorRect(btn.getBoundingClientRect());
    };

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [activeTool, sidebarExpanded]);

  React.useEffect(() => {
    if (!sidebarExpanded || usesInspectorPanel) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      const clickedToolbarButton = Object.values(buttonRefs.current).some(
        (btn) => btn && btn.contains(target)
      );

      if (clickedToolbarButton) return;
      if (panelRef.current?.contains(target)) return;

      onCloseSidebar();
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [usesInspectorPanel, sidebarExpanded, onCloseSidebar]);

   const floatingPosition = React.useMemo(() => {
    if (!anchorRect || !sidebarExpanded || typeof window === "undefined") return null;

    const viewportHeight = window.innerHeight;
    const maxHeight = viewportHeight - VIEWPORT_MARGIN * 2;
    const effectiveHeight = Math.min(panelHeight, maxHeight);

    const anchorCenterY = anchorRect.top + anchorRect.height / 2;
    const rawTop = anchorCenterY - effectiveHeight / 2;

    const minTop = VIEWPORT_MARGIN;
    const maxTop = viewportHeight - effectiveHeight - VIEWPORT_MARGIN;
    const top = Math.max(minTop, Math.min(rawTop, Math.max(minTop, maxTop)));

    const left = anchorRect.right + 16;

    const notchCenterY = anchorCenterY - top;
    const notchMin = 24;
    const notchMax = effectiveHeight - 24;
    const notchTop = Math.max(notchMin, Math.min(notchCenterY, notchMax));

    return {
      top,
      left,
      notchTop,
      maxHeight,
    };
  }, [anchorRect, sidebarExpanded, panelHeight]);

  if (isMobile) return null;

  return (
    <>
      <div className="relative shrink-0 h-full pl-3 pt-3 flex items-center">
        <div className="w-[76px] rounded-[18px] border border-[#d8dee8] bg-white px-1.5 py-3 shadow-xl flex flex-col items-center gap-1.5">
          {filteredTools.map((tool) => {
            const isActive = activeTool === tool.id && sidebarExpanded;

            return (
              <button
                key={tool.id}
                ref={(el) => {
                  buttonRefs.current[tool.id] = el;
                }}
                onClick={() => onToolClick(tool.id)}
                className={`relative flex h-[62px] w-full flex-col items-center justify-center rounded-xl border transition-colors duration-150 ${
                  isActive
                    ? "border-[#bee3f8] bg-[#f3efff] text-[#7650e3]"
                    : "border-transparent text-[#4A5568] hover:bg-[#f3efff] hover:text-[#7650e3]"
                }`}
              >
                <tool.icon size={18} strokeWidth={1.75} />
                <span className="mt-1 text-[11px] font-medium leading-tight text-center">
                  {tool.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {sidebarExpanded && activeTool !== "select" && !usesInspectorPanel && anchorRect && floatingPosition && (
          <motion.div
            ref={panelRef}
            className="fixed z-40 w-[320px]"
            style={{
              top: floatingPosition.top,
              left: floatingPosition.left,
              maxHeight: floatingPosition.maxHeight,
            }}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div
              className="absolute left-[-9px] h-5 w-5 -translate-y-1/2 rotate-45 border-b border-l border-[#d8dee8] bg-white"
              style={{ top: floatingPosition.notchTop }}
            />

            <div
              className="relative overflow-hidden rounded-2xl border border-[#d8dee8] bg-white shadow-xl"
              style={{ maxHeight: floatingPosition.maxHeight }}
            >
              <div className="overflow-y-auto p-4" style={{ maxHeight: floatingPosition.maxHeight }}>
                <ToolbarSidePanel
                  activeTool={activeTool}
                  onAddElement={onAddElement}
                  onBackgroundChange={onBackgroundChange}
                  canvasBackground={canvasBackground}
                  mode={mode}
                  onCanvasSizeChange={onCanvasSizeChange}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};