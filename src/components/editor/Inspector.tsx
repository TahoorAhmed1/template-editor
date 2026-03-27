import React from "react";
import {
  Trash2, Copy, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown,
  AlignLeft, AlignCenter, AlignRight, Plus, Lock, Unlock,
  FlipHorizontal, FlipVertical, Bold, Italic, Underline,
} from "lucide-react";
import type { CanvasElement, CanvasSizePreset, EditorMode } from "./EditorShell";

interface InspectorProps {
  selectedElement: CanvasElement | null;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  onMoveLayer: (id: string, direction: "up" | "down" | "top" | "bottom") => void;
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
  isMobile?: boolean;
}

export const Inspector: React.FC<InspectorProps> = ({
  selectedElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onMoveLayer,
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
  isMobile,
}) => {
  if (isMobile) return null;

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-editor-inspector">
      <div className="px-4 py-3 border-b border-editor-inspector-border">
        <h2 className="text-sm font-semibold text-foreground">
          {selectedElement
            ? selectedElement.type === "text"
              ? "Text"
              : selectedElement.type === "shape"
              ? "Shape"
              : selectedElement.type === "video"
              ? "Video"
              : "Image"
            : "Design"}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto editor-scroll">
        {selectedElement ? (
          <ElementInspector
            element={selectedElement}
            onUpdate={(updates) => onUpdateElement(selectedElement.id, updates)}
            onDelete={() => onDeleteElement(selectedElement.id)}
            onDuplicate={() => onDuplicateElement(selectedElement.id)}
            onMoveLayer={(dir) => onMoveLayer(selectedElement.id, dir)}
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
  const [bgType, setBgType] = React.useState<"solid" | "gradient" | "image">("solid");

  const show = (section: "size" | "styles" | "background" | "title" | "layout") =>
    !visibleSections || visibleSections.includes(section);

  return (
    <div className="p-4 space-y-5">
      {show("size") && (
        <Section title="Size">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-foreground">{canvasSize.label}</p>
              <p className="text-[11px] text-muted-foreground">
                {canvasSize.width}px × {canvasSize.height}px
              </p>
            </div>
          </div>
        </Section>
      )}

      {show("styles") && (
        <Section title="Styles">
          <button className="w-full h-9 rounded-lg border border-dashed border-editor-inspector-border hover:border-primary/50 transition-colors flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground text-[12px]">
            <Plus size={14} />
          </button>
        </Section>
      )}

      {show("background") && (
        <Section title="Background">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <select
                value={bgType}
                onChange={(e) => setBgType(e.target.value as "solid" | "gradient" | "image")}
                className="h-8 px-2 text-[12px] bg-accent/50 border border-editor-inspector-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 w-full"
              >
                <option value="solid">Solid Color</option>
                <option value="gradient">Gradient</option>
                <option value="image">Image</option>
              </select>
            </div>

            {bgType === "solid" && (
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-muted-foreground">Color</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={canvasBackground.startsWith("#") ? canvasBackground : "#ffffff"}
                    onChange={(e) => onBackgroundChange(e.target.value)}
                    className="w-8 h-8 rounded-md border border-editor-inspector-border cursor-pointer"
                  />
                </div>
              </div>
            )}

            {bgType === "gradient" && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
                  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
                  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
                ].map((gradient, i) => (
                  <button
                    key={i}
                    onClick={() => onBackgroundChange(gradient)}
                    className={`w-full aspect-square rounded-md border transition-transform hover:scale-105 ${
                      canvasBackground === gradient
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-editor-inspector-border"
                    }`}
                    style={{ background: gradient }}
                  />
                ))}
              </div>
            )}

            {bgType === "image" && (
              <div className="text-[12px] text-muted-foreground text-center py-3">
                Upload or choose a background image from the Media panel.
              </div>
            )}
          </div>
        </Section>
      )}

      {show("title") && (
        <Section title="Title">
          <input
            type="text"
            value={designTitle}
            onChange={(e) => onDesignTitleChange(e.target.value)}
            className="w-full h-9 px-3 text-[13px] bg-accent/50 border border-editor-inspector-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </Section>
      )}

      {show("layout") && (
        <Section title="Layout">
          <div className="space-y-3">
            <ToggleRow label="Grid" on={gridEnabled} onToggle={onGridToggle} />

            {mode === "image" && (
              <>
                {/* <div className="flex items-center justify-between">
                  <span className="text-[12px] text-muted-foreground">Folds</span>
                  <select
                    value={folds}
                    onChange={(e) => onFoldsChange(e.target.value)}
                    className="h-8 px-2 text-[12px] bg-accent/50 border border-editor-inspector-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="none">None</option>
                    <option value="bi-fold">Bi-fold</option>
                    <option value="tri-fold">Tri-fold</option>
                    <option value="z-fold">Z-fold</option>
                  </select>
                </div> */}

                <ToggleRow label="Bleed" on={bleedEnabled} onToggle={onBleedToggle} />
              </>
            )}

            <ToggleRow
              label="Alignment Guides"
              on={alignmentGuides}
              onToggle={onAlignmentGuidesToggle}
            />
          </div>
        </Section>
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
}

const FONT_OPTIONS = [
  { label: "Inter", value: "'Inter', sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Impact", value: "Impact, sans-serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { label: "Palatino", value: "'Palatino Linotype', serif" },
  { label: "Garamond", value: "Garamond, serif" },
  { label: "Comic Sans MS", value: "'Comic Sans MS', cursive" },
  { label: "Lucida Console", value: "'Lucida Console', monospace" },
];

export const ElementInspector: React.FC<ElementInspectorProps> = ({ element, onUpdate, onDelete, onDuplicate, onMoveLayer }) => {
  const activePhase = element.animationProps?.activePhase ?? "end";
  const activeAnimation = element.animationProps?.[activePhase] ?? {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
  };

  const updateAnimationPhase = (phase: "start" | "end") => {
    onUpdate({
      animationProps: {
        activePhase: phase,
        start: element.animationProps?.start ?? { opacity: 0, x: 0, y: 20, scale: 1, rotation: 0 },
        end: element.animationProps?.end ?? { opacity: 1, x: 0, y: 0, scale: 1, rotation: 0 },
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
          opacity: 0,
          x: 0,
          y: 20,
          scale: 1,
          rotation: 0,
          ...(element.animationProps?.start ?? {}),
          ...(activePhase === "start" ? { [key]: value } : {}),
        },
        end: {
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
          ...(element.animationProps?.end ?? {}),
          ...(activePhase === "end" ? { [key]: value } : {}),
        },
      },
    });
  };

  return (
  <div className="p-4 space-y-5">
    {/* Actions bar */}
    <div className="flex items-center gap-0.5 flex-wrap">
      <ActionButton onClick={onDuplicate} title="Duplicate" icon={<Copy size={14} strokeWidth={1.5} />} />
      <ActionButton onClick={() => onMoveLayer("up")} title="Move up" icon={<ArrowUp size={14} strokeWidth={1.5} />} />
      <ActionButton onClick={() => onMoveLayer("down")} title="Move down" icon={<ArrowDown size={14} strokeWidth={1.5} />} />
      <ActionButton onClick={() => onMoveLayer("top")} title="Bring to front" icon={<ChevronsUp size={14} strokeWidth={1.5} />} />
      <ActionButton onClick={() => onMoveLayer("bottom")} title="Send to back" icon={<ChevronsDown size={14} strokeWidth={1.5} />} />
      <div className="flex-1" />
      <button
        onClick={onDelete}
        className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-destructive"
        title="Delete"
      >
        <Trash2 size={14} strokeWidth={1.5} />
      </button>
    </div>

    {/* ── TEXT properties ── */}
    {element.type === "text" && (
      <>
        <Section title="Text">
          <textarea
            value={element.content || ""}
            onChange={(e) => onUpdate({ content: e.target.value })}
            className="w-full h-20 p-3 text-[13px] bg-accent/50 border border-editor-inspector-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
          />
        </Section>

        <Section title="Font">
          <div className="space-y-2.5">
            <select
              value={element.fontFamily || "'Inter', sans-serif"}
              onChange={(e) => onUpdate({ fontFamily: e.target.value })}
              className="w-full h-8 px-2 text-[12px] bg-accent/50 border border-editor-inspector-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <select
                value={element.fontWeight || "400"}
                onChange={(e) => onUpdate({ fontWeight: e.target.value })}
                className="flex-1 h-8 px-2 text-[12px] bg-accent/50 border border-editor-inspector-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              >
                <option value="300">Light</option>
                <option value="400">Regular</option>
                <option value="500">Medium</option>
                <option value="600">Semibold</option>
                <option value="700">Bold</option>
                <option value="900">Black</option>
              </select>
              <input
                type="number"
                value={element.fontSize || 24}
                onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
                className="w-16 h-8 px-2 text-[12px] bg-accent/50 border border-editor-inspector-border rounded-md text-foreground text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50"
                title="Font size"
              />
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[11px] text-muted-foreground mr-1">Color</span>
              <input
                type="color"
                value={element.color || "#000000"}
                onChange={(e) => onUpdate({ color: e.target.value })}
                className="w-7 h-7 rounded border border-editor-inspector-border cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[11px] text-muted-foreground mr-1">Align</span>
              {(["left", "center", "right"] as const).map((align) => {
                const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight;
                return (
                  <button
                    key={align}
                    onClick={() => onUpdate({ textAlign: align })}
                    className={`p-1.5 rounded transition-colors ${
                      element.textAlign === align ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    <Icon size={14} strokeWidth={1.5} />
                  </button>
                );
              })}
            </div>

            {/* <Row label="Line Height">
              <div className="flex items-center gap-1.5">
                <input
                  type="range"
                  min="0.5"
                  max="4"
                  step="0.1"
                  value={element.lineHeight || 1.2}
                  onChange={(e) => onUpdate({ lineHeight: Number(e.target.value) })}
                  className="w-16 h-1 accent-primary"
                />
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="4"
                  value={element.lineHeight || 1.2}
                  onChange={(e) => onUpdate({ lineHeight: Number(e.target.value) })}
                  className="w-12 h-7 px-1 text-[12px] bg-accent/50 border border-editor-inspector-border rounded-md text-foreground text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
            </Row> */}

            <Row label="Letter Spacing">
              <div className="flex items-center gap-1.5">
                <input
                  type="range"
                  min="-5"
                  max="10"
                  step="0.5"
                  value={element.letterSpacing || 0}
                  onChange={(e) => onUpdate({ letterSpacing: Number(e.target.value) })}
                  className="w-16 h-1 accent-primary"
                />
                <input
                  type="number"
                  step="0.5"
                  min="-5"
                  max="10"
                  value={element.letterSpacing || 0}
                  onChange={(e) => onUpdate({ letterSpacing: Number(e.target.value) })}
                  className="w-12 h-7 px-1 text-[12px] bg-accent/50 border border-editor-inspector-border rounded-md text-foreground text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
            </Row>
          </div>
        </Section>
      </>
    )}

    {/* ── SHAPE properties ── */}
    {element.type === "shape" && (
      <Section title="Shape">
        <div className="space-y-2.5">
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

    {/* ── IMAGE properties ── */}
    {element.type === "image" && (
      <Section title="Image">
        <div className="space-y-2.5">
          <Row label="Radius">
            <input
              type="number"
              value={element.borderRadius || 0}
              onChange={(e) => onUpdate({ borderRadius: Number(e.target.value) })}
              className="w-16 h-7 px-2 text-[12px] bg-accent/50 border border-editor-inspector-border rounded-md text-foreground text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50"
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
          {(element.borderWidth || 0) > 0 && (
            <Row label="Border Color">
              <input
                type="color"
                value={element.borderColor || "#000000"}
                onChange={(e) => onUpdate({ borderColor: e.target.value })}
                className="w-7 h-7 rounded border border-editor-inspector-border cursor-pointer"
              />
            </Row>
          )}
          <Row label="Mask Shape">
            <select
              value={element.maskShape || "none"}
              onChange={(e) => onUpdate({ maskShape: e.target.value as any })}
              className="h-7 px-2 text-[12px] bg-accent/50 border border-editor-inspector-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              <option value="none">None</option>
              <option value="circle">Circle</option>
              <option value="rounded">Rounded</option>
              <option value="triangle">Triangle</option>
              <option value="star">Star</option>
              <option value="heart">Heart</option>
            </select>
          </Row>
        </div>
      </Section>
    )}

    {/* ── TABLE properties ── */}
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
          </div>
        </Section>
      )}

      <Section title="Filters">
        <div className="space-y-2.5">
          <Row label="Brightness">
            <div className="flex items-center gap-1.5">
              <input
                type="range"
                min="0"
                max="200"
                value={element.brightness ?? 100}
                onChange={(e) => onUpdate({ brightness: Number(e.target.value) })}
                className="w-16 h-1 accent-primary"
              />
              <input
                type="number"
                min="0"
                max="200"
                value={element.brightness ?? 100}
                onChange={(e) => onUpdate({ brightness: Number(e.target.value) })}
                className="w-12 h-7 px-1 text-[12px] bg-accent/50 border border-editor-inspector-border rounded-md text-foreground text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </Row>
          <Row label="Contrast">
            <div className="flex items-center gap-1.5">
              <input
                type="range"
                min="0"
                max="200"
                value={element.contrast ?? 100}
                onChange={(e) => onUpdate({ contrast: Number(e.target.value) })}
                className="w-16 h-1 accent-primary"
              />
              <input
                type="number"
                min="0"
                max="200"
                value={element.contrast ?? 100}
                onChange={(e) => onUpdate({ contrast: Number(e.target.value) })}
                className="w-12 h-7 px-1 text-[12px] bg-accent/50 border border-editor-inspector-border rounded-md text-foreground text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </Row>
          <Row label="Saturation">
            <div className="flex items-center gap-1.5">
              <input
                type="range"
                min="0"
                max="200"
                value={element.saturation ?? 100}
                onChange={(e) => onUpdate({ saturation: Number(e.target.value) })}
                className="w-16 h-1 accent-primary"
              />
              <input
                type="number"
                min="0"
                max="200"
                value={element.saturation ?? 100}
                onChange={(e) => onUpdate({ saturation: Number(e.target.value) })}
                className="w-12 h-7 px-1 text-[12px] bg-accent/50 border border-editor-inspector-border rounded-md text-foreground text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </Row>
          <Row label="Hue Rotate">
            <div className="flex items-center gap-1.5">
              <input
                type="range"
                min="0"
                max="360"
                value={element.hueRotate ?? 0}
                onChange={(e) => onUpdate({ hueRotate: Number(e.target.value) })}
                className="w-16 h-1 accent-primary"
              />
              <input
                type="number"
                min="0"
                max="360"
                value={element.hueRotate ?? 0}
                onChange={(e) => onUpdate({ hueRotate: Number(e.target.value) })}
                className="w-12 h-7 px-1 text-[12px] bg-accent/50 border border-editor-inspector-border rounded-md text-foreground text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </Row>
          <Row label="Blur">
            <div className="flex items-center gap-1.5">
              <input
                type="range"
                min="0"
                max="20"
                step="0.1"
                value={element.blur ?? 0}
                onChange={(e) => onUpdate({ blur: Number(e.target.value) })}
                className="w-16 h-1 accent-primary"
              />
              <input
                type="number"
                min="0"
                max="20"
                step="0.1"
                value={element.blur ?? 0}
                onChange={(e) => onUpdate({ blur: Number(e.target.value) })}
                className="w-12 h-7 px-1 text-[12px] bg-accent/50 border border-editor-inspector-border rounded-md text-foreground text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </Row>
          <Row label="Invert">
            <div className="flex items-center gap-1.5">
              <input
                type="range"
                min="0"
                max="100"
                value={element.invert ?? 0}
                onChange={(e) => onUpdate({ invert: Number(e.target.value) })}
                className="w-16 h-1 accent-primary"
              />
              <input
                type="number"
                min="0"
                max="100"
                value={element.invert ?? 0}
                onChange={(e) => onUpdate({ invert: Number(e.target.value) })}
                className="w-12 h-7 px-1 text-[12px] bg-accent/50 border border-editor-inspector-border rounded-md text-foreground text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </Row>
        </div>
      </Section>

      <Section title="Animation">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {(["start", "end"] as const).map((phase) => (
              <button
                key={phase}
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

          <Row label="Offset Y">
            <div className="flex items-center gap-1.5">
              <input
                type="range"
                min="-200"
                max="200"
                step="1"
                value={activeAnimation.y}
                onChange={(e) => updateAnimationValue("y", Number(e.target.value))}
                className="w-16 h-1 accent-primary"
              />
              <input
                type="number"
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
                max="2"
                step="0.05"
                value={activeAnimation.scale}
                onChange={(e) => updateAnimationValue("scale", Number(e.target.value))}
                className="w-16 h-1 accent-primary"
              />
              <input
                type="number"
                min="0.25"
                max="2"
                step="0.05"
                value={activeAnimation.scale}
                onChange={(e) => updateAnimationValue("scale", Number(e.target.value))}
                className="w-12 h-7 px-1 text-[12px] bg-accent/50 border border-editor-inspector-border rounded-md text-foreground text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </Row>
        </div>
      </Section>

    {/* Position - all types */}
    <Section title="Position">
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "X", value: element.x, key: "x" },
          { label: "Y", value: element.y, key: "y" },
          { label: "W", value: element.width, key: "width" },
          { label: "H", value: element.height, key: "height" },
        ].map(({ label, value, key }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground font-medium w-3">{label}</span>
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

    {/* Effects - all types */}
    <Section title="Effects">
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

const ToggleRow: React.FC<{ label: string; on: boolean; onToggle: (on: boolean) => void }> = ({
  label,
  on,
  onToggle,
}) => (
  <div className="flex items-center justify-between">
    <span className="text-[12px] text-muted-foreground">{label}</span>
    <button
      onClick={() => onToggle(!on)}
      className={`relative flex h-11 w-12 items-center rounded-full p-1 transition-colors duration-200 md:h-6 md:w-11 ${on ? "bg-primary" : "bg-muted"}`}
    >
      <div
        className={`h-4 w-4 rounded-full bg-primary-foreground shadow transition-transform duration-200 ${
          on ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  </div>
);
