import React from "react";
import {
  Trash2, Copy, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown,
  ArrowLeft, ChevronDown, ChevronRight, CircleOff, Pipette, Play, Plus, Search, Shuffle, Sparkles,
} from "lucide-react";
import type { CanvasElement, CanvasSizePreset, EditorMode, DrawSettings, ActiveTool } from "./EditorShell";
import { buildBackgroundValue, clamp, hexToHsv, hsvToHex, normalizeHexColor, parseBackgroundValue, type BackgroundDraft, type BackgroundEditorType } from "./backgroundUtils";
import { DEFAULT_LINEAR_GRADIENT, DEFAULT_RADIAL_GRADIENT, DESIGN_DEFAULT_PRESET_COLORS, DESIGN_HISTORY_COLORS, DESIGN_STYLE_FILTERS, DESIGN_STYLE_LIBRARY, DESIGN_STYLE_RECENTS, DESIGN_STYLE_SWATCHES, getCanvasSizePresets } from "./designPanelConfig";
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
  onCanvasSizeChange: (preset: CanvasSizePreset) => void;
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
  onCanvasSizeChange,
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
            onCanvasSizeChange={onCanvasSizeChange}
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

type DesignInspectorSection = "size" | "styles" | "background" | "animation" | "title" | "layout";

interface DesignInspectorProps {
  canvasSize: CanvasSizePreset;
  onCanvasSizeChange: (preset: CanvasSizePreset) => void;
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
  visibleSections?: DesignInspectorSection[];
}

const makeSizeOptionValue = (preset: CanvasSizePreset) => `${preset.label}:${preset.width}x${preset.height}`;

const formatCanvasSizeLabel = (preset: CanvasSizePreset) =>
  preset.description ?? `${preset.width.toLocaleString()} x ${preset.height.toLocaleString()}`;

const createGradientDraft = (kind: BackgroundEditorType): BackgroundDraft => ({
  type: kind,
  colors: parseBackgroundValue(kind === "radial" ? DEFAULT_RADIAL_GRADIENT : DEFAULT_LINEAR_GRADIENT).colors,
  angleDeg: 135,
});

export const DesignInspector: React.FC<DesignInspectorProps> = ({
  canvasSize,
  onCanvasSizeChange,
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
  const [animationPhase, setAnimationPhase] = React.useState<"start" | "end">("start");
  const [backgroundDraft, setBackgroundDraft] = React.useState<BackgroundDraft>(() => parseBackgroundValue(canvasBackground));
  const backgroundDraftRef = React.useRef(backgroundDraft);
  const [gridSize, setGridSize] = React.useState(25);
  const [showStylesLibrary, setShowStylesLibrary] = React.useState(false);
  const [showColorEditor, setShowColorEditor] = React.useState(false);
  const [activeColorStop, setActiveColorStop] = React.useState<0 | 1>(0);
  const [selectedStylePalette, setSelectedStylePalette] = React.useState<string[]>([...DESIGN_STYLE_SWATCHES]);

  React.useEffect(() => {
    const parsed = parseBackgroundValue(canvasBackground);
    backgroundDraftRef.current = parsed;
    setBackgroundDraft(parsed);
  }, [canvasBackground]);

  React.useEffect(() => {
    backgroundDraftRef.current = backgroundDraft;
  }, [backgroundDraft]);

  const show = (section: DesignInspectorSection) =>
    !visibleSections || visibleSections.includes(section);
  const currentBackgroundMode = backgroundDraft.type === "solid" || backgroundDraft.type === "transparent"
    ? "solid"
    : "gradient";
  const sizeOptions = React.useMemo(() => {
    const presets = getCanvasSizePresets(mode);
    const currentKey = makeSizeOptionValue(canvasSize);

    if (presets.some((preset) => makeSizeOptionValue(preset) === currentKey)) {
      return presets;
    }

    return [
      { ...canvasSize, description: formatCanvasSizeLabel(canvasSize) },
      ...presets,
    ];
  }, [canvasSize, mode]);

  const commitBackgroundDraft = React.useCallback(
    (nextDraft: BackgroundDraft) => {
      backgroundDraftRef.current = nextDraft;
      setBackgroundDraft(nextDraft);
      onBackgroundChange(buildBackgroundValue(nextDraft));
    },
    [onBackgroundChange],
  );

  const handleBackgroundModeChange = (modeValue: "solid" | "gradient") => {
    if (modeValue === "solid") {
      commitBackgroundDraft({
        ...backgroundDraft,
        type: "solid",
      });
      return;
    }

    commitBackgroundDraft({
      ...(backgroundDraft.type === "linear" || backgroundDraft.type === "radial"
        ? backgroundDraft
        : createGradientDraft("linear")),
      type: backgroundDraft.type === "radial" ? "radial" : "linear",
    });
  };

  const isStylesOnlyView = visibleSections?.length === 1 && visibleSections[0] === "styles";

  const applyStylePalette = React.useCallback(
    (palette: readonly string[]) => {
      const nextPalette = [...palette];
      setSelectedStylePalette(nextPalette);

      if (backgroundDraftRef.current.type === "linear" || backgroundDraftRef.current.type === "radial") {
        commitBackgroundDraft({
          ...backgroundDraftRef.current,
          colors: [palette[0], palette[palette.length - 1]],
        });
        return;
      }

      commitBackgroundDraft({
        ...backgroundDraftRef.current,
        type: "solid",
        colors: [palette[Math.min(2, palette.length - 1)], backgroundDraftRef.current.colors[1]],
      });
    },
    [commitBackgroundDraft],
  );

  if (showStylesLibrary || isStylesOnlyView) {
    return (
      <StylesLibraryPanel
        showHeader={showStylesLibrary && !visibleSections}
        onBack={() => setShowStylesLibrary(false)}
        onApplyPalette={applyStylePalette}
      />
    );
  }

  if (showColorEditor) {
    return (
      <ColorEditorPanel
        draft={backgroundDraft}
        activeColorStop={activeColorStop}
        onBack={() => setShowColorEditor(false)}
        onDraftChange={commitBackgroundDraft}
        onActiveColorStopChange={setActiveColorStop}
      />
    );
  }

  const shellClass = visibleSections
    ? "min-h-full "
    : "min-h-full ";
  const contentClass = visibleSections
    ? "space-y-6"
    : "overflow-hidden   bg-white ";
  const previewPalette = selectedStylePalette.length >= 5
    ? selectedStylePalette
    : [...DESIGN_STYLE_SWATCHES];
  const currentBackgroundPreview = backgroundDraft.type === "solid" || backgroundDraft.type === "transparent"
    ? backgroundDraft.colors[0]
    : buildBackgroundValue(backgroundDraft);

  return (
    <div className={shellClass}>
      <div className={contentClass}>
      

        <div className="space-y-5 px-4 py-5">
          {show("size") ? (
            <div className="flex items-start justify-between gap-4">
              <span className="pt-3 text-[13px] text-[#718096]">Size</span>
              <label className="relative block w-[138px] shrink-0 cursor-pointer">
                <span className="block rounded-[10px] border border-[#D7DEE8] bg-white px-3 py-[9px] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                  <span className="block text-[13px] font-semibold leading-4 text-[#4A5568]">{canvasSize.label}</span>
                  <span className="mt-1 block text-[12px] leading-4 text-[#8A94A6]">{formatCanvasSizeLabel(canvasSize)}</span>
                </span>
                <select
                  value={makeSizeOptionValue(canvasSize)}
                  onChange={(event) => {
                    const nextPreset = sizeOptions.find(
                      (preset) => makeSizeOptionValue(preset) === event.target.value,
                    );
                    if (nextPreset) {
                      onCanvasSizeChange(nextPreset);
                    }
                  }}
                  className="absolute inset-0 cursor-pointer opacity-0"
                >
                  {sizeOptions.map((preset) => (
                    <option key={makeSizeOptionValue(preset)} value={makeSizeOptionValue(preset)}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          {show("styles") ? (
            <div className="flex items-center justify-between gap-4">
              <span className="text-[13px] text-[#718096]">Styles</span>
              <button
                type="button"
                onClick={() => setShowStylesLibrary(true)}
                className="flex shrink-0 items-center overflow-hidden rounded-[9px] border border-[#D7DEE8] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition hover:bg-[#FBFCFE]"
              >
                <div className="m-1 flex h-7 w-[110px] overflow-hidden rounded-[6px]">
                  {previewPalette.slice(0, 5).map((color) => (
                    <span key={color} className="flex-1" style={{ backgroundColor: color }} />
                  ))}
                </div>
                <span className="flex h-9 w-8 items-center justify-center border-l border-[#E4E8EF] text-[#677489]">
                  <Plus size={14} />
                </span>
              </button>
            </div>
          ) : null}

          {show("background") ? (
            <div className="space-y-4 border-b border-[#E8ECF2] pb-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[13px] text-[#718096]">Background</span>
                <div className="relative pr-5 text-[14px] text-[#4A5568]">
                  <select
                    value={currentBackgroundMode}
                    onChange={(event) => handleBackgroundModeChange(event.target.value as "solid" | "gradient")}
                    className="appearance-none bg-transparent pr-1 outline-none"
                  >
                    <option value="solid">Solid</option>
                    <option value="gradient">Gradient</option>
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowColorEditor(true)}
                className="flex w-full items-center justify-between rounded-[4px] border border-[#EEF1F5] bg-[#FAFBFD] px-4 py-3 text-left transition hover:bg-[#F6F9FC]"
              >
                <span className="text-[13px] text-[#718096]">Color</span>
                <span
                  className="h-10 w-12 rounded-[3px] border border-[#D7DCE3] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]"
                  style={getBackgroundPreviewStyle(currentBackgroundPreview)}
                />
              </button>
            </div>
          ) : null}

          {/* {show("animation") && !visibleSections ? (
            <div className="flex items-start justify-between gap-4 border-b border-[#E8ECF2] pb-4">
              <span className="pt-3 text-[13px] text-[#718096]">Animation</span>
              <div className="flex gap-3">
                {[
                  { value: "start" as const, label: "Start", icon: Play },
                  { value: "end" as const, label: "End", icon: Sparkles },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAnimationPhase(value)}
                    className="flex flex-col items-center gap-1"
                  >
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-[10px] border border-dashed transition ${
                        animationPhase === value
                          ? "border-[#AAC6E6] bg-[#F7FBFF] text-[#3F5676]"
                          : "border-[#D6DCE6] bg-white text-[#6A7385]"
                      }`}
                    >
                      <Icon size={15} />
                    </span>
                    <span className="text-[12px] text-[#717C90]">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null} */}

          {show("title") ? (
            <div className="space-y-3 border-b border-[#E8ECF2] pb-4">
              <SectionRuleLabel label="Title" />
              <input
                type="text"
                value={designTitle}
                onChange={(event) => onDesignTitleChange(event.target.value)}
                placeholder="A New Design"
                className="h-10 w-full rounded-[3px] border border-[#D7DCE3] bg-white px-3 text-[13px] text-[#4A5568] outline-none transition placeholder:text-[#93A0B2] focus:border-[#9CCDE9] focus:ring-1 focus:ring-[#BEE7FB]"
              />
            </div>
          ) : null}

          {show("layout") ? (
            <div className="space-y-4">
              <SectionRuleLabel label="Layout" />
              <DesignToggleRow label="Grid" on={gridEnabled} onToggle={onGridToggle} />

              {/* <div className="rounded-[4px] border border-[#EEF1F5] bg-[#FAFBFD] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] text-[#718096]">Size</span>
                  <div className="flex items-center overflow-hidden rounded-[4px] border border-[#D7DEE8] bg-white">
                    <button
                      type="button"
                      onClick={() => setGridSize((current) => Math.max(1, current - 1))}
                      className="flex h-8 w-8 items-center justify-center text-[#5A667A] transition hover:bg-[#F8FAFC]"
                    >
                      -
                    </button>
                    <span className="flex h-8 min-w-[40px] items-center justify-center border-x border-[#E4E8EF] px-2 text-[12px] font-medium text-[#4A5568]">
                      {gridSize}
                    </span>
                    <button
                      type="button"
                      onClick={() => setGridSize((current) => Math.min(100, current + 1))}
                      className="flex h-8 w-8 items-center justify-center text-[#5A667A] transition hover:bg-[#F8FAFC]"
                    >
                      +
                    </button>
                  </div>
                </div>

                <input
                  type="range"
                  min="1"
                  max="100"
                  value={gridSize}
                  onChange={(event) => setGridSize(Number(event.target.value))}
                  className="mt-4 h-1 w-full cursor-pointer appearance-none rounded-full bg-[#D7DEE8] accent-[#7650e3]"
                />
              </div> */}

              {/* {mode === "image" ? (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[13px] text-[#718096]">Folds</span>
                  <div className="relative flex items-center gap-2 pr-5 text-[14px] text-[#4A5568]">
                    <CircleOff size={14} className="text-[#7C8798]" />
                    <select
                      value={folds}
                      onChange={(event) => onFoldsChange(event.target.value)}
                      className="appearance-none bg-transparent outline-none"
                    >
                      <option value="none">None</option>
                      <option value="bi-fold">Bi-fold</option>
                      <option value="tri-fold">Tri-fold</option>
                      <option value="z-fold">Z-fold</option>
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                  </div>
                </div>
              ) : null} */}

              {/* {mode === "image" ? (
                <DesignToggleRow label="Bleed" on={bleedEnabled} onToggle={onBleedToggle} />
              ) : null} */}
              <DesignToggleRow label="Alignment Guides" on={alignmentGuides} onToggle={onAlignmentGuidesToggle} />
            </div>
          ) : null}
        </div>
      </div>
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

  </div>
  );
};

// ── Shared UI Components ──
type StylesLibraryPanelProps = {
  showHeader?: boolean;
  onBack: () => void;
  onApplyPalette: (palette: readonly string[]) => void;
};

type ColorEditorPanelProps = {
  draft: BackgroundDraft;
  activeColorStop: 0 | 1;
  onBack: () => void;
  onDraftChange: (nextDraft: BackgroundDraft) => void;
  onActiveColorStopChange: (value: 0 | 1) => void;
};

const mergeUniqueColors = (colors: readonly string[]) => {
  const seen = new Set<string>();

  return colors.filter((color) => {
    const normalized = color.toUpperCase();
    if (seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
};

const getBackgroundPreviewStyle = (background: string): React.CSSProperties => {
  if (background === "transparent") {
    return {
      backgroundColor: "#F8FAFC",
      backgroundImage: "linear-gradient(45deg, #E2E8F0 25%, transparent 25%), linear-gradient(-45deg, #E2E8F0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #E2E8F0 75%), linear-gradient(-45deg, transparent 75%, #E2E8F0 75%)",
      backgroundSize: "12px 12px",
      backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0px",
    };
  }

  return { background };
};

const StylesLibraryPanel: React.FC<StylesLibraryPanelProps> = ({
  showHeader,
  onBack,
  onApplyPalette,
}) => {
  const [search, setSearch] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<(typeof DESIGN_STYLE_FILTERS)[number]>(DESIGN_STYLE_FILTERS[0]);

  const allPalettes = React.useMemo(
    () => DESIGN_STYLE_LIBRARY.map((colors, index) => ({
      id: `style-${index}`,
      colors,
      filter: DESIGN_STYLE_FILTERS[index % DESIGN_STYLE_FILTERS.length],
      label: `Style ${index + 1}`,
    })),
    [],
  );

  const filteredPalettes = allPalettes.filter((palette) => {
    const matchesFilter = palette.filter === activeFilter;
    const matchesSearch = search.trim().length === 0 || palette.label.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-5 bg-white px-4 py-4 text-[#4A5568]">
      {showHeader ? (
        <div className="flex items-center justify-between border-b border-[#E3E7EE] pb-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#5F6C81] transition hover:bg-[#F5F7FB]"
            aria-label="Back"
          >
            <ArrowLeft size={16} />
          </button>
          <h3 className="pr-8 text-[16px] font-medium text-[#2D3758]">Styles</h3>
        </div>
      ) : null}

      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search Styles, e.g. New Ye..."
          className="h-10 w-full rounded-[6px] border border-[#D7DEE8] bg-white pl-3 pr-9 text-[13px] text-[#4A5568] outline-none placeholder:text-[#9AA4B3] focus:border-[#C6D4E4]"
        />
        <Search size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#7C8798]" />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {DESIGN_STYLE_FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveFilter(filter)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[13px] transition ${
              activeFilter === filter
                ? "border-[#C9D4E2] bg-[#F8FAFC] text-[#2D3758]"
                : "border-[#D7DEE8] bg-white text-[#5C6880] hover:bg-[#F8FAFC]"
            }`}
          >
            {filter}
          </button>
        ))}
        <button
          type="button"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#D7DEE8] bg-white text-[#6B7280] shadow-[0_2px_6px_rgba(15,23,42,0.08)]"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <SectionRuleLabel label="Recents" />
      <div className="space-y-3">
        {DESIGN_STYLE_RECENTS.map((palette, index) => (
          <StylePaletteCard key={`recent-${index}`} palette={palette} onApply={onApplyPalette} />
        ))}
      </div>

      <SectionRuleLabel label="All Styles" />
      <div className="space-y-3">
        {filteredPalettes.map((palette) => (
          <StylePaletteCard key={palette.id} palette={palette.colors} onApply={onApplyPalette} />
        ))}
      </div>
    </div>
  );
};

const ColorEditorPanel: React.FC<ColorEditorPanelProps> = ({
  draft,
  activeColorStop,
  onBack,
  onDraftChange,
  onActiveColorStopChange,
}) => {
  const saturationRef = React.useRef<HTMLDivElement>(null);
  const editorType = draft.type === "transparent" ? "solid" : draft.type;
  const activeIndex = editorType === "solid" ? 0 : activeColorStop;
  const activeColor = draft.colors[activeIndex];
  const hsv = React.useMemo(() => hexToHsv(activeColor), [activeColor]);
  const hueTrackColor = React.useMemo(() => hsvToHex(hsv.h, 1, 1), [hsv.h]);
  const recentColors = React.useMemo(
    () => mergeUniqueColors([draft.colors[0], draft.colors[1], ...DESIGN_HISTORY_COLORS]).slice(0, 6),
    [draft.colors],
  );
  const [hexInput, setHexInput] = React.useState(activeColor.replace("#", ""));

  React.useEffect(() => {
    setHexInput(activeColor.replace("#", ""));
  }, [activeColor]);

  const updateDraftColor = React.useCallback(
    (nextColor: string) => {
      const normalized = normalizeHexColor(nextColor);
      if (!normalized) {
        return;
      }

      const nextColors: [string, string] = [...draft.colors] as [string, string];
      nextColors[activeIndex] = normalized;
      onDraftChange({
        ...draft,
        type: draft.type === "transparent" ? "solid" : draft.type,
        colors: nextColors,
      });
    },
    [activeIndex, draft, onDraftChange],
  );

  const updatePickerSurface = React.useCallback(
    (clientX: number, clientY: number) => {
      const rect = saturationRef.current?.getBoundingClientRect();
      if (!rect) return;

      const saturation = clamp((clientX - rect.left) / rect.width, 0, 1);
      const value = clamp(1 - (clientY - rect.top) / rect.height, 0, 1);
      updateDraftColor(hsvToHex(hsv.h, saturation, value));
    },
    [hsv.h, updateDraftColor],
  );

  const handleSurfacePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    updatePickerSurface(event.clientX, event.clientY);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      updatePickerSurface(moveEvent.clientX, moveEvent.clientY);
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const handleTypeChange = (nextType: BackgroundEditorType) => {
    if (nextType === "solid") {
      onDraftChange({
        ...draft,
        type: "solid",
      });
      onActiveColorStopChange(0);
      return;
    }

    const seededDraft = createGradientDraft(nextType);
    onDraftChange({
      ...draft,
      type: nextType,
      colors: draft.type === "linear" || draft.type === "radial"
        ? draft.colors
        : [draft.colors[0], seededDraft.colors[1]],
    });
  };

  const handleHexInputChange = (value: string) => {
    const cleaned = value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
    setHexInput(cleaned.toUpperCase());

    const normalized = normalizeHexColor(cleaned);
    if (normalized) {
      updateDraftColor(normalized);
    }
  };

  const handleEyedropper = async () => {
    const eyeDropperSource = window as Window & {
      EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> };
    };

    if (!eyeDropperSource.EyeDropper) {
      return;
    }

    try {
      const eyeDropper = new eyeDropperSource.EyeDropper();
      const result = await eyeDropper.open();
      updateDraftColor(result.sRGBHex);
    } catch {
      // User canceled the eyedropper.
    }
  };

  return (
    <div className="min-h-full overflow-hidden border border-[#D7DCE5] bg-white">
      <div className="border-b border-[#E3E7EE] px-4 py-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#5F6C81] transition hover:bg-[#F5F7FB]"
            aria-label="Back"
          >
            <ArrowLeft size={16} />
          </button>
          <h3 className="pr-8 text-[16px] font-medium text-[#2D3758]">Color</h3>
        </div>
      </div>

      <div className="space-y-5 px-4 py-5 text-[#4A5568]">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[13px] text-[#718096]">Type</span>
          <div className="relative pr-5 text-[14px] text-[#4A5568]">
            <select
              value={editorType}
              onChange={(event) => handleTypeChange(event.target.value as BackgroundEditorType)}
              className="appearance-none bg-transparent pr-1 outline-none"
            >
              <option value="solid">Solid</option>
              <option value="linear">Linear</option>
              <option value="radial">Radial</option>
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[#6B7280]" />
          </div>
        </div>

        <div className="space-y-3 rounded-[4px] border border-[#EEF1F5] bg-[#FAFBFD] p-4">
          {editorType === "solid" ? (
            <button
              type="button"
              onClick={() => onActiveColorStopChange(0)}
              className="flex w-full items-center justify-between"
            >
              <span className="flex items-center gap-2 text-[14px] text-[#7650e3]">
                <span className="flex h-4 w-4 items-center justify-center rounded-full border border-[#7650e3]">
                  <span className="h-2 w-2 rounded-full bg-[#7650e3]" />
                </span>
                Color
              </span>
              <span className="h-11 w-12 rounded-[5px] border-[3px] border-[#BFE8FF] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]" style={{ backgroundColor: draft.colors[0] }} />
            </button>
          ) : (
            ([0, 1] as const).map((index) => {
              const isActive = activeColorStop === index;

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => onActiveColorStopChange(index)}
                  className="flex w-full items-center justify-between"
                >
                  <span className={`flex items-center gap-2 text-[14px] ${isActive ? "text-[#7650e3]" : "text-[#5C6880]"}`}>
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${isActive ? "border-[#7650e3]" : "border-[#8B97A8]"}`}>
                      {isActive ? <span className="h-2 w-2 rounded-full bg-[#7650e3]" /> : null}
                    </span>
                    {index === 0 ? "Color 1" : "Color 2"}
                  </span>
                  <span className={`h-11 w-12 rounded-[5px] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] ${isActive ? "border-[3px] border-[#BFE8FF]" : "border border-[#D7DCE3]"}`} style={{ backgroundColor: draft.colors[index] }} />
                </button>
              );
            })
          )}
        </div>

        <div className="space-y-4">
          <div
            ref={saturationRef}
            onPointerDown={handleSurfacePointerDown}
            className="relative h-[146px] cursor-crosshair overflow-hidden rounded-[4px] border border-[#E6EAF0]"
            style={{ backgroundColor: hueTrackColor }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
            <span
              className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_1px_6px_rgba(15,23,42,0.28)]"
              style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
            />
          </div>

          <input
            type="range"
            min="0"
            max="360"
            value={Math.round(hsv.h)}
            onChange={(event) => updateDraftColor(hsvToHex(Number(event.target.value), hsv.s, hsv.v))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full border border-[#E6EAF0] bg-transparent"
            style={{ background: "linear-gradient(90deg, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)" }}
          />

          <div className="flex items-center gap-2">
            <div className="flex h-10 flex-1 items-center rounded-[4px] border border-[#D7DCE3] bg-white px-3">
              <span className="mr-2 text-[16px] leading-none text-[#8B97A8]">#</span>
              <input
                type="text"
                value={hexInput}
                onChange={(event) => handleHexInputChange(event.target.value)}
                className="w-full bg-transparent text-[14px] uppercase text-[#4A5568] outline-none"
                maxLength={6}
              />
            </div>
            <button
              type="button"
              onClick={handleEyedropper}
              className="flex h-10 w-10 items-center justify-center rounded-[4px] border border-[#D7DCE3] bg-white text-[#6A7385] transition hover:bg-[#F7FAFC] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!((window as Window & { EyeDropper?: unknown }).EyeDropper)}
              aria-label="Eyedropper"
            >
              <Pipette size={15} />
            </button>
          </div>
        </div>

    

        <div className="space-y-3">
          <SectionRuleLabel label="On my design" />
          <div className="flex gap-2">
            {recentColors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => updateDraftColor(color)}
                className="h-9 w-9 rounded-[4px] border border-[#E1E5EC] transition hover:scale-[1.03]"
                style={{ backgroundColor: color }}
                aria-label={`Use color ${color}`}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <SectionRuleLabel label="Default preset" />
          <div className="grid grid-cols-5 gap-2">
            {DESIGN_DEFAULT_PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => updateDraftColor(color)}
                className="h-9 rounded-[4px] border border-[#E1E5EC] transition hover:scale-[1.03]"
                style={{ backgroundColor: color }}
                aria-label={`Use preset ${color}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const StylePaletteCard: React.FC<{
  palette: readonly string[];
  onApply: (palette: readonly string[]) => void;
}> = ({ palette, onApply }) => (
  <div className="rounded-[12px] border border-[#D6E8F8] bg-white p-[3px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
    <button
      type="button"
      onClick={() => onApply(palette)}
      className="flex h-8 w-full items-center justify-center gap-1.5 rounded-[9px] bg-[linear-gradient(90deg,#D97A1E_0%,#E5A12B_16%,#EFD98C_48%,#F4E9CE_74%,#7A4A11_100%)] text-[12px] font-medium text-white"
    >
      <Shuffle size={12} />
      Shuffle
    </button>
    <button
      type="button"
      onClick={() => onApply(palette)}
      className="mt-2 flex h-8 w-full overflow-hidden rounded-[7px]"
      aria-label="Apply style palette"
    >
      {palette.map((color, index) => (
        <span key={`${color}-${index}`} className="flex-1" style={{ backgroundColor: color }} />
      ))}
    </button>
  </div>
);

const SectionRuleLabel: React.FC<{ label: string }> = ({ label }) => (
  <div>
    <div className="text-[13px] font-semibold text-[#2D3758]">{label}</div>
    <div className="mt-2 h-px bg-[#E6EBF1]" />
  </div>
);

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
      className={`relative flex h-8 w-[52px] items-center rounded-full p-0.5 transition-colors duration-200 ${on ? "bg-[#7650e3]" : "bg-[#ECEFF3]"}`}
      aria-pressed={on}
    >
      <span
        className={`h-7 w-7 rounded-full bg-white shadow-[0_2px_6px_rgba(15,23,42,0.14)] transition-transform duration-200 ${on ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  </div>
);
