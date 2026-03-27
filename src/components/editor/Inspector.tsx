import React from "react";
import {
  Trash2, Copy, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown,
  ChevronDown, CircleOff,
} from "lucide-react";
import type { CanvasElement, CanvasSizePreset, EditorMode, DrawSettings, ActiveTool } from "./EditorShell";
import { DrawFlyout } from "./GlobalSidebarFlyouts";
import { ImageAdjustmentSidebar } from "./ImageAdjustmentSidebar";
import { TextPropertiesSidebar } from "./TextPropertiesSidebar";

interface InspectorProps {
  selectedElement: CanvasElement | null;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  onMoveLayer: (id: string, direction: "up" | "down" | "top" | "bottom") => void;
  onStartTextEditing?: (id: string) => void;
  canvasSize: CanvasSizePreset;
  canvasBackground: string;
  onBackgroundChange: (bg: string) => void;
  designTitle: string;
  onDesignTitleChange: (title: string) => void;
  gridEnabled: boolean;
  onGridToggle: (on: boolean) => void;
  alignmentGuides: boolean;
  onAlignmentGuidesToggle: (on: boolean) => void;
  bleedEnabled: boolean;
  onBleedToggle: (on: boolean) => void;
  folds: string;
  onFoldsChange: (folds: string) => void;
  mode: EditorMode;
  activeTool?: ActiveTool;
  onAddElement?: (el: Omit<CanvasElement, "id">) => void;
  drawSettings?: DrawSettings;
  onUpdateDrawSettings?: (updates: Partial<DrawSettings>) => void;
  onFinishDrawing?: () => void;
  isMobile?: boolean;
}

export const Inspector: React.FC<InspectorProps> = ({
  selectedElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onMoveLayer,
  onStartTextEditing,
  canvasSize,
  canvasBackground,
  onBackgroundChange,
  designTitle,
  onDesignTitleChange,
  gridEnabled,
  onGridToggle,
  alignmentGuides,
  onAlignmentGuidesToggle,
  bleedEnabled,
  onBleedToggle,
  folds,
  onFoldsChange,
  mode,
  activeTool,
  onAddElement,
  drawSettings,
  onUpdateDrawSettings,
  onFinishDrawing,
  isMobile,
}) => {
  if (isMobile) return null;

  const showDrawInspector = activeTool === "draw" && !!onAddElement;

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-editor-inspector">
      {selectedElement && !showDrawInspector ? (
        <div className="border-b border-editor-inspector-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">
            {selectedElement.type === "text"
              ? "Properties"
              : selectedElement.type === "shape"
              ? "Shape"
              : selectedElement.type === "table"
              ? "Table"
              : selectedElement.type === "video"
              ? "Video"
              : "Image"}
          </h2>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto editor-scroll">
        {showDrawInspector ? (
          <DrawFlyout
            onAddElement={onAddElement}
            settings={drawSettings}
            onSettingsChange={onUpdateDrawSettings}
            onFinishDrawing={onFinishDrawing}
          />
        ) : selectedElement ? (
          <ElementInspector
            element={selectedElement}
            onUpdate={(updates) => onUpdateElement(selectedElement.id, updates)}
            onDelete={() => onDeleteElement(selectedElement.id)}
            onDuplicate={() => onDuplicateElement(selectedElement.id)}
            onMoveLayer={(dir) => onMoveLayer(selectedElement.id, dir)}
            onStartTextEditing={onStartTextEditing}
          />
        ) : (
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
          />
        )}
      </div>
    </div>
  );
};

// ── Design Inspector (no element selected) ──
export const DesignInspector: React.FC<{
  canvasSize: CanvasSizePreset;
  canvasBackground: string;
  onBackgroundChange: (bg: string) => void;
  designTitle: string;
  onDesignTitleChange: (title: string) => void;
  gridEnabled: boolean;
  onGridToggle: (on: boolean) => void;
  alignmentGuides: boolean;
  onAlignmentGuidesToggle: (on: boolean) => void;
  bleedEnabled: boolean;
  onBleedToggle: (on: boolean) => void;
  folds: string;
  onFoldsChange: (folds: string) => void;
  mode: EditorMode;
  visibleSections?: Array<"size" | "styles" | "background" | "title" | "layout">;
}> = ({
  canvasSize,
  canvasBackground,
  onBackgroundChange,
  designTitle,
  onDesignTitleChange,
  gridEnabled,
  onGridToggle,
  alignmentGuides,
  onAlignmentGuidesToggle,
  bleedEnabled,
  onBleedToggle,
  folds,
  onFoldsChange,
  mode,
  visibleSections,
}) => {
  const [bgType, setBgType] = React.useState<"solid" | "gradient" | "transparent">(
    canvasBackground === "transparent" ? "transparent" : "solid",
  );

  React.useEffect(() => {
    if (canvasBackground === "transparent") {
      setBgType("transparent");
    } else if (canvasBackground.includes("gradient")) {
      setBgType("gradient");
    } else {
      setBgType("solid");
    }
  }, [canvasBackground]);

  const show = (section: "size" | "styles" | "background" | "title" | "layout") =>
    !visibleSections || visibleSections.includes(section);

  const solidColor = canvasBackground.startsWith("#") ? canvasBackground : "#ffffff";
  const styleSwatches = ["#7a1d5f", "#4f7b5f", "#d28aa2", "#4a4a3e"];
  const applyBackgroundType = (nextType: "solid" | "gradient" | "transparent") => {
    setBgType(nextType);

    if (nextType === "transparent") {
      onBackgroundChange("transparent");
      return;
    }

    if (nextType === "gradient") {
      onBackgroundChange("linear-gradient(135deg, #7b2b61 0%, #f0c1cf 55%, #4d624c 100%)");
      return;
    }

    onBackgroundChange(solidColor);
  };

  return (
    <div className="space-y-0 px-4 py-3 text-[#4A5568]">
      {show("size") && (
        <div className="border-b border-editor-inspector-border pb-4">
          <div className="mb-4 text-center text-[18px] font-medium text-[#2d3758]">Design</div>

          <div className="flex items-start justify-between gap-3">
            <span className="pt-3 text-[13px] text-[#718096]">Size</span>
            <div className="rounded-xl border border-[#d9e0ea] bg-white px-4 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <p className="text-[14px] font-semibold text-[#4A5568]">{canvasSize.label}</p>
              <p className="text-[12px] text-[#8a94a6]">{canvasSize.width}px × {canvasSize.height}px</p>
            </div>
          </div>
        </div>
      )}

      {show("styles") && (
        <div className="border-b border-editor-inspector-border py-4">
          <div className="mb-3 text-[13px] text-[#718096]">Styles</div>
          <div className="flex items-center gap-2">
            {styleSwatches.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onBackgroundChange(color)}
                className="h-7 w-7 rounded-sm border border-white/50 shadow-sm transition hover:scale-105"
                style={{ backgroundColor: color }}
              />
            ))}
            <label className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm border border-[#d7dce3] bg-white shadow-sm transition hover:bg-[#f7fafc]">
              <input
                type="color"
                value={solidColor}
                onChange={(e) => onBackgroundChange(e.target.value)}
                className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0"
                title="Pick background color"
              />
            </label>
          </div>
        </div>
      )}

      {show("background") && (
        <div className="border-b border-editor-inspector-border py-4">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[#718096]">Background</span>
            <div className="relative">
              <select
                value={bgType}
                onChange={(e) => applyBackgroundType(e.target.value as "solid" | "gradient" | "transparent")}
                className="h-9 appearance-none rounded-md border border-transparent bg-transparent pl-2 pr-6 text-[14px] text-[#4A5568] outline-none"
              >
                <option value="solid">Solid Color</option>
                <option value="gradient">Gradient</option>
                <option value="transparent">Transparent</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[#6b7280]" />
            </div>
          </div>

          <div className="mt-3 rounded-md bg-[#f8fafc] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#718096]">Color</span>
              <label className="flex h-8 w-10 cursor-pointer items-center justify-center rounded-[3px] border border-[#d7dce3] bg-white p-1 shadow-sm">
                <input
                  type="color"
                  value={solidColor}
                  onChange={(e) => onBackgroundChange(e.target.value)}
                  className="h-6 w-8 cursor-pointer border-0 bg-transparent p-0"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {show("title") && (
        <div className="border-b border-editor-inspector-border py-4">
          <div className="mb-3 text-[13px] font-semibold text-[#4A5568]">Title</div>
          <input
            type="text"
            value={designTitle}
            onChange={(e) => onDesignTitleChange(e.target.value)}
            className="h-10 w-full rounded-[3px] border border-[#d7dce3] bg-white px-3 text-[13px] text-[#4A5568] outline-none focus:ring-1 focus:ring-[#8fd3f8]"
          />
        </div>
      )}

      {show("layout") && (
        <div className="py-4">
          <div className="mb-3 text-[13px] font-semibold text-[#4A5568]">Layout</div>
          <div className="space-y-4">
            <DesignToggleRow label="Grid" on={gridEnabled} onToggle={onGridToggle} />

            {mode === "image" && (
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[#718096]">Folds</span>
                <div className="relative flex items-center gap-2 pr-5 text-[14px] text-[#4A5568]">
                  <CircleOff size={14} className="text-[#7c8798]" />
                  <select
                    value={folds}
                    onChange={(e) => onFoldsChange(e.target.value)}
                    className="appearance-none bg-transparent outline-none"
                  >
                    <option value="none">None</option>
                    <option value="bi-fold">Bi-fold</option>
                    <option value="tri-fold">Tri-fold</option>
                    <option value="z-fold">Z-fold</option>
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[#6b7280]" />
                </div>
              </div>
            )}

            {mode === "image" && (
              <DesignToggleRow label="Bleed" on={bleedEnabled} onToggle={onBleedToggle} />
            )}

            <DesignToggleRow label="Alignment Guides" on={alignmentGuides} onToggle={onAlignmentGuidesToggle} />
          </div>
         
        </div>
      )}
    </div>
  );
};

// ── Element Inspector ──
interface ElementInspectorProps {
  element: CanvasElement;
  onUpdate: (updates: Partial<CanvasElement>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveLayer: (dir: "up" | "down" | "top" | "bottom") => void;
  onStartTextEditing?: (id: string) => void;
}

const DEFAULT_ANIMATION_STATE = {
  opacity: 1,
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
};

export const ElementInspector: React.FC<ElementInspectorProps> = ({ element, onUpdate, onDelete, onDuplicate, onMoveLayer, onStartTextEditing }) => {
  if (element.type === "text") {
    return (
      <TextPropertiesSidebar
        selectedText={element}
        onUpdate={(id, newProps) => {
          if (id === element.id) {
            onUpdate(newProps);
          }
        }}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onStartCanvasEdit={onStartTextEditing}
      />
    );
  }

  if (element.type === "image") {
    return (
      <ImageAdjustmentSidebar
        selectedImage={element}
        onUpdate={(id, newProps) => {
          if (id === element.id) {
            onUpdate(newProps);
          }
        }}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onMoveLayer={onMoveLayer}
      />
    );
  }

  const activePhase = element.animationProps?.activePhase ?? "end";
  const activeAnimation = element.animationProps?.[activePhase] ?? DEFAULT_ANIMATION_STATE;

  const updateAnimationPhase = (phase: "start" | "end") => {
    onUpdate({
      animationProps: {
        activePhase: phase,
        start: element.animationProps?.start ?? { ...DEFAULT_ANIMATION_STATE, opacity: 0, y: 20 },
        end: element.animationProps?.end ?? DEFAULT_ANIMATION_STATE,
      },
    });
  };

  const updateAnimationValue = (
    key: "opacity" | "x" | "y" | "scale" | "rotation",
    value: number,
  ) => {
    onUpdate({
      animationProps: {
        activePhase,
        start: {
          ...DEFAULT_ANIMATION_STATE,
          opacity: 0,
          y: 20,
          ...(element.animationProps?.start ?? {}),
          ...(activePhase === "start" ? { [key]: value } : {}),
        },
        end: {
          ...DEFAULT_ANIMATION_STATE,
          ...(element.animationProps?.end ?? {}),
          ...(activePhase === "end" ? { [key]: value } : {}),
        },
      },
    });
  };

  return (
  <div className="space-y-5 p-4">
    <div className="flex items-center gap-0.5 flex-wrap">
      <ActionButton onClick={onDuplicate} title="Duplicate" icon={<Copy size={14} strokeWidth={1.5} />} />
      <ActionButton onClick={() => onMoveLayer("up")} title="Move up" icon={<ArrowUp size={14} strokeWidth={1.5} />} />
      <ActionButton onClick={() => onMoveLayer("down")} title="Move down" icon={<ArrowDown size={14} strokeWidth={1.5} />} />
      <ActionButton onClick={() => onMoveLayer("top")} title="Bring to front" icon={<ChevronsUp size={14} strokeWidth={1.5} />} />
      <ActionButton onClick={() => onMoveLayer("bottom")} title="Send to back" icon={<ChevronsDown size={14} strokeWidth={1.5} />} />
      <div className="flex-1" />
      <button
        onClick={onDelete}
        className="rounded p-1.5 text-destructive transition-colors hover:bg-destructive/10"
        title="Delete"
      >
        <Trash2 size={14} strokeWidth={1.5} />
      </button>
    </div>

    {element.type === "shape" && (
      <Section title="Shape">
        <div className="space-y-2.5">
          <Row label="Type">
            <select
              value={element.shapeType || "rectangle"}
              onChange={(e) => onUpdate({ shapeType: e.target.value as CanvasElement["shapeType"] })}
              className="h-7 rounded-md border border-editor-inspector-border bg-accent/50 px-2 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              <option value="rectangle">Rectangle</option>
              <option value="circle">Circle</option>
              <option value="triangle">Triangle</option>
              <option value="line">Line</option>
            </select>
          </Row>
          <Row label="Fill">
            <input
              type="color"
              value={element.backgroundColor || "#4488FF"}
              onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
              className="w-7 h-7 rounded border border-editor-inspector-border cursor-pointer"
            />
          </Row>
          <Row label="Border">
            <input
              type="color"
              value={element.borderColor || "#000000"}
              onChange={(e) => onUpdate({ borderColor: e.target.value })}
              className="w-7 h-7 rounded border border-editor-inspector-border cursor-pointer"
            />
          </Row>
          <Row label="Border Width">
            <input
              type="number"
              value={element.borderWidth || 0}
              onChange={(e) => onUpdate({ borderWidth: Number(e.target.value) })}
              className="w-16 h-7 px-2 text-[12px] bg-accent/50 border border-editor-inspector-border rounded-md text-foreground text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </Row>
          {element.shapeType !== "circle" && element.shapeType !== "triangle" && element.shapeType !== "line" && (
            <Row label="Radius">
              <input
                type="number"
                value={element.borderRadius || 0}
                onChange={(e) => onUpdate({ borderRadius: Number(e.target.value) })}
                className="w-16 h-7 px-2 text-[12px] bg-accent/50 border border-editor-inspector-border rounded-md text-foreground text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </Row>
          )}
        </div>
      </Section>
    )}

    {element.type === "table" && (
        <Section title="Table">
          <div className="space-y-2.5">
            <Row label="Rows">
              <input
                type="number"
                min="1"
                max="20"
                value={element.rows || 3}
                onChange={(e) => {
                  const newRows = Number(e.target.value);
                  const currentData = element.tableData || [];
                  const newData = Array(newRows).fill(null).map((_, i) =>
                    currentData[i] || Array(element.cols || 3).fill("")
                  );
                  onUpdate({ rows: newRows, tableData: newData });
                }}
                className="w-16 h-7 px-2 text-[12px] bg-accent/50 border border-editor-inspector-border rounded-md text-foreground text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </Row>
            <Row label="Columns">
              <input
                type="number"
                min="1"
                max="20"
                value={element.cols || 3}
                onChange={(e) => {
                  const newCols = Number(e.target.value);
                  const currentData = element.tableData || [];
                  const newData = currentData.map(row => {
                    const newRow = [...row];
                    newRow.length = newCols;
                    for (let i = row.length; i < newCols; i++) {
                      newRow[i] = "";
                    }
                    return newRow;
                  });
                  onUpdate({ cols: newCols, tableData: newData });
                }}
                className="w-16 h-7 px-2 text-[12px] bg-accent/50 border border-editor-inspector-border rounded-md text-foreground text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </Row>
            <Row label="Text Color">
              <input
                type="color"
                value={element.color || "#000000"}
                onChange={(e) => onUpdate({ color: e.target.value })}
                className="h-7 w-7 cursor-pointer rounded border border-editor-inspector-border"
              />
            </Row>
            <Row label="Border Color">
              <input
                type="color"
                value={element.borderColor || "#000000"}
                onChange={(e) => onUpdate({ borderColor: e.target.value })}
                className="h-7 w-7 cursor-pointer rounded border border-editor-inspector-border"
              />
            </Row>
            <Row label="Border Width">
              <input
                type="number"
                min="0"
                value={element.borderWidth || 1}
                onChange={(e) => onUpdate({ borderWidth: Number(e.target.value) })}
                className="w-16 h-7 px-2 text-[12px] bg-accent/50 border border-editor-inspector-border rounded-md text-foreground text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </Row>
            <Row label="Font Size">
              <input
                type="number"
                min="8"
                value={element.fontSize || 14}
                onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
                className="w-16 h-7 px-2 text-[12px] bg-accent/50 border border-editor-inspector-border rounded-md text-foreground text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </Row>
          </div>
        </Section>
      )}

      {element.type === "video" && (
        <Section title="Video">
          <div className="space-y-2.5">
            <Row label="Duration">
              <input
                type="number"
                min="1"
                value={element.duration || 1}
                onChange={(e) => onUpdate({ duration: Math.max(1, Number(e.target.value) || 1) })}
                className="w-16 h-7 px-2 text-[12px] bg-accent/50 border border-editor-inspector-border rounded-md text-foreground text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </Row>
          </div>
        </Section>
      )}

    <Section title="Position & Size">
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "X", value: element.x, key: "x" },
          { label: "Y", value: element.y, key: "y" },
          { label: "W", value: element.width, key: "width" },
          { label: "H", value: element.height, key: "height" },
        ].map(({ label, value, key }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="w-3 text-[10px] font-medium text-muted-foreground">{label}</span>
            <input
              type="number"
              value={Math.round(value)}
              onChange={(e) => onUpdate({ [key]: Number(e.target.value) })}
              className="flex-1 h-7 w-full text-[12px] bg-accent/50 border border-editor-inspector-border rounded-md text-foreground text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
        ))}
      </div>
    </Section>

      <Section title="Transform">
        <div className="space-y-2.5">
          <Row label="Opacity">
            <div className="flex items-center gap-1.5">
              <input
                type="range"
                min="0"
                max="100"
                value={element.opacity ?? 100}
                onChange={(e) => onUpdate({ opacity: Number(e.target.value) })}
                className="w-16 h-1 accent-primary"
              />
              <input
                type="number"
                min="0"
                max="100"
                value={element.opacity ?? 100}
                onChange={(e) => onUpdate({ opacity: Number(e.target.value) })}
                className="w-12 h-7 px-1 text-[12px] bg-accent/50 border border-editor-inspector-border rounded-md text-foreground text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </Row>
          <Row label="Rotation">
            <div className="flex items-center gap-1.5">
              <input
                type="range"
                min="0"
                max="360"
                value={element.rotation || 0}
                onChange={(e) => onUpdate({ rotation: Number(e.target.value) })}
                className="w-16 h-1 accent-primary"
              />
              <input
                type="number"
                min="0"
                max="360"
                value={element.rotation || 0}
                onChange={(e) => onUpdate({ rotation: Number(e.target.value) })}
                className="w-12 h-7 px-1 text-[12px] bg-accent/50 border border-editor-inspector-border rounded-md text-foreground text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </Row>
          <Row label="Scale">
            <div className="flex items-center gap-1.5">
              <input
                type="range"
                min="0.25"
                max="3"
                step="0.05"
                value={element.scale ?? 1}
                onChange={(e) => onUpdate({ scale: Number(e.target.value) })}
                className="w-16 h-1 accent-primary"
              />
              <input
                type="number"
                min="0.25"
                max="3"
                step="0.05"
                value={element.scale ?? 1}
                onChange={(e) => onUpdate({ scale: Number(e.target.value) })}
                className="w-12 h-7 px-1 text-[12px] bg-accent/50 border border-editor-inspector-border rounded-md text-foreground text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </Row>
        </div>
      </Section>

      <Section title="Motion">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {(["start", "end"] as const).map((phase) => (
              <button
                key={phase}
                type="button"
                onClick={() => updateAnimationPhase(phase)}
                className={`rounded-xl border px-3 py-2 text-sm font-medium capitalize transition ${
                  activePhase === phase
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-editor-inspector-border bg-accent/30 text-muted-foreground"
                }`}
              >
                {phase}
              </button>
            ))}
          </div>

          <Row label="Fade">
            <div className="flex items-center gap-1.5">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={activeAnimation.opacity}
                onChange={(e) => updateAnimationValue("opacity", Number(e.target.value))}
                className="w-16 h-1 accent-primary"
              />
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={activeAnimation.opacity}
                onChange={(e) => updateAnimationValue("opacity", Number(e.target.value))}
                className="w-12 h-7 px-1 text-[12px] bg-accent/50 border border-editor-inspector-border rounded-md text-foreground text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </Row>
          <Row label="Offset X">
            <div className="flex items-center gap-1.5">
              <input
                type="range"
                min="-400"
                max="400"
                step="1"
                value={activeAnimation.x}
                onChange={(e) => updateAnimationValue("x", Number(e.target.value))}
                className="w-16 h-1 accent-primary"
              />
              <input
                type="number"
                min="-400"
                max="400"
                value={activeAnimation.x}
                onChange={(e) => updateAnimationValue("x", Number(e.target.value))}
                className="w-12 h-7 px-1 text-[12px] bg-accent/50 border border-editor-inspector-border rounded-md text-foreground text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </Row>
          <Row label="Offset Y">
            <div className="flex items-center gap-1.5">
              <input
                type="range"
                min="-400"
                max="400"
                step="1"
                value={activeAnimation.y}
                onChange={(e) => updateAnimationValue("y", Number(e.target.value))}
                className="w-16 h-1 accent-primary"
              />
              <input
                type="number"
                min="-400"
                max="400"
                value={activeAnimation.y}
                onChange={(e) => updateAnimationValue("y", Number(e.target.value))}
                className="w-12 h-7 px-1 text-[12px] bg-accent/50 border border-editor-inspector-border rounded-md text-foreground text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </Row>
          <Row label="Scale">
            <div className="flex items-center gap-1.5">
              <input
                type="range"
                min="0.25"
                max="3"
                step="0.05"
                value={activeAnimation.scale}
                onChange={(e) => updateAnimationValue("scale", Number(e.target.value))}
                className="w-16 h-1 accent-primary"
              />
              <input
                type="number"
                min="0.25"
                max="3"
                step="0.05"
                value={activeAnimation.scale}
                onChange={(e) => updateAnimationValue("scale", Number(e.target.value))}
                className="w-12 h-7 px-1 text-[12px] bg-accent/50 border border-editor-inspector-border rounded-md text-foreground text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </Row>

          <Row label="Rotation">
            <div className="flex items-center gap-1.5">
              <input
                type="range"
                min="-360"
                max="360"
                step="1"
                value={activeAnimation.rotation}
                onChange={(e) => updateAnimationValue("rotation", Number(e.target.value))}
                className="w-16 h-1 accent-primary"
              />
              <input
                type="number"
                min="-360"
                max="360"
                value={activeAnimation.rotation}
                onChange={(e) => updateAnimationValue("rotation", Number(e.target.value))}
                className="w-12 h-7 px-1 text-[12px] bg-accent/50 border border-editor-inspector-border rounded-md text-foreground text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </Row>
        </div>
    </Section>
  </div>
  );
};

// ── Shared UI Components ──
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2.5">{title}</p>
    {children}
  </div>
);

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center justify-between">
    <span className="text-[12px] text-muted-foreground">{label}</span>
    {children}
  </div>
);

const ActionButton: React.FC<{ onClick: () => void; title: string; icon: React.ReactNode }> = ({
  onClick,
  title,
  icon,
}) => (
  <button
    onClick={onClick}
    className="rounded p-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:p-1.5"
    title={title}
  >
    {icon}
  </button>
);

const DesignToggleRow: React.FC<{ label: string; on: boolean; onToggle: (on: boolean) => void }> = ({
  label,
  on,
  onToggle,
}) => (
  <div className="flex items-center justify-between">
    <span className="text-[13px] text-[#718096]">{label}</span>
    <button
      type="button"
      onClick={() => onToggle(!on)}
      className={`relative flex h-8 w-12 items-center rounded-full p-0.5 transition-colors ${on ? "bg-[#46c0f1]" : "bg-[#eceff3]"}`}
    >
      <span
        className={`h-7 w-7 rounded-full bg-white shadow-sm transition-transform ${on ? "translate-x-4" : "translate-x-0"}`}
      />
    </button>
  </div>
);
