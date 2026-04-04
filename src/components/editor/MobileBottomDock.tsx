import React from "react";
import {
  Plus,
  Sparkles,
  ScanText,
  ScanLine,
  Type,
  Upload,
  LayoutGrid,
  Images,
  Paintbrush,
  X,
  ChevronLeft,
  ChevronDown,
  Check,
  SlidersHorizontal,
  Move,
  Palette,
  LayoutDashboard,
  Wand2,
  Link as LinkIcon,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  QrCode,
} from "lucide-react";
import type {
  ToolType,
  ActiveTool,
  CanvasElement,
  EditorMode,
  CanvasSizePreset,
  DrawSettings,
  BlendModeOption,
  LayerEffectPreset,
  LayerEffectProps,
} from "./EditorShell";
import { ToolbarSidePanel } from "./ToolbarSidePanel";
import { DesignInspector } from "./Inspector";
import type { TemplateApplyPayload } from "./templateTypes";

type DockTab =
  | "add"
  | "styles"
  | "resize"
  | "background"
  | "title"
  | "layout"
  | "content"
  | "style"
  | "actions"
  | "effects"
  | "adjustments"
  | "arrange"
  | "draw-color"
  | "draw-brush-size"
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
  onApplyTemplate: (template: TemplateApplyPayload) => void;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  onMoveLayer: (
    id: string,
    direction: "up" | "down" | "top" | "bottom"
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
  // {
  //   id: "templates",
  //   label: "Templates",
  //   icon: LayoutGrid,
  //   description: "Explore templates for your design",
  //   modes: ["image", "video"],
  // },
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
  {
    id: "draw",
    label: "Draw",
    icon: Paintbrush,
    description: "Use a free-hand drawing tool",
    modes: ["image", "video"],
  },
  {
    id: "background",
    label: "Background",
    icon: ScanLine,
    description: "Upload, gradient, or transparent backgrounds",
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

const textTabs = [
  { id: "add" as const, label: "Add", icon: Plus, primary: true },
  { id: "content" as const, label: "Content", icon: Type },
  { id: "style" as const, label: "Style", icon: Sparkles },
  { id: "arrange" as const, label: "Arrange", icon: Move },
];

const imageTabs = [
  { id: "add" as const, label: "Add", icon: Plus, primary: true },
  { id: "actions" as const, label: "Actions", icon: Wand2 },
  { id: "effects" as const, label: "Effects", icon: Sparkles },
  { id: "adjustments" as const, label: "Adjustments", icon: SlidersHorizontal },
  { id: "arrange" as const, label: "Arrange", icon: Move },
];

const genericElementTabs = [
  { id: "add" as const, label: "Add", icon: Plus, primary: true },
  { id: "content" as const, label: "Content", icon: Type },
  { id: "style" as const, label: "Style", icon: Sparkles },
  { id: "arrange" as const, label: "Arrange", icon: Move },
];

const BOTTOM_BAR_HEIGHT = 78;
const PANEL_DOCK_OVERLAP = 8;
const controlWidthClass = "w-full max-w-[168px]";
const controlBaseClass =
  "h-11 rounded-xl border border-[#d7deea] bg-white px-3 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] outline-none transition focus:border-[#b9c6dd] focus:ring-2 focus:ring-primary/15";
const compactInputClass = `${controlWidthClass} ${controlBaseClass}`;
const compactNumberClass = `${controlWidthClass} ${controlBaseClass} text-center`;
const compactButtonClass =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#d7deea] bg-white px-3 text-sm font-medium text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition hover:border-[#c9d2e3] hover:bg-accent/45";
const compactToggleClass =
  "flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-[#d7deea] bg-white px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition hover:border-[#c9d2e3]";
const compactColorClass =
  "h-11 w-14 rounded-xl border border-[#d7deea] bg-white p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]";
const compactSliderClass =
  "w-full max-w-[168px] cursor-pointer appearance-none bg-transparent py-2 accent-[#7650e3] touch-pan-x [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[#7650e3] [&::-moz-range-thumb]:shadow-[0_2px_8px_rgba(118,80,227,0.35)] [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-[#d7deea] [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[#d7deea] [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#7650e3] [&::-webkit-slider-thumb]:shadow-[0_2px_8px_rgba(118,80,227,0.35)]";
const defaultEffectProps: LayerEffectProps = {
  preset: "none",
  glowColor: "#7650e3",
  glowIntensity: 18,
  shadowColor: "#0f172a",
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  shadowOpacity: 0,
  glassBlur: 18,
  glassOpacity: 0.18,
  strokeColor: "#ffffff",
  strokeWidth: 0,
  blendMode: "normal",
  pulseSpeed: 1,
};
type ImageAdjustmentKey =
  | "brightness"
  | "contrast"
  | "vibrance"
  | "saturation"
  | "hueRotate"
  | "blur"
  | "invert";

const numberValue = (value: number | undefined, fallback = 0) =>
  Number.isFinite(value) ? Number(value) : fallback;


type DrawEntryTool = Exclude<DrawSettings["tool"], "eraser">;

const drawEntryTools: Array<{
  value: DrawEntryTool;
  label: string;
  description: string;
}> = [
  {
    value: "pencil",
    label: "Pencil",
    description: "Classic freehand line",
  },
  {
    value: "circle",
    label: "Circle",
    description: "Dotted ring brush",
  },
  {
    value: "spray",
    label: "Spray",
    description: "Soft spray paint texture",
  },
];

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground/95">
    {children}
  </div>
);

const FieldRow: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="grid grid-cols-[108px_minmax(0,1fr)] items-center gap-3">
    <span className="text-sm font-medium text-muted-foreground">{label}</span>
    <div className="flex min-w-0 justify-end">{children}</div>
  </div>
);

interface UniformSelectOption {
  value: string;
  label: string;
}

const UniformSelect: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: UniformSelectOption[];
}> = ({ value, onChange, options }) => {
  const [open, setOpen] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [open]);

  const selectedOption =
    options.find((option) => option.value === value) || options[0];

  return (
    <div ref={wrapperRef} className={`relative ${controlWidthClass}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex h-11 w-full items-center justify-between rounded-xl border border-[#d7deea] bg-white px-3 text-left text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition focus:outline-none focus:ring-2 focus:ring-primary/15 ${
          open ? "border-[#b9c6dd] ring-2 ring-primary/10" : "hover:border-[#c9d2e3] hover:bg-accent/35"
        }`}
      >
        <span className="truncate">{selectedOption?.label || value}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[90] overflow-hidden rounded-xl border border-[#d7deea] bg-white shadow-[0_18px_36px_rgba(15,23,42,0.14)]">
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex h-10 w-full items-center justify-between px-3 text-left text-sm transition ${
                  isSelected
                    ? "bg-[#7650e3]/10 text-[#7650e3]"
                    : "text-foreground hover:bg-accent/45"
                }`}
              >
                <span className="truncate">{option.label}</span>
                <Check
                  size={14}
                  className={isSelected ? "opacity-100" : "opacity-0"}
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

const ToggleRow: React.FC<{
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}> = ({ label, checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={compactToggleClass}
  >
    <span className="text-sm font-medium text-foreground">{label}</span>
    <span
      className={`relative flex h-7 w-12 items-center rounded-full p-0.5 transition-colors ${
        checked ? "bg-[#7650e3]" : "bg-[#e5e7eb]"
      }`}
    >
      <span
        className={`h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </span>
  </button>
);

const NumericGrid: React.FC<{
  layer: CanvasElement;
  onUpdate: (updates: Partial<CanvasElement>) => void;
}> = ({ layer, onUpdate }) => (
  <div className="grid grid-cols-2 gap-3">
    {[
      { key: "x", label: "X", value: numberValue(layer.x) },
      { key: "y", label: "Y", value: numberValue(layer.y) },
      { key: "width", label: "W", value: numberValue(layer.width, 1) },
      { key: "height", label: "H", value: numberValue(layer.height, 1) },
    ].map((field) => (
      <label key={field.key} className="space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          {field.label}
        </span>
        <input
          type="number"
          value={Math.round(field.value)}
          onChange={(event) =>
            onUpdate({
              [field.key]: Number(event.target.value),
            } as Partial<CanvasElement>)
          }
          className={compactNumberClass}
        />
      </label>
    ))}
  </div>
);

const LinkField: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => (
  <div className="space-y-2">
    <SectionTitle>Interactivity</SectionTitle>
    <div className="flex h-11 items-center gap-2 rounded-xl border border-border bg-white px-3">
      <LinkIcon size={16} className="shrink-0 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
        placeholder="https://example.com"
      />
    </div>
  </div>
);

const LayerActions: React.FC<{
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveLayer: (direction: "up" | "down" | "top" | "bottom") => void;
}> = ({ onDuplicate, onDelete, onMoveLayer }) => (
  <div className="space-y-3">
    <SectionTitle>Layer Actions</SectionTitle>
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={onDuplicate}
        className={compactButtonClass}
      >
        <span className="inline-flex items-center gap-2">
          <Copy size={14} />
          Duplicate
        </span>
      </button>
      <button
        type="button"
        onClick={() => onMoveLayer("up")}
        className={compactButtonClass}
      >
        <span className="inline-flex items-center gap-2">
          <ArrowUp size={14} />
          Up
        </span>
      </button>
      <button
        type="button"
        onClick={() => onMoveLayer("down")}
        className={compactButtonClass}
      >
        <span className="inline-flex items-center gap-2">
          <ArrowDown size={14} />
          Down
        </span>
      </button>
      <button
        type="button"
        onClick={() => onMoveLayer("top")}
        className={compactButtonClass}
      >
        <span className="inline-flex items-center gap-2">
          <ChevronsUp size={14} />
          Front
        </span>
      </button>
      <button
        type="button"
        onClick={() => onMoveLayer("bottom")}
        className={compactButtonClass}
      >
        <span className="inline-flex items-center gap-2">
          <ChevronsDown size={14} />
          Back
        </span>
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 text-sm font-medium text-destructive transition hover:bg-destructive/10"
      >
        <span className="inline-flex items-center gap-2">
          <Trash2 size={14} />
          Delete
        </span>
      </button>
    </div>
  </div>
);

const TextContentPanel: React.FC<{
  layer: CanvasElement;
  onUpdate: (updates: Partial<CanvasElement>) => void;
}> = ({ layer, onUpdate }) => (
  <div className="space-y-4">
    <SectionTitle>Text</SectionTitle>
    <textarea
      value={layer.content || ""}
      onChange={(event) => onUpdate({ content: event.target.value })}
      className="min-h-[144px] w-full rounded-xl border border-border bg-accent/25 px-3 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
      placeholder="Enter text"
    />
    <FieldRow label="Alignment">
      <UniformSelect
        value={layer.textAlign || "left"}
        onChange={(value) =>
          onUpdate({
            textAlign: value as CanvasElement["textAlign"],
          })
        }
        options={[
          { value: "left", label: "Left" },
          { value: "center", label: "Center" },
          { value: "right", label: "Right" },
          { value: "justify", label: "Justify" },
        ]}
      />
    </FieldRow>
    <FieldRow label="Transform">
      <UniformSelect
        value={layer.textTransform || "none"}
        onChange={(value) =>
          onUpdate({
            textTransform: value as CanvasElement["textTransform"],
          })
        }
        options={[
          { value: "none", label: "None" },
          { value: "uppercase", label: "Uppercase" },
        ]}
      />
    </FieldRow>
    <FieldRow label="List">
      <UniformSelect
        value={layer.listStyle || "none"}
        onChange={(value) =>
          onUpdate({
            listStyle: value as CanvasElement["listStyle"],
          })
        }
        options={[
          { value: "none", label: "None" },
          { value: "bulleted", label: "Bulleted" },
          { value: "numbered", label: "Numbered" },
        ]}
      />
    </FieldRow>
    {(layer.listStyle || "none") !== "none" ? (
      <FieldRow label="List Position">
        <UniformSelect
          value={layer.listPosition || "outside"}
          onChange={(value) =>
            onUpdate({
              listPosition: value as CanvasElement["listPosition"],
            })
          }
          options={[
            { value: "outside", label: "Outside" },
            { value: "inside", label: "Inside" },
          ]}
        />
      </FieldRow>
    ) : null}
    {/* <LinkField
      value={layer.linkUrl || ""}
      onChange={(value) => onUpdate({ linkUrl: value })}
    /> */}
  </div>
);

const TextStylePanel: React.FC<{
  layer: CanvasElement;
  onUpdate: (updates: Partial<CanvasElement>) => void;
}> = ({ layer, onUpdate }) => (
  <div className="space-y-4">
    <SectionTitle>Typography</SectionTitle>
    <FieldRow label="Font Family">
      <input
        type="text"
        value={layer.fontFamily || "'Inter', sans-serif"}
        onChange={(event) => onUpdate({ fontFamily: event.target.value })}
        className={compactInputClass}
      />
    </FieldRow>
    <FieldRow label="Font Size">
      <input
        type="number"
        min="8"
        value={layer.fontSize || 24}
        onChange={(event) => onUpdate({ fontSize: Number(event.target.value) })}
        className={compactNumberClass}
      />
    </FieldRow>
    <FieldRow label="Weight">
      <UniformSelect
        value={layer.fontWeight || "400"}
        onChange={(value) => onUpdate({ fontWeight: value })}
        options={[
          { value: "300", label: "Light" },
          { value: "400", label: "Regular" },
          { value: "500", label: "Medium" },
          { value: "600", label: "Semibold" },
          { value: "700", label: "Bold" },
        ]}
      />
    </FieldRow>
    <FieldRow label="Color">
      <input
        type="color"
        value={layer.color || "#123a63"}
        onChange={(event) => onUpdate({ color: event.target.value })}
        className={compactColorClass}
      />
    </FieldRow>
    <FieldRow label="Background">
      <input
        type="color"
        value={layer.textBackgroundColor || "#ffffff"}
        onChange={(event) =>
          onUpdate({ textBackgroundColor: event.target.value })
        }
        className={compactColorClass}
      />
    </FieldRow>
    <FieldRow label="Vertical Align">
      <UniformSelect
        value={layer.textVerticalAlign || "top"}
        onChange={(value) =>
          onUpdate({
            textVerticalAlign: value as CanvasElement["textVerticalAlign"],
          })
        }
        options={[
          { value: "top", label: "Top" },
          { value: "middle", label: "Middle" },
          { value: "bottom", label: "Bottom" },
        ]}
      />
    </FieldRow>
    <FieldRow label="Line Height">
      <input
        type="number"
        step="0.1"
        min="0.8"
        value={layer.lineHeight || 1.2}
        onChange={(event) =>
          onUpdate({ lineHeight: Number(event.target.value) })
        }
        className={compactNumberClass}
      />
    </FieldRow>
    <FieldRow label="Letter Spacing">
      <input
        type="number"
        step="0.1"
        value={layer.letterSpacing || 0}
        onChange={(event) =>
          onUpdate({ letterSpacing: Number(event.target.value) })
        }
        className={compactNumberClass}
      />
    </FieldRow>
    <ToggleRow
      label="Italic"
      checked={(layer.fontStyle || "normal") === "italic"}
      onChange={(checked) =>
        onUpdate({ fontStyle: checked ? "italic" : "normal" })
      }
    />
    <ToggleRow
      label="Underline"
      checked={(layer.textDecoration || "none") === "underline"}
      onChange={(checked) =>
        onUpdate({ textDecoration: checked ? "underline" : "none" })
      }
    />
  </div>
);

const ImageActionsPanel: React.FC<{
  layer: CanvasElement;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveLayer: (direction: "up" | "down" | "top" | "bottom") => void;
}> = ({ layer, onDuplicate, onDelete, onMoveLayer }) => (
  <div className="space-y-4">
    <div className="rounded-xl border border-border bg-accent/15 px-4 py-3 text-sm text-muted-foreground">
      Use actions for quick layer operations and ordering.
    </div>
    <LayerActions
      onDuplicate={onDuplicate}
      onDelete={onDelete}
      onMoveLayer={onMoveLayer}
    />
    {/* <div className="space-y-2">
      <SectionTitle>Source</SectionTitle>
      <div className="rounded-xl border border-border bg-white px-3 py-3 text-xs leading-5 text-muted-foreground break-all">
        {layer.src || "No source"}
      </div>
    </div> */}
  </div>
);

const presetOptions: LayerEffectPreset[] = [
  "none",
  "neon-glow",
  "drop-shadow",
  "glassmorphism",
  "pulse",
];

const blendOptions: BlendModeOption[] = [
  "normal",
  "screen",
  "multiply",
  "overlay",
];

const ImageEffectsPanel: React.FC<{
  layer: CanvasElement;
  onUpdate: (updates: Partial<CanvasElement>) => void;
}> = ({ layer, onUpdate }) => {
  const effectProps = layer.effectProps || defaultEffectProps;

  const updateEffect = (partial: Partial<typeof effectProps>) =>
    onUpdate({
      effectProps: {
        ...effectProps,
        ...partial,
      },
    });

  return (
    <div className="space-y-4">
      <SectionTitle>Effects</SectionTitle>
      <FieldRow label="Preset">
        <UniformSelect
          value={effectProps.preset}
          onChange={(value) =>
            updateEffect({
              preset: value as LayerEffectPreset,
            })
          }
          options={presetOptions.map((option) => ({
            value: option,
            label: option,
          }))}
        />
      </FieldRow>
      <FieldRow label="Blend Mode">
        <UniformSelect
          value={effectProps.blendMode}
          onChange={(value) =>
            updateEffect({
              blendMode: value as BlendModeOption,
            })
          }
          options={blendOptions.map((option) => ({
            value: option,
            label: option,
          }))}
        />
      </FieldRow>
      <FieldRow label="Glow Color">
        <input
          type="color"
          value={effectProps.glowColor}
          onChange={(event) => updateEffect({ glowColor: event.target.value })}
          className={compactColorClass}
        />
      </FieldRow>
      <FieldRow label="Glow Intensity">
        <input
          type="number"
          min="0"
          value={effectProps.glowIntensity}
          onChange={(event) =>
            updateEffect({ glowIntensity: Number(event.target.value) })
          }
          className={compactNumberClass}
        />
      </FieldRow>
      <FieldRow label="Shadow Color">
        <input
          type="color"
          value={effectProps.shadowColor}
          onChange={(event) =>
            updateEffect({ shadowColor: event.target.value })
          }
          className={compactColorClass}
        />
      </FieldRow>
      <FieldRow label="Shadow Blur">
        <input
          type="number"
          min="0"
          value={effectProps.shadowBlur}
          onChange={(event) =>
            updateEffect({ shadowBlur: Number(event.target.value) })
          }
          className={compactNumberClass}
        />
      </FieldRow>
      <FieldRow label="Glass Blur">
        <input
          type="number"
          min="0"
          value={effectProps.glassBlur}
          onChange={(event) =>
            updateEffect({ glassBlur: Number(event.target.value) })
          }
          className={compactNumberClass}
        />
      </FieldRow>
      <FieldRow label="Stroke Width">
        <input
          type="number"
          min="0"
          value={effectProps.strokeWidth}
          onChange={(event) =>
            updateEffect({ strokeWidth: Number(event.target.value) })
          }
          className={compactNumberClass}
        />
      </FieldRow>
    </div>
  );
};

const ImageAdjustmentsPanel: React.FC<{
  layer: CanvasElement;
  onUpdate: (updates: Partial<CanvasElement>) => void;
}> = ({ layer, onUpdate }) => (
  <div className="space-y-4">
    <SectionTitle>Adjustments</SectionTitle>
    {[
      {
        key: "brightness",
        label: "Brightness",
        min: 0,
        max: 200,
        fallback: 100,
      },
      { key: "contrast", label: "Contrast", min: 0, max: 200, fallback: 100 },
      { key: "vibrance", label: "Vibrance", min: 0, max: 200, fallback: 100 },
      {
        key: "saturation",
        label: "Saturation",
        min: 0,
        max: 200,
        fallback: 100,
      },
      { key: "hueRotate", label: "Hue Rotate", min: 0, max: 360, fallback: 0 },
      { key: "blur", label: "Blur", min: 0, max: 40, fallback: 0 },
      { key: "invert", label: "Invert", min: 0, max: 100, fallback: 0 },
    ].map(
      (item: {
        key: ImageAdjustmentKey;
        label: string;
        min: number;
        max: number;
        fallback: number;
      }) => (
        <FieldRow key={item.key} label={item.label}>
          <input
            type="range"
            min={item.min}
            max={item.max}
            value={numberValue(layer[item.key], item.fallback)}
            onChange={(event) =>
              onUpdate({
                [item.key]: Number(event.target.value),
              } as Partial<CanvasElement>)
            }
            className={compactSliderClass}
          />
        </FieldRow>
      )
    )}
    <FieldRow label="Multiply">
      <UniformSelect
        value={layer.effectProps?.blendMode || "normal"}
        onChange={(value) =>
          onUpdate({
            effectProps: {
              ...(layer.effectProps || defaultEffectProps),
              blendMode: value as BlendModeOption,
            },
          })
        }
        options={blendOptions.map((option) => ({
          value: option,
          label: option,
        }))}
      />
    </FieldRow>
    <div className="space-y-3">
      <ToggleRow
        label="Tint"
      checked={Boolean(layer.tintEnabled)}
      onChange={(checked) => onUpdate({ tintEnabled: checked })}
    />
    <ToggleRow
      label="Gamma"
      checked={Boolean(layer.gammaEnabled)}
      onChange={(checked) => onUpdate({ gammaEnabled: checked })}
    />
    <ToggleRow
      label="Black & White"
      checked={Boolean(layer.blackAndWhite)}
      onChange={(checked) => onUpdate({ blackAndWhite: checked })}
    />
    <ToggleRow
      label="Sepia"
      checked={Boolean(layer.sepiaEnabled)}
      onChange={(checked) => onUpdate({ sepiaEnabled: checked })}
    />
    <ToggleRow
      label="Remove Color"
      checked={Boolean(layer.removeColorEnabled)}
      onChange={(checked) => onUpdate({ removeColorEnabled: checked })}
    />
      <ToggleRow
        label="Roundness"
        checked={Boolean(layer.roundnessEnabled)}
        onChange={(checked) => onUpdate({ roundnessEnabled: checked })}
      />
    </div>
  </div>
);

const GenericContentPanel: React.FC<{
  layer: CanvasElement;
  onUpdate: (updates: Partial<CanvasElement>) => void;
}> = ({ layer, onUpdate }) => {
  if (layer.type === "table") {
    return (
      <div className="space-y-4">
        <SectionTitle>Table</SectionTitle>
        <FieldRow label="Rows">
          <input
            type="number"
            min="1"
            max="20"
            value={layer.rows || 3}
            onChange={(event) => {
              const rows = Math.max(1, Number(event.target.value) || 1);
              const currentData = layer.tableData || [];
              const cols = layer.cols || 3;
              const tableData = Array.from(
                { length: rows },
                (_, rowIndex) => currentData[rowIndex] || Array(cols).fill("")
              );
              onUpdate({ rows, tableData });
            }}
            className={compactNumberClass}
          />
        </FieldRow>
        <FieldRow label="Columns">
          <input
            type="number"
            min="1"
            max="20"
            value={layer.cols || 3}
            onChange={(event) => {
              const cols = Math.max(1, Number(event.target.value) || 1);
              const currentData = layer.tableData || [];
              const tableData = currentData.map((row) => {
                const nextRow = [...row];
                nextRow.length = cols;
                for (let index = row.length; index < cols; index += 1) {
                  nextRow[index] = "";
                }
                return nextRow;
              });
              onUpdate({ cols, tableData });
            }}
            className={compactNumberClass}
          />
        </FieldRow>
      </div>
    );
  }

  if (layer.type === "video") {
    return (
      <div className="space-y-4">
        <SectionTitle>Video</SectionTitle>
        <FieldRow label="Duration">
          <input
            type="number"
            min="1"
            value={layer.duration || 1}
            onChange={(event) =>
              onUpdate({
                duration: Math.max(1, Number(event.target.value) || 1),
              })
            }
            className={compactNumberClass}
          />
        </FieldRow>
        <LinkField
          value={layer.linkUrl || ""}
          onChange={(value) => onUpdate({ linkUrl: value })}
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-accent/15 px-4 py-3 text-sm text-muted-foreground">
      No separate content controls for this layer.
    </div>
  );
};

const GenericStylePanel: React.FC<{
  layer: CanvasElement;
  onUpdate: (updates: Partial<CanvasElement>) => void;
}> = ({ layer, onUpdate }) => {
  if (layer.type === "shape") {
    return (
      <div className="space-y-4">
        <SectionTitle>Shape</SectionTitle>
        <FieldRow label="Type">
          <UniformSelect
            value={layer.shapeType || "rectangle"}
            onChange={(value) =>
              onUpdate({
                shapeType: value as CanvasElement["shapeType"],
              })
            }
            options={[
              { value: "rectangle", label: "Rectangle" },
              { value: "circle", label: "Circle" },
              { value: "triangle", label: "Triangle" },
              { value: "line", label: "Line" },
            ]}
          />
        </FieldRow>
        <FieldRow label="Fill">
          <input
            type="color"
            value={layer.backgroundColor || "#4488FF"}
            onChange={(event) =>
              onUpdate({ backgroundColor: event.target.value })
            }
            className={compactColorClass}
          />
        </FieldRow>
        <FieldRow label="Border">
          <input
            type="color"
            value={layer.borderColor || "#000000"}
            onChange={(event) => onUpdate({ borderColor: event.target.value })}
            className={compactColorClass}
          />
        </FieldRow>
        <FieldRow label="Border Width">
          <input
            type="number"
            min="0"
            value={layer.borderWidth || 0}
            onChange={(event) =>
              onUpdate({ borderWidth: Number(event.target.value) })
            }
            className={compactNumberClass}
          />
        </FieldRow>
        {layer.shapeType !== "circle" &&
        layer.shapeType !== "triangle" &&
        layer.shapeType !== "line" ? (
          <FieldRow label="Radius">
            <input
              type="number"
              min="0"
              value={layer.borderRadius || 0}
              onChange={(event) =>
                onUpdate({ borderRadius: Number(event.target.value) })
              }
              className={compactNumberClass}
            />
          </FieldRow>
        ) : null}
      </div>
    );
  }

  if (layer.type === "table") {
    return (
      <div className="space-y-4">
        <SectionTitle>Table Style</SectionTitle>
        <FieldRow label="Text Color">
          <input
            type="color"
            value={layer.color || "#000000"}
            onChange={(event) => onUpdate({ color: event.target.value })}
            className={compactColorClass}
          />
        </FieldRow>
        <FieldRow label="Border Color">
          <input
            type="color"
            value={layer.borderColor || "#000000"}
            onChange={(event) => onUpdate({ borderColor: event.target.value })}
            className={compactColorClass}
          />
        </FieldRow>
        <FieldRow label="Border Width">
          <input
            type="number"
            min="0"
            value={layer.borderWidth || 1}
            onChange={(event) =>
              onUpdate({ borderWidth: Number(event.target.value) })
            }
            className={compactNumberClass}
          />
        </FieldRow>
        <FieldRow label="Font Size">
          <input
            type="number"
            min="8"
            value={layer.fontSize || 14}
            onChange={(event) =>
              onUpdate({ fontSize: Number(event.target.value) })
            }
            className={compactNumberClass}
          />
        </FieldRow>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionTitle>Style</SectionTitle>
      <FieldRow label="Opacity">
        <input
          type="range"
          min="0"
          max="100"
          value={layer.opacity ?? 100}
          onChange={(event) =>
            onUpdate({ opacity: Number(event.target.value) })
          }
          className={compactSliderClass}
        />
      </FieldRow>
    </div>
  );
};

const ArrangePanel: React.FC<{
  layer: CanvasElement;
  onUpdate: (updates: Partial<CanvasElement>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveLayer: (direction: "up" | "down" | "top" | "bottom") => void;
}> = ({ layer, onUpdate, onDuplicate, onDelete, onMoveLayer }) => (
  <div className="space-y-6">
    <div className="space-y-3">
      <SectionTitle>Position & Size</SectionTitle>
      <NumericGrid layer={layer} onUpdate={onUpdate} />
    </div>

    <div className="space-y-3">
      <SectionTitle>Transform</SectionTitle>
      <FieldRow label="Rotation">
        <input
          type="number"
          value={numberValue(layer.rotation)}
          onChange={(event) =>
            onUpdate({ rotation: Number(event.target.value) })
          }
          className={compactNumberClass}
        />
      </FieldRow>
      <FieldRow label="Opacity">
        <input
          type="range"
          min="0"
          max="100"
          value={layer.opacity ?? 100}
          onChange={(event) =>
            onUpdate({ opacity: Number(event.target.value) })
          }
          className={compactSliderClass}
        />
      </FieldRow>
      {layer.type === "image" ? (
        <ToggleRow
          label="Preserve Ratio"
          checked={Boolean(layer.preserveAspectRatio)}
          onChange={(checked) => onUpdate({ preserveAspectRatio: checked })}
        />
      ) : null}
    </div>

    <LinkField
      value={layer.linkUrl || ""}
      onChange={(value) => onUpdate({ linkUrl: value })}
    />

    {/* <LayerActions
      onDuplicate={onDuplicate}
      onDelete={onDelete}
      onMoveLayer={onMoveLayer}
    /> */}
  </div>
);

function getElementTabs(element: CanvasElement | null) {
  if (!element) return designTabs;
  if (element.type === "image") return imageTabs;
  if (element.type === "text") return textTabs;
  return genericElementTabs;
}

function getDrawToolLabel(tool: DrawSettings["tool"]) {
  switch (tool) {
    case "eraser":
      return "Eraser";
    case "circle":
      return "Circle";
    case "spray":
      return "Spray";
    case "pencil":
    default:
      return "Pencil";
  }
}

const DrawEntryPanel: React.FC<{
  selectedTool: DrawEntryTool;
  onSelectTool: (tool: DrawEntryTool) => void;
}> = ({ selectedTool, onSelectTool }) => (
  <div className="space-y-3 pb-2">
    <SectionTitle>Pen Style</SectionTitle>
    <div className="space-y-2">
      {drawEntryTools.map((tool) => {
        const isActive = selectedTool === tool.value;

        return (
          <button
            key={tool.value}
            type="button"
            onClick={() => onSelectTool(tool.value)}
            className={`flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition ${
              isActive
                ? "border-[#7650e3] bg-[#7650e3]/10 text-[#7650e3]"
                : "border-transparent hover:border-border hover:bg-accent/45"
            }`}
          >
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                isActive
                  ? "bg-[#7650e3] text-primary-foreground"
                  : "bg-[#f3efff] text-[#7650e3]"
              }`}
            >
              <Paintbrush size={18} strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-semibold leading-5 text-foreground">
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
  </div>
);

const DrawColorPanel: React.FC<{
  color: string;
  onChange: (color: string) => void;
}> = ({ color, onChange }) => (
  <div className="space-y-4 pb-2">
    <SectionTitle>Color</SectionTitle>
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-white px-4 py-4">
      <div>
        <div className="text-sm font-medium text-foreground">Brush color</div>
        <div className="text-xs text-muted-foreground">Pick the color for the current drawing session.</div>
      </div>
      <input
        type="color"
        value={color}
        onChange={(event) => onChange(event.target.value)}
        className="h-14 w-20 rounded-2xl border border-[#d7deea] bg-white p-1.5"
      />
    </div>
  </div>
);

const DrawBrushSizePanel: React.FC<{
  value: number;
  onChange: (value: number) => void;
}> = ({ value, onChange }) => (
  <div className="space-y-4 pb-2">
    <SectionTitle>Brush Size</SectionTitle>
    <div className="space-y-4 rounded-2xl border border-border bg-white px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">Current size</span>
        <span className="rounded-full bg-[#7650e3]/10 px-3 py-1 text-sm font-semibold text-[#7650e3]">
          {value}
        </span>
      </div>
      <input
        type="range"
        min="1"
        max="80"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full cursor-pointer accent-[#7650e3]"
      />
      <input
        type="number"
        min="1"
        max="80"
        value={value}
        onChange={(event) => onChange(Math.max(1, Number(event.target.value) || 1))}
        className={`${compactNumberClass} max-w-full`}
      />
    </div>
  </div>
);

function getHeaderTitle(
  openTab: DockTab,
  addToolView: "list" | "tool",
  activeTool: ActiveTool
) {
  if (openTab === "add") {
    if (addToolView === "tool" && activeTool && activeTool !== "select") {
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
  if (openTab === "content") return "Content";
  if (openTab === "style") return "Style";
  if (openTab === "actions") return "Actions";
  if (openTab === "effects") return "Effects";
  if (openTab === "adjustments") return "Adjustments";
  if (openTab === "arrange") return "Arrange";
  if (openTab === "draw-color") return "Color";
  if (openTab === "draw-brush-size") return "Brush Size";
  return "";
}

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
  onApplyTemplate,
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
    [mode]
  );

  const tabs = React.useMemo(
    () => getElementTabs(selectedElement),
    [selectedElement]
  );
  const primaryTab = tabs[0];
  const scrollableTabs = tabs.slice(1);
  const isDrawSession = activeTool === "draw";
  const isOpen = openTab !== null;

  React.useEffect(() => {
    if (!selectedElement) {
      if (
        openTab === "content" ||
        openTab === "style" ||
        openTab === "actions" ||
        openTab === "effects" ||
        openTab === "adjustments" ||
        openTab === "arrange"
      ) {
        setOpenTab(null);
      }
      return;
    }

    const allowedTabs = new Set(
      getElementTabs(selectedElement).map((tab) => tab.id)
    );
    if (openTab && openTab !== "add" && !allowedTabs.has(openTab)) {
      setOpenTab("arrange");
    }
  }, [openTab, selectedElement]);

  React.useEffect(() => {
    if (openTab !== "add") {
      setAddToolView("list");
    }
  }, [openTab]);

  React.useEffect(() => {
    if (
      !isDrawSession &&
      (openTab === "draw-color" || openTab === "draw-brush-size")
    ) {
      setOpenTab(null);
    }
  }, [isDrawSession, openTab]);

  React.useEffect(() => {
    if (
      activeTool === "select" &&
      openTab === "add" &&
      addToolView === "tool"
    ) {
      setAddToolView("list");
      setOpenTab(null);
    }
  }, [activeTool, addToolView, openTab]);

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

  const handleSelectInitialDrawTool = (tool: DrawEntryTool) => {
    onUpdateDrawSettings({ tool });
    setOpenTab(null);
    setAddToolView("list");
  };

  const renderDrawSessionPanel = () => {
    switch (openTab) {
      case "add":
        return (
          <DrawEntryPanel
            selectedTool={
              drawSettings.tool === "eraser" ? "pencil" : drawSettings.tool
            }
            onSelectTool={handleSelectInitialDrawTool}
          />
        );
      case "draw-color":
        return (
          <DrawColorPanel
            color={drawSettings.color}
            onChange={(color) => onUpdateDrawSettings({ color })}
          />
        );
      case "draw-brush-size":
        return (
          <DrawBrushSizePanel
            value={drawSettings.brushSize}
            onChange={(brushSize) => onUpdateDrawSettings({ brushSize })}
          />
        );
      default:
        return null;
    }
  };

  const renderDesignTabPanel = () => {
    switch (openTab) {
      case "styles":
        return (
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
            visibleSections={["styles"]}
          />
        );
      case "resize":
        return (
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
            visibleSections={["size"]}
          />
        );
      case "background":
        return (
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
            visibleSections={["background"]}
          />
        );
      case "title":
        return (
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
            visibleSections={["title"]}
          />
        );
      case "layout":
        return (
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
            visibleSections={["layout"]}
          />
        );
      default:
        return null;
    }
  };

  const renderElementTabPanel = () => {
    if (!selectedElement) return null;

    const updateSelected = (updates: Partial<CanvasElement>) =>
      onUpdateElement(selectedElement.id, updates);

    if (selectedElement.type === "image") {
      switch (openTab) {
        case "actions":
          return (
            <ImageActionsPanel
              layer={selectedElement}
              onDuplicate={() => onDuplicateElement(selectedElement.id)}
              onDelete={() => {
                onDeleteElement(selectedElement.id);
                setOpenTab(null);
              }}
              onMoveLayer={(direction) =>
                onMoveLayer(selectedElement.id, direction)
              }
            />
          );
        case "effects":
          return (
            <ImageEffectsPanel
              layer={selectedElement}
              onUpdate={updateSelected}
            />
          );
        case "adjustments":
          return (
            <ImageAdjustmentsPanel
              layer={selectedElement}
              onUpdate={updateSelected}
            />
          );
        case "arrange":
          return (
            <ArrangePanel
              layer={selectedElement}
              onUpdate={updateSelected}
              onDuplicate={() => onDuplicateElement(selectedElement.id)}
              onDelete={() => {
                onDeleteElement(selectedElement.id);
                setOpenTab(null);
              }}
              onMoveLayer={(direction) =>
                onMoveLayer(selectedElement.id, direction)
              }
            />
          );
        default:
          return null;
      }
    }

    if (selectedElement.type === "text") {
      switch (openTab) {
        case "content":
          return (
            <TextContentPanel
              layer={selectedElement}
              onUpdate={updateSelected}
            />
          );
        case "style":
          return (
            <TextStylePanel layer={selectedElement} onUpdate={updateSelected} />
          );
        case "arrange":
          return (
            <ArrangePanel
              layer={selectedElement}
              onUpdate={updateSelected}
              onDuplicate={() => onDuplicateElement(selectedElement.id)}
              onDelete={() => {
                onDeleteElement(selectedElement.id);
                setOpenTab(null);
              }}
              onMoveLayer={(direction) =>
                onMoveLayer(selectedElement.id, direction)
              }
            />
          );
        default:
          return null;
      }
    }

    switch (openTab) {
      case "content":
        return (
          <GenericContentPanel
            layer={selectedElement}
            onUpdate={updateSelected}
          />
        );
      case "style":
        return (
          <GenericStylePanel
            layer={selectedElement}
            onUpdate={updateSelected}
          />
        );
      case "arrange":
        return (
          <ArrangePanel
            layer={selectedElement}
            onUpdate={updateSelected}
            onDuplicate={() => onDuplicateElement(selectedElement.id)}
            onDelete={() => {
              onDeleteElement(selectedElement.id);
              setOpenTab(null);
            }}
            onMoveLayer={(direction) =>
              onMoveLayer(selectedElement.id, direction)
            }
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
          bottom: `calc(${BOTTOM_BAR_HEIGHT - PANEL_DOCK_OVERLAP}px + env(safe-area-inset-bottom))`,
        }}
      >
        <div
          className="mx-0 rounded-t-[22px] border-t border-border bg-background shadow-[0_-10px_28px_rgba(15,23,42,0.08)]"
          style={{
            maxHeight: "68dvh",
          }}
        >
          <div className="flex justify-center pt-2">
            <div className="h-1.5 w-12 rounded-full bg-muted" />
          </div>

          <div className="grid grid-cols-[40px_minmax(0,1fr)_40px] items-center px-4 pb-3 pt-2">
            <div className="flex justify-start">
              {openTab === "add" && addToolView === "tool" ? (
                <button
                  onClick={() => setAddToolView("list")}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-accent"
                >
                  <ChevronLeft size={18} />
                </button>
              ) : null}
            </div>

            <h3 className="text-center text-[16px] font-semibold text-foreground">
              {getHeaderTitle(openTab, addToolView, activeTool)}
            </h3>

            <div className="flex justify-end">
              <button
                onClick={() => setOpenTab(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-accent"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div
            className="overflow-y-auto overscroll-contain px-4 pb-8"
            data-allow-touch-scroll="y"
            style={{ maxHeight: "calc(68dvh - 72px)" }}
          >
            {openTab === "add" && addToolView === "list" && (
              <div className="space-y-2">
                {filteredTools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => handleOpenTool(tool.id)}
                      className="flex w-full items-start gap-3 rounded-2xl border border-transparent px-3 py-3 text-left transition hover:border-border hover:bg-accent/45"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f3efff] text-[#7650e3]">
                        <Icon size={20} strokeWidth={1.8} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[15px] font-semibold leading-5 text-foreground">
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

            {openTab === "add" &&
              addToolView === "tool" &&
              activeTool !== "select" && (
                <div className="px-0.5 pb-4">
                  {isDrawSession ? (
                    renderDrawSessionPanel()
                  ) : (
                    <ToolbarSidePanel
                      activeTool={activeTool}
                      onAddElement={(el) => {
                        onAddElement(el);
                        setOpenTab(null);
                        setAddToolView("list");
                      }}
                      onApplyTemplate={(template) => {
                        onApplyTemplate(template);
                        setOpenTab(null);
                        setAddToolView("list");
                      }}
                      onBackgroundChange={onBackgroundChange}
                      canvasBackground={canvasBackground}
                      canvasSize={canvasSize}
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
                  )}
                </div>
              )}

            {isDrawSession &&
              openTab &&
              openTab !== "add" &&
              (openTab === "draw-color" || openTab === "draw-brush-size") && (
                <div className="space-y-4 px-0.5 pb-4">
                  {renderDrawSessionPanel()}
                </div>
              )}

            {!isDrawSession && !selectedElement && openTab && openTab !== "add" && (
              <div className="space-y-4 px-0.5 pb-4">
                {renderDesignTabPanel()}
              </div>
            )}

            {!isDrawSession && selectedElement && openTab && openTab !== "add" && (
              <div className="space-y-4 px-0.5 pb-4">
                {renderElementTabPanel()}
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-background px-2 py-2 shadow-[0_-4px_12px_rgba(15,23,42,0.06)]"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)",
        }}
      >
        {isDrawSession ? (
          <div
            className="overflow-x-auto"
            data-allow-touch-scroll="x"
          >






            <div className="flex items-center gap-2 pr-1">
              {([
                { key: "pencil", label: "Pencil" },
                { key: "circle", label: "Circle" },
                { key: "spray", label: "Spray" },
                { key: "eraser", label: "Eraser" },
              ] as const).map((tool) => {
                const isActive = drawSettings.tool === tool.key;



                
                return (

                  
                  <button
                    key={tool.key}
                    type="button"
                    onClick={() => {
                      onUpdateDrawSettings({ tool: tool.key });
                      setOpenTab(null);
                    }}
                    className={`flex h-[64px] min-w-[72px] shrink-0 flex-col items-center justify-center rounded-2xl px-3 py-2 transition-colors ${
                      isActive
                        ? "bg-[#7650e3]/10 text-[#7650e3]"
                        : "text-muted-foreground"
                    }`}
                  >
                    <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-full">
                      <Paintbrush size={18} strokeWidth={1.8} />
                    </div>
                    <span className="whitespace-nowrap text-[11px] font-medium">
                      {tool.label}
                    </span>
                  </button>



                );
              })}

              <button
                type="button"
                onClick={() => handleDockTabClick("draw-brush-size")}
                className={`flex h-[64px] min-w-[72px] shrink-0 flex-col items-center justify-center rounded-2xl px-3 py-2 transition-colors ${
                  openTab === "draw-brush-size"
                    ? "bg-[#7650e3]/10 text-[#7650e3]"
                    : "text-muted-foreground"
                }`}
              >
                <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-full">
                  <SlidersHorizontal size={18} strokeWidth={1.8} />
                </div>
                <span className="whitespace-nowrap text-[11px] font-medium">
                  Brush {drawSettings.brushSize}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleDockTabClick("draw-color")}
                className={`flex h-[64px] min-w-[72px] shrink-0 flex-col items-center justify-center rounded-2xl px-3 py-2 transition-colors ${
                  openTab === "draw-color"
                    ? "bg-[#7650e3]/10 text-[#7650e3]"
                    : "text-muted-foreground"
                }`}
              >
                <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-full">
                  <Palette size={18} strokeWidth={1.8} />
                </div>
                <span className="whitespace-nowrap text-[11px] font-medium">
                  Color
                </span>
              </button>

              

              <button
                type="button"
                onClick={() => {
                  setOpenTab(null);
                  setAddToolView("list");
                  onFinishDrawing();
                }}
                className="flex h-[64px] min-w-[72px] shrink-0 flex-col items-center justify-center rounded-2xl bg-[#7650e3] px-4 py-2 text-primary-foreground shadow-sm transition hover:bg-[#6947ca]"
              >
                <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-full">
                  <Check size={18} strokeWidth={2} />
                </div>
                <span className="whitespace-nowrap text-[11px] font-semibold">
                  Finish 
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDockTabClick(primaryTab.id)}
              className={`flex h-[64px] min-w-[78px] shrink-0 flex-col items-center justify-center rounded-2xl px-3 py-2 transition-colors ${
                openTab === primaryTab.id
                  ? "bg-[#7650e3]/10 text-[#7650e3]"
                  : "text-foreground"
              }`}
            >
              <div className="mb-1 flex h-20 w-7 items-center justify-center rounded-full bg-[#7650e3] text-primary-foreground shadow-sm">
                <primaryTab.icon size={18} strokeWidth={1.8} />
              </div>
              <span className="whitespace-nowrap text-[11px] font-medium">
                {primaryTab.label}
              </span>
            </button>

            <div
              className="min-w-0 flex-1 overflow-x-auto"
              data-allow-touch-scroll="x"
            >
              <div className="flex items-center gap-2 pr-1">
                {scrollableTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = openTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleDockTabClick(tab.id)}
                      className={`flex h-[64px] min-w-[78px] shrink-0 flex-col items-center justify-center rounded-2xl px-3 py-2 transition-colors ${
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
        )}
      </div>
    </>
  );
};
