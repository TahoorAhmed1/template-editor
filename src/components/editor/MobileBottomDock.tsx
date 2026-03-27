import React from "react";
import {
  Plus,
  Sparkles,
  ScanText,
  ScanLine,
  Type,
  LayoutTemplate,
  Upload,
  LayoutGrid,
  Images,
  CircleDot,
  Paintbrush,
  PanelsTopLeft,
  QrCode,
  X,
  ChevronLeft,
  Wand2,
  SlidersHorizontal,
  Move,
  Palette,
  LayoutDashboard,
} from "lucide-react";
import type {
  ToolType,
  ActiveTool,
  CanvasElement,
  EditorMode,
  CanvasSizePreset,
  DrawSettings,
} from "./EditorShell";
import { ToolbarSidePanel } from "./ToolbarSidePanel";
import { DesignInspector, ElementInspector } from "./Inspector";

type DockTab =
  | "add"
  | "styles"
  | "resize"
  | "background"
  | "title"
  | "layout"
  | "edit"
  | "filters"
  | "animation"
  | "position"
  | null;

interface MobileBottomDockProps {
  selectedElement: CanvasElement | null;
  mode: EditorMode;
  canvasSize: CanvasSizePreset;
  canvasBackground: string;
  designTitle: string;
  gridEnabled: boolean;
  alignmentGuides: boolean;
  bleedEnabled: boolean;
  folds: string;
  activeTool: ActiveTool;
  drawSettings: DrawSettings;

  onToolClick: (tool: ToolType) => void;
  onAddElement: (el: Omit<CanvasElement, "id">) => void;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  onMoveLayer: (
    id: string,
    direction: "up" | "down" | "top" | "bottom",
  ) => void;
  onBackgroundChange: (bg: string) => void;
  onDesignTitleChange: (title: string) => void;
  onGridToggle: (on: boolean) => void;
  onAlignmentGuidesToggle: (on: boolean) => void;
  onBleedToggle: (on: boolean) => void;
  onFoldsChange: (folds: string) => void;
  onCanvasSizeChange: (preset: CanvasSizePreset) => void;
  onUpdateDrawSettings: (updates: Partial<DrawSettings>) => void;
  onFinishDrawing: () => void;
  requestedTab?: DockTab;
  onRequestedTabHandled?: () => void;
}

interface ToolItem {
  id: ToolType;
  label: string;
  icon: React.ElementType;
  description: string;
  modes: EditorMode[];
}

const tools: ToolItem[] = [
  {
    id: "uploads",
    label: "My Uploads",
    icon: Upload,
    description: "Add from My Uploads, Google Drive, and more",
    modes: ["image", "video"],
  },
  {
    id: "templates",
    label: "Templates",
    icon: LayoutGrid,
    description: "Explore templates for your design",
    modes: ["image", "video"],
  },
  {
    id: "media",
    label: "Media",
    icon: Images,
    description: "Add photos, videos, elements, and audio",
    modes: ["image", "video"],
  },
  {
    id: "text",
    label: "Text",
    icon: Type,
    description: "Choose from a variety of text styles",
    modes: ["image", "video"],
  },
  {
    id: "ai",
    label: "AI",
    icon: Sparkles,
    description: "Transform your ideas with AI",
    modes: ["image", "video"],
  },
  // {
  //   id: "record",
  //   label: "Record",
  //   icon: CircleDot,
  //   description: "Capture photos, videos, or audio",
  //   modes: ["image", "video"],
  // },
  // {
  //   id: "slideshow",
  //   label: "Slideshow",
  //   icon: PanelsTopLeft,
  //   description: "Create text, photo, and video slideshows",
  //   modes: ["image", "video"],
  // },
  {
    id: "draw",
    label: "Draw",
    icon: Paintbrush,
    description: "Use a free-hand drawing tool",
    modes: ["image", "video"],
  },
  // {
  //   id: "layout",
  //   label: "Layout",
  //   icon: LayoutTemplate,
  //   description: "Add schedules, menus, tables, and more",
  //   modes: ["image", "video"],
  // },
  {
    id: "background",
    label: "Background",
    icon: ScanLine,
    description: "Set solid, gradient, or image backgrounds",
    modes: ["image", "video"],
  },
  {
    id: "qrcode",
    label: "QR Code",
    icon: QrCode,
    description: "Generate a QR code for your design",
    modes: ["image", "video"],
  },
];

const designTabs = [
  { id: "add" as const, label: "Add", icon: Plus, primary: true },
  { id: "styles" as const, label: "Styles", icon: Sparkles },
  { id: "resize" as const, label: "Resize", icon: ScanText },
  { id: "background" as const, label: "Background", icon: Palette },
  { id: "title" as const, label: "Title", icon: Type },
  { id: "layout" as const, label: "Layout", icon: LayoutDashboard },
];

const elementTabs = [
  { id: "add" as const, label: "Add", icon: Plus, primary: true },
  { id: "edit" as const, label: "Edit", icon: Type },
  { id: "filters" as const, label: "Filters", icon: SlidersHorizontal },
  { id: "animation" as const, label: "Animate", icon: Wand2 },
  { id: "position" as const, label: "Position", icon: Move },
];

const BOTTOM_BAR_HEIGHT = 86;

export const MobileBottomDock: React.FC<MobileBottomDockProps> = ({
  selectedElement,
  mode,
  canvasSize,
  canvasBackground,
  designTitle,
  gridEnabled,
  alignmentGuides,
  bleedEnabled,
  folds,
  activeTool,
  drawSettings,
  onToolClick,
  onAddElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onMoveLayer,
  onBackgroundChange,
  onDesignTitleChange,
  onGridToggle,
  onAlignmentGuidesToggle,
  onBleedToggle,
  onFoldsChange,
  onCanvasSizeChange,
  onUpdateDrawSettings,
  onFinishDrawing,
  requestedTab,
  onRequestedTabHandled,
}) => {
  const [openTab, setOpenTab] = React.useState<DockTab>(null);
  const [addToolView, setAddToolView] = React.useState<"list" | "tool">("list");

  const filteredTools = React.useMemo(
    () => tools.filter((tool) => tool.modes.includes(mode)),
    [mode],
  );

  const tabs = selectedElement ? elementTabs : designTabs;
  const primaryTab = tabs[0];
  const scrollableTabs = tabs.slice(1);
  const isOpen = openTab !== null;

  React.useEffect(() => {
    if (
      !selectedElement &&
      (openTab === "edit" ||
        openTab === "filters" ||
        openTab === "animation" ||
        openTab === "position")
    ) {
      setOpenTab(null);
    }
  }, [selectedElement, openTab]);

  React.useEffect(() => {
    if (openTab !== "add") {
      setAddToolView("list");
    }
  }, [openTab]);

  React.useEffect(() => {
    if (!requestedTab) return;
    setOpenTab(requestedTab);
    onRequestedTabHandled?.();
  }, [requestedTab, onRequestedTabHandled]);

  const handleDockTabClick = (tab: DockTab) => {
    setOpenTab((prev) => (prev === tab ? null : tab));
  };

  const handleOpenTool = (tool: ToolType) => {
    onToolClick(tool);
    setAddToolView("tool");
    setOpenTab("add");
  };

  const renderHeaderTitle = () => {
    if (openTab === "add") {
      if (addToolView === "tool" && activeTool) {
      if (activeTool === "select") return "Add";
        return activeTool === "ai"
          ? "AI"
          : activeTool.charAt(0).toUpperCase() + activeTool.slice(1);
      }
      return "Add";
    }

    if (openTab === "styles") return "Styles";
    if (openTab === "resize") return "Resize";
    if (openTab === "background") return "Background";
    if (openTab === "title") return "Title";
    if (openTab === "layout") return "Layout";
    if (openTab === "edit") return "Edit";
    if (openTab === "filters") return "Filters";
    if (openTab === "animation") return "Animation";
    if (openTab === "position") return "Position";
    return "";
  };

  const renderDesignTabPanel = () => {
    switch (openTab) {
      case "styles":
        return (
          <DesignInspector
            canvasSize={canvasSize}
            canvasBackground={canvasBackground}
            onBackgroundChange={onBackgroundChange}
            designTitle={designTitle}
            onDesignTitleChange={onDesignTitleChange}
            gridEnabled={gridEnabled}
            onGridToggle={onGridToggle}
            alignmentGuides={alignmentGuides}
            onAlignmentGuidesToggle={onAlignmentGuidesToggle}
            bleedEnabled={bleedEnabled}
            onBleedToggle={onBleedToggle}
            folds={folds}
            onFoldsChange={onFoldsChange}
            mode={mode}
            visibleSections={["styles"]}
          />
        );

      case "resize":
        return (
          <DesignInspector
            canvasSize={canvasSize}
            canvasBackground={canvasBackground}
            onBackgroundChange={onBackgroundChange}
            designTitle={designTitle}
            onDesignTitleChange={onDesignTitleChange}
            gridEnabled={gridEnabled}
            onGridToggle={onGridToggle}
            alignmentGuides={alignmentGuides}
            onAlignmentGuidesToggle={onAlignmentGuidesToggle}
            bleedEnabled={bleedEnabled}
            onBleedToggle={onBleedToggle}
            folds={folds}
            onFoldsChange={onFoldsChange}
            mode={mode}
            visibleSections={["size"]}
          />
        );

      case "background":
        return (
          <DesignInspector
            canvasSize={canvasSize}
            canvasBackground={canvasBackground}
            onBackgroundChange={onBackgroundChange}
            designTitle={designTitle}
            onDesignTitleChange={onDesignTitleChange}
            gridEnabled={gridEnabled}
            onGridToggle={onGridToggle}
            alignmentGuides={alignmentGuides}
            onAlignmentGuidesToggle={onAlignmentGuidesToggle}
            bleedEnabled={bleedEnabled}
            onBleedToggle={onBleedToggle}
            folds={folds}
            onFoldsChange={onFoldsChange}
            mode={mode}
            visibleSections={["background"]}
          />
        );

      case "title":
        return (
          <DesignInspector
            canvasSize={canvasSize}
            canvasBackground={canvasBackground}
            onBackgroundChange={onBackgroundChange}
            designTitle={designTitle}
            onDesignTitleChange={onDesignTitleChange}
            gridEnabled={gridEnabled}
            onGridToggle={onGridToggle}
            alignmentGuides={alignmentGuides}
            onAlignmentGuidesToggle={onAlignmentGuidesToggle}
            bleedEnabled={bleedEnabled}
            onBleedToggle={onBleedToggle}
            folds={folds}
            onFoldsChange={onFoldsChange}
            mode={mode}
            visibleSections={["title"]}
          />
        );

      case "layout":
        return (
          <DesignInspector
            canvasSize={canvasSize}
            canvasBackground={canvasBackground}
            onBackgroundChange={onBackgroundChange}
            designTitle={designTitle}
            onDesignTitleChange={onDesignTitleChange}
            gridEnabled={gridEnabled}
            onGridToggle={onGridToggle}
            alignmentGuides={alignmentGuides}
            onAlignmentGuidesToggle={onAlignmentGuidesToggle}
            bleedEnabled={bleedEnabled}
            onBleedToggle={onBleedToggle}
            folds={folds}
            onFoldsChange={onFoldsChange}
            mode={mode}
            visibleSections={["layout"]}
          />
        );

      default:
        return null;
    }
  };

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close mobile panel overlay"
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setOpenTab(null)}
        />
      )}

      <div
        className={`fixed inset-x-0 z-50 transition-transform duration-300 ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{
          bottom: `calc(${BOTTOM_BAR_HEIGHT}px + env(safe-area-inset-bottom))`,
        }}
      >
        <div
          className="mx-0 rounded-t-[22px] border-t border-border bg-background shadow-[0_-8px_24px_rgba(0,0,0,0.08)]"
          style={{
            maxHeight: "60dvh",
          }}
        >
          <div className="flex justify-center pt-2">
            <div className="h-1.5 w-12 rounded-full bg-muted" />
          </div>

          <div className="flex items-center justify-between px-4 pb-2 pt-2">
            <div className="flex items-center gap-2">
              {openTab === "add" && addToolView === "tool" && (
                <button
                  onClick={() => setAddToolView("list")}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
                >
                  <ChevronLeft size={18} />
                </button>
              )}
              <h3 className="text-[16px] font-semibold text-foreground">
                {renderHeaderTitle()}
              </h3>
            </div>

            <button
              onClick={() => setOpenTab(null)}
              className="rounded-md p-2 text-muted-foreground hover:bg-accent"
            >
              <X size={18} />
            </button>
          </div>

          <div
            className="overflow-y-auto px-3 pb-4"
            data-allow-touch-scroll="y"
            style={{ maxHeight: "calc(60dvh - 64px)" }}
          >
            {openTab === "add" && addToolView === "list" && (
              <div className="space-y-1">
                {filteredTools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => handleOpenTool(tool.id)}
                      className="flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left hover:bg-accent/60"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f3efff] text-[#7650e3]">
                        <Icon size={20} strokeWidth={1.8} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[15px] font-semibold text-foreground">
                          {tool.label}
                        </div>
                        <div className="text-[13px] leading-snug text-muted-foreground">
                          {tool.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {openTab === "add" && addToolView === "tool" && activeTool !== "select" && (
              <div className="px-1 pb-4">
                <ToolbarSidePanel
                  activeTool={activeTool}
                  onAddElement={(el) => {
                    onAddElement(el);
                    setOpenTab(null);
                    setAddToolView("list");
                  }}
                  onBackgroundChange={onBackgroundChange}
                  canvasBackground={canvasBackground}
                  mode={mode}
                  onCanvasSizeChange={onCanvasSizeChange}
                  drawSettings={drawSettings}
                  onUpdateDrawSettings={onUpdateDrawSettings}
                  onFinishDrawing={() => {
                    onFinishDrawing();
                    setOpenTab(null);
                    setAddToolView("list");
                  }}
                />
              </div>
            )}

            {!selectedElement && openTab && openTab !== "add" && (
              <div className="px-1 pb-4">
                {renderDesignTabPanel()}
              </div>
            )}

            {selectedElement && openTab && openTab !== "add" && (
              <div className="px-1 pb-4">
                <ElementInspector
                  element={selectedElement}
                  onUpdate={(updates) =>
                    onUpdateElement(selectedElement.id, updates)
                  }
                  onDelete={() => {
                    onDeleteElement(selectedElement.id);
                    setOpenTab(null);
                  }}
                  onDuplicate={() => onDuplicateElement(selectedElement.id)}
                  onMoveLayer={(dir) => onMoveLayer(selectedElement.id, dir)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-background px-2 py-1 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)",
        }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDockTabClick(primaryTab.id)}
            className={`flex min-w-[72px] shrink-0 flex-col items-center justify-center rounded-xl px-3 py-2 transition-colors ${
              openTab === primaryTab.id ? "text-[#7650e3]" : "text-foreground"
            }`}
          >
            <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#7650e3] text-primary-foreground">
              <primaryTab.icon size={18} strokeWidth={1.8} />
            </div>
            <span className="whitespace-nowrap text-[11px] font-medium">
              {primaryTab.label}
            </span>
          </button>

          <div className="min-w-0 flex-1 overflow-x-auto" data-allow-touch-scroll="x">
            <div className="flex items-center gap-1 pr-1">
              {scrollableTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = openTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => handleDockTabClick(tab.id)}
                    className={`flex min-w-[78px] shrink-0 flex-col items-center justify-center rounded-xl px-3 py-2 transition-colors ${
                      isActive
                        ? "bg-[#7650e3]/10 text-[#7650e3]"
                        : "text-muted-foreground"
                    }`}
                  >
                    <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-full">
                      <Icon size={18} strokeWidth={1.8} />
                    </div>
                    <span className="whitespace-nowrap text-[11px] font-medium">
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};