import React from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Check,
  ChevronDown,
  Copy,
  Link2,
  List,
  ListOrdered,
  Minus,
  Move,
  Plus,
  Search,
  Trash2,
  Type,
} from "lucide-react";
import type { CanvasElement, CanvasSizePreset, LayerEffectProps } from "./EditorShell";
import { ArrangementControls, LockInPlaceControl, PositionSidebar } from "./PositionSidebar";
import { useTextEditStore } from "@/stores/useTextEditStore";

interface TextPropertiesSidebarProps {
  selectedText: CanvasElement;
  canvasSize: CanvasSizePreset;
  maxLayerZIndex: number;
  onUpdate: (id: string, newProps: Partial<CanvasElement>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveLayer: (id: string, dir: "up" | "down" | "top" | "bottom") => void;
  onStartCanvasEdit?: (id: string) => void;
}

const FONT_OPTIONS = [
  { label: "Raleway", value: "'Raleway', sans-serif" },
  { label: "Inter", value: "'Inter', sans-serif" },
  { label: "Poppins", value: "'Poppins', sans-serif" },
  { label: "Montserrat", value: "'Montserrat', sans-serif" },
  { label: "Playfair Display", value: "'Playfair Display', serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
];

const defaultEffects: LayerEffectProps = {
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

type ShadowOptionValue = "none" | "light-shadow" | "strong-shadow" | "custom-shadow";

const SHADOW_OPTIONS = [
  { label: "None", value: "none" as const },
  { label: "Light Shadow", value: "light-shadow" as const },
  { label: "Strong Shadow", value: "strong-shadow" as const },
  { label: "Custom Shadow", value: "custom-shadow" as const },
];

const SHADOW_PRESET_CONFIG: Record<Exclude<ShadowOptionValue, "none" | "custom-shadow">, {
  shadowColor: string;
  shadowOpacity: number;
  shadowBlur: number;
  distance: number;
  angle: number;
}> = {
  "light-shadow": {
    shadowColor: "#8f8f8f",
    shadowOpacity: 0.28,
    shadowBlur: 8,
    distance: 4,
    angle: 90,
  },
  "strong-shadow": {
    shadowColor: "#7a7a7a",
    shadowOpacity: 0.5,
    shadowBlur: 16,
    distance: 8,
    angle: 90,
  },
};

const CUSTOM_SHADOW_DEFAULTS = {
  shadowColor: "#8d8d8d",
  shadowOpacity: 0.5,
  shadowBlur: 1,
  distance: 4,
  angle: 45,
};

const ROW_LABEL = "text-[11px] font-medium text-[#6b7280]";
const DIVIDER = "border-t border-[#e5e7eb] pt-4";

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const getCurrentFontLabel = (fontFamily?: string) =>
  FONT_OPTIONS.find((font) => font.value === fontFamily)?.label || "Raleway";

const normalizeEffectProps = (selectedText: CanvasElement): LayerEffectProps => ({
  ...defaultEffects,
  ...(selectedText.effectProps ?? {}),
});

const roundToPrecision = (value: number, precision = 100) =>
  Math.round(value * precision) / precision;

const getShadowDistance = (effect: LayerEffectProps) =>
  Math.round(Math.sqrt((effect.shadowOffsetX ?? 0) ** 2 + (effect.shadowOffsetY ?? 0) ** 2));

const getShadowAngle = (effect: LayerEffectProps) => {
  if ((effect.shadowOffsetX ?? 0) === 0 && (effect.shadowOffsetY ?? 0) === 0) {
    return CUSTOM_SHADOW_DEFAULTS.angle;
  }

  const angle = (Math.atan2(effect.shadowOffsetY ?? 0, effect.shadowOffsetX ?? 0) * 180) / Math.PI;
  return Math.round((angle + 360) % 360);
};

const getShadowOffsets = (distance: number, angle: number) => {
  const radians = (angle * Math.PI) / 180;
  return {
    shadowOffsetX: roundToPrecision(Math.cos(radians) * distance),
    shadowOffsetY: roundToPrecision(Math.sin(radians) * distance),
  };
};

const getShadowOptionValue = (effect: LayerEffectProps): ShadowOptionValue => {
  const distance = getShadowDistance(effect);
  const isShadowActive =
    effect.preset === "drop-shadow" ||
    effect.shadowBlur > 0 ||
    distance > 0 ||
    effect.shadowOpacity > 0;

  if (!isShadowActive || effect.preset === "none" || effect.preset === "neon-glow") {
    return "none";
  }

  const matchesLight =
    Math.abs(effect.shadowBlur - SHADOW_PRESET_CONFIG["light-shadow"].shadowBlur) <= 1 &&
    Math.abs(effect.shadowOpacity - SHADOW_PRESET_CONFIG["light-shadow"].shadowOpacity) <= 0.03 &&
    Math.abs(distance - SHADOW_PRESET_CONFIG["light-shadow"].distance) <= 1 &&
    Math.abs(effect.shadowOffsetX) <= 0.5;

  if (matchesLight) {
    return "light-shadow";
  }

  const matchesStrong =
    Math.abs(effect.shadowBlur - SHADOW_PRESET_CONFIG["strong-shadow"].shadowBlur) <= 1 &&
    Math.abs(effect.shadowOpacity - SHADOW_PRESET_CONFIG["strong-shadow"].shadowOpacity) <= 0.03 &&
    Math.abs(distance - SHADOW_PRESET_CONFIG["strong-shadow"].distance) <= 1 &&
    Math.abs(effect.shadowOffsetX) <= 0.5;

  if (matchesStrong) {
    return "strong-shadow";
  }

  return "custom-shadow";
};

const PrecisionControl: React.FC<{
  title: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}> = ({ title, value, min, max, step, onChange }) => {
  const apply = (next: number) => onChange(clamp(Number.isFinite(next) ? next : min, min, max));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className={ROW_LABEL}>{title}</div>
        <div className="flex h-8 shrink-0 items-center rounded-[3px] border border-[#d7dce3] bg-white shadow-[0_1px_1px_rgba(15,23,42,0.03)]">
          <button
            type="button"
            onClick={() => apply(value - step)}
            className="flex h-8 w-8 items-center justify-center text-[#6b7280] transition hover:bg-[#f3f5f8]"
          >
            <Minus size={13} />
          </button>
          <input
            type="number"
            inputMode="decimal"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(event) => apply(Number(event.target.value))}
            className="h-8 w-[58px] border-x border-[#d7dce3] bg-white px-1 text-center text-[12px] font-medium text-[#1f2937] outline-none"
          />
          <button
            type="button"
            onClick={() => apply(value + step)}
            className="flex h-8 w-8 items-center justify-center text-[#6b7280] transition hover:bg-[#f3f5f8]"
          >
            <Plus size={13} />
          </button>
        </div>
      </div>
      <div className="px-px">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => apply(Number(event.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#f3efff] accent-[#7650e3]"
        />
      </div>
    </div>
  );
};

const ShadowControl: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}> = ({ label, value, min, max, step, onChange }) => {
  const apply = (next: number) => onChange(clamp(Number.isFinite(next) ? next : min, min, max));

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-[72px] whitespace-nowrap text-[12px] text-[#6b7280]">{label}</div>
        <div className="flex h-8 shrink-0 items-center overflow-hidden rounded-[3px] border border-[#d7dce3] bg-white">
          <button
            type="button"
            onClick={() => apply(value - step)}
            className="flex h-8 w-8 items-center justify-center text-[#6b7280] transition hover:bg-[#f3f5f8]"
          >
            <Minus size={13} />
          </button>
          <input
            type="number"
            inputMode="decimal"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(event) => apply(Number(event.target.value))}
            className="h-8 w-[46px] border-x border-[#d7dce3] bg-white px-1 text-center text-[12px] font-medium text-[#1f2937] outline-none"
          />
          <button
            type="button"
            onClick={() => apply(value + step)}
            className="flex h-8 w-8 items-center justify-center text-[#6b7280] transition hover:bg-[#f3f5f8]"
          >
            <Plus size={13} />
          </button>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => apply(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#e5e7eb] accent-[#7650e3]"
      />
    </div>
  );
};

const ToggleSwitch: React.FC<{
  label: string;
  checked: boolean;
  onToggle: () => void;
}> = ({ label, checked, onToggle }) => (
  <div className="flex items-center justify-between py-1.5">
    <span className={ROW_LABEL}>{label}</span>
    <button
      type="button"
      onClick={onToggle}
      className={`relative flex h-6 w-10 items-center rounded-full px-0.5 transition ${checked ? "bg-[#7650e3]" : "bg-[#dfe3e8]"}`}
    >
      <span
        className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`}
      />
    </button>
  </div>
);

const ActionButton: React.FC<{
  icon?: React.ReactNode;
  label: string;
  onClick?: () => void;
  tone?: "default" | "danger";
}> = ({ icon, label, onClick, tone = "default" }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex min-h-[42px] flex-col items-center justify-center gap-1 rounded-md border px-1.5 py-1 text-[9px] font-medium leading-none transition ${
      tone === "danger"
        ? "border-[#f5c2c7] bg-[#fff5f5] text-[#d64545] hover:bg-[#feecec]"
        : "border-[#d7dce3] bg-white text-[#6b7280] hover:bg-[#f7f9fb]"
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const Section: React.FC<{
  title: string;
  children: React.ReactNode;
  divider?: boolean;
}> = ({ title, children, divider = true }) => (
  <section className={divider ? DIVIDER : ""}>
    <div className="mb-3 text-[12px] font-medium text-[#4b5563]">{title}</div>
    {children}
  </section>
);

const IconToggleGroup: React.FC<{
  title: string;
  columns: string;
  items: Array<{ key: string; icon?: React.ReactNode; text?: string }>;
  activeKeys?: string[];
  onSelect: (key: string) => void;
}> = ({ title, columns, items, activeKeys = [], onSelect }) => (
  <div className="space-y-2">
    <div className={ROW_LABEL}>{title}</div>
    <div className={`grid ${columns} gap-2`}>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onSelect(item.key)}
          className={`flex h-8 items-center justify-center rounded-md border text-[11px] transition ${
            activeKeys.includes(item.key)
              ? "border-[#7650e3] bg-[#7650e3]/20 text-[#7650e3]"
              : "border-[#d7dce3] bg-white text-[#6b7280] hover:bg-[#f7f9fb]"
          }`}
        >
          {item.icon ?? item.text}
        </button>
      ))}
    </div>
  </div>
);

export const TextPropertiesSidebar: React.FC<TextPropertiesSidebarProps> = ({
  selectedText,
  canvasSize,
  maxLayerZIndex,
  onUpdate,
  onDuplicate,
  onDelete,
  onMoveLayer,
  onStartCanvasEdit,
}) => {
  const [activePanel, setActivePanel] = React.useState<"main" | "position">("main");
  const [fontSearch, setFontSearch] = React.useState("");
  const [fontMenuOpen, setFontMenuOpen] = React.useState(false);
  const [shadowMenuOpen, setShadowMenuOpen] = React.useState(false);
  const requestTextEdit = useTextEditStore((state) => state.requestTextEdit);
  const isLocked = Boolean(selectedText.locked);
  const effect = normalizeEffectProps(selectedText);
  const lineHeightUi = Math.round((selectedText.lineHeight ?? 1.2) * 100);
  const shadowMode = getShadowOptionValue(effect);
  const shadowDistance = getShadowDistance(effect);
  const shadowAngle = getShadowAngle(effect);

  React.useEffect(() => {
    setActivePanel("main");
  }, [selectedText.id]);

  React.useEffect(() => {
    setShadowMenuOpen(false);
  }, [selectedText.id]);

  const filteredFonts = React.useMemo(
    () =>
      FONT_OPTIONS.filter((font) =>
        font.label.toLowerCase().includes(fontSearch.trim().toLowerCase()),
      ),
    [fontSearch],
  );

  const updateText = (updates: Partial<CanvasElement>) => {
    onUpdate(selectedText.id, updates);
  };

  const startCanvasEdit = () => {
    requestTextEdit(selectedText.id);
  };

  const updateEffect = (updates: Partial<LayerEffectProps>) => {
    updateText({
      effectProps: {
        ...effect,
        ...updates,
      },
    });
  };

  const applyShadowOption = (option: ShadowOptionValue) => {
    setShadowMenuOpen(false);

    if (option === "none") {
      updateEffect({
        preset: "none",
        shadowBlur: 0,
        shadowOpacity: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
      });
      return;
    }

    if (option === "custom-shadow") {
      const nextDistance = shadowDistance > 0 ? shadowDistance : CUSTOM_SHADOW_DEFAULTS.distance;
      const nextAngle = shadowDistance > 0 ? shadowAngle : CUSTOM_SHADOW_DEFAULTS.angle;
      updateEffect({
        preset: "drop-shadow",
        shadowColor: effect.shadowColor || CUSTOM_SHADOW_DEFAULTS.shadowColor,
        shadowOpacity: effect.shadowOpacity > 0 ? effect.shadowOpacity : CUSTOM_SHADOW_DEFAULTS.shadowOpacity,
        shadowBlur: Math.max(1, effect.shadowBlur || CUSTOM_SHADOW_DEFAULTS.shadowBlur),
        ...getShadowOffsets(nextDistance, nextAngle),
      });
      return;
    }

    const preset = SHADOW_PRESET_CONFIG[option];
    updateEffect({
      preset: "drop-shadow",
      shadowColor: preset.shadowColor,
      shadowOpacity: preset.shadowOpacity,
      shadowBlur: preset.shadowBlur,
      ...getShadowOffsets(preset.distance, preset.angle),
    });
  };

  const handleCopyStyle = async () => {
    const stylePayload = {
      fontFamily: selectedText.fontFamily,
      fontWeight: selectedText.fontWeight,
      fontStyle: selectedText.fontStyle,
      textDecoration: selectedText.textDecoration,
      textTransform: selectedText.textTransform,
      textAlign: selectedText.textAlign,
      textVerticalAlign: selectedText.textVerticalAlign,
      fontSize: selectedText.fontSize,
      lineHeight: selectedText.lineHeight,
      letterSpacing: selectedText.letterSpacing,
      opacity: selectedText.opacity,
      color: selectedText.color,
      textBackgroundColor: selectedText.textBackgroundColor,
      linkUrl: selectedText.linkUrl,
      listStyle: selectedText.listStyle,
      listPosition: selectedText.listPosition,
      effectProps: effect,
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(stylePayload, null, 2));
    } catch {
      // Keep the UI responsive if the clipboard API is unavailable.
    }
  };

  const activeStyleKeys = [
    Number(selectedText.fontWeight || 400) >= 600 || selectedText.fontWeight === "bold"
      ? "bold"
      : "",
    selectedText.fontStyle === "italic" ? "italic" : "",
    selectedText.textDecoration === "underline" ? "underline" : "",
    selectedText.textTransform === "uppercase" ? "uppercase" : "",
  ].filter(Boolean);

  if (activePanel === "position") {
    return (
      <PositionSidebar
        layer={selectedText}
        canvasSize={canvasSize}
        onUpdate={updateText}
        onBack={() => setActivePanel("main")}
      />
    );
  }

  return (
    <div className="bg-white px-3 pb-5 pt-2 text-[#1f2937]">
      <div className="grid grid-cols-4 gap-2 mb-2">
        <ActionButton
          icon={<Move size={13} />}
          label="Position"
          onClick={() => setActivePanel("position")}
        />
        <ActionButton
          icon={<Copy size={13} />}
          label="Duplicate"
          onClick={onDuplicate}
        />
        <ActionButton
          icon={<Type size={13} />}
          label="Edit"
          onClick={startCanvasEdit}
        />
        {/* <ActionButton label="Copy Style" onClick={handleCopyStyle} /> */}
        <ActionButton
          icon={<Trash2 size={13} />}
          label="Delete"
          onClick={onDelete}
          tone="danger"
        />
      </div>

      <Section title="Arrangement" divider={false}>
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <ArrangementControls
              layer={selectedText}
              maxLayerZIndex={maxLayerZIndex}
              onMoveLayer={onMoveLayer}
            />
          </div>
          <LockInPlaceControl
            locked={isLocked}
            onToggle={() => updateText({ locked: !isLocked })}
          />
        </div>
      </Section>

      <Section title="Text">
        <div className="space-y-2 py-2">
          <textarea
            value={selectedText.content || ""}
            onChange={(event) => updateText({ content: event.target.value })}
            placeholder="Type your text"
            className="min-h-[120px] w-full resize-y rounded-[3px]  border border-[#d7dce3] bg-white px-3 py-2 text-[13px] leading-5 text-[#1f2937] outline-none focus:ring-1 focus:ring-[#9ed8fb]"
          />
          <button
            type="button"
            onClick={startCanvasEdit}
            className="inline-flex h-9 items-center justify-center  rounded-[3px] border border-[#d7dce3] bg-[#f8fafc] px-3 text-[12px] font-medium text-[#7650e3] transition "
          >
            Edit directly on canvas
          </button>
        </div>
      </Section>

      <Section title="Opacity">
        <PrecisionControl
          title=""
          value={selectedText.opacity ?? 100}
          min={0}
          max={100}
          step={1}
          onChange={(value) => updateText({ opacity: value })}
        />
      </Section>

      <Section title="Styles">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className={ROW_LABEL}>Font</div>
              <button
                type="button"
                onClick={() => setFontMenuOpen((open) => !open)}
                className="inline-flex h-8 items-center gap-1 text-[13px] font-medium text-[#7650e3] transition "
              >
                <span>{getCurrentFontLabel(selectedText.fontFamily)}</span>
                <ChevronDown size={14} className="text-[#8a94a3]" />
              </button>
            </div>

            <div className="relative">
              {fontMenuOpen ? (
                <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 rounded-md border border-[#d7dce3] bg-white p-2 shadow-xl">
                  <div className="relative mb-2">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a94a3]"
                    />
                    <input
                      type="text"
                      value={fontSearch}
                      onChange={(event) => setFontSearch(event.target.value)}
                      className="h-9 w-full rounded-md border border-[#d7dce3] bg-[#f8fafc] pl-9 pr-3 text-[12px] text-[#1f2937] outline-none focus:ring-1 focus:ring-[#9ed8fb]"
                      placeholder="Search font"
                    />
                  </div>
                  <div className="max-h-48 space-y-1 overflow-y-auto editor-scroll">
                    {filteredFonts.map((font) => (
                      <button
                        key={font.value}
                        type="button"
                        onClick={() => {
                          updateText({ fontFamily: font.value });
                          setFontMenuOpen(false);
                          setFontSearch("");
                        }}
                        className="flex w-full items-center rounded-md px-3 py-2 text-left text-[12px] text-[#2f3742] transition hover:bg-[#f7f9fb]"
                      >
                        {font.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <IconToggleGroup
            title="Style"
            columns="grid-cols-4"
            items={[
              { key: "bold", text: "B" },
              { key: "italic", text: "I" },
              { key: "underline", text: "U" },
              { key: "uppercase", text: "Aa" },
            ]}
            activeKeys={activeStyleKeys}
            onSelect={(key) => {
              if (key === "bold") {
                updateText({
                  fontWeight:
                    Number(selectedText.fontWeight || 400) >= 600 ||
                    selectedText.fontWeight === "bold"
                      ? "400"
                      : "700",
                });
                return;
              }

              if (key === "italic") {
                updateText({
                  fontStyle:
                    selectedText.fontStyle === "italic" ? "normal" : "italic",
                });
                return;
              }

              if (key === "underline") {
                updateText({
                  textDecoration:
                    selectedText.textDecoration === "underline"
                      ? "none"
                      : "underline",
                });
                return;
              }

              updateText({
                textTransform:
                  selectedText.textTransform === "uppercase"
                    ? "none"
                    : "uppercase",
              });
            }}
          />

          <PrecisionControl
            title="Size"
            value={selectedText.fontSize ?? 72}
            min={8}
            max={240}
            step={1}
            onChange={(value) => updateText({ fontSize: value })}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className={ROW_LABEL}>Color</div>
              <label className="flex h-8 w-10 cursor-pointer items-center justify-center rounded-[3px] border border-[#d7dce3] bg-white p-1">
                <input
                  type="color"
                  value={selectedText.color || "#000000"}
                  onChange={(event) => updateText({ color: event.target.value })}
                  className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                />
              </label>
            </div>
          </div>

          <ToggleSwitch
            label="Outline"
            checked={effect.strokeWidth > 0}
            onToggle={() =>
              updateEffect({
                strokeWidth: effect.strokeWidth > 0 ? 0 : 1,
              })
            }
          />

          <IconToggleGroup
            title="Alignment"
            columns="grid-cols-4"
            items={[
              { key: "left", icon: <AlignLeft size={14} /> },
              { key: "center", icon: <AlignCenter size={14} /> },
              { key: "right", icon: <AlignRight size={14} /> },
              { key: "justify", icon: <AlignJustify size={14} /> },
            ]}
            activeKeys={[selectedText.textAlign || "center"]}
            onSelect={(key) =>
              updateText({ textAlign: key as CanvasElement["textAlign"] })
            }
          />

          <IconToggleGroup
            title="Vertical Alignment"
            columns="grid-cols-3"
            items={[
              { key: "top", icon: <Type size={12} className="-translate-y-[2px]" /> },
              { key: "middle", icon: <Type size={12} /> },
              { key: "bottom", icon: <Type size={12} className="translate-y-[2px]" /> },
            ]}
            activeKeys={[selectedText.textVerticalAlign || "middle"]}
            onSelect={(key) =>
              updateText({
                textVerticalAlign: key as CanvasElement["textVerticalAlign"],
              })
            }
          />

          <PrecisionControl
            title="Line Height"
            value={lineHeightUi}
            min={60}
            max={400}
            step={5}
            onChange={(value) => updateText({ lineHeight: value / 100 })}
          />

          <PrecisionControl
            title="Letter Spacing"
            value={selectedText.letterSpacing ?? 0}
            min={-5}
            max={20}
            step={0.5}
            onChange={(value) => updateText({ letterSpacing: value })}
          />

          {/* <div className="space-y-2">
            <div className={ROW_LABEL}>List</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <select
                  value={selectedText.listStyle || "none"}
                  onChange={(event) =>
                    updateText({
                      listStyle: event.target.value as CanvasElement["listStyle"],
                    })
                  }
                  className="h-9 w-full appearance-none rounded-[3px] border border-[#d7dce3] bg-white pl-9 pr-8 text-[12px] text-[#2f3742] outline-none"
                >
                  <option value="none">None</option>
                  <option value="bulleted">Bulleted</option>
                  <option value="numbered">Numbered</option>
                </select>
                {(selectedText.listStyle || "none") === "numbered" ? (
                  <ListOrdered
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a94a3]"
                  />
                ) : (
                  <List
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a94a3]"
                  />
                )}
                <ChevronDown
                  size={13}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8a94a3]"
                />
              </div>
              <div className="relative">
                <select
                  value={selectedText.listPosition || "outside"}
                  onChange={(event) =>
                    updateText({
                      listPosition: event.target.value as CanvasElement["listPosition"],
                    })
                  }
                  className="h-9 w-full appearance-none rounded-[3px] border border-[#d7dce3] bg-white pl-3 pr-8 text-[12px] text-[#2f3742] outline-none"
                >
                  <option value="outside">Outside</option>
                  <option value="inside">Inside</option>
                </select>
                <ChevronDown
                  size={13}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8a94a3]"
                />
              </div>
            </div>
          </div> */}

          <ToggleSwitch
            label="Background"
            checked={Boolean(selectedText.textBackgroundColor)}
            onToggle={() =>
              updateText({
                textBackgroundColor: selectedText.textBackgroundColor
                  ? undefined
                  : "rgba(15, 23, 42, 0.14)",
              })
            }
          />

          <div className="space-y-2 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className={ROW_LABEL}>Shadow</div>
              <div className="relative w-[140px] shrink-0">
                <button
                  type="button"
                  onClick={() => setShadowMenuOpen((open) => !open)}
                  className="flex h-9 w-full items-center justify-between rounded-[3px] border border-[#d7dce3] bg-white px-3 text-[12px] text-[#2f3742] outline-none"
                >
                  <span className="truncate whitespace-nowrap pr-2 text-left">{SHADOW_OPTIONS.find((option) => option.value === shadowMode)?.label ?? "None"}</span>
                  <ChevronDown size={13} className={`text-[#8a94a3] transition ${shadowMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {shadowMenuOpen ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 rounded-[14px] border border-[#d7dce3] bg-white p-2 shadow-[0_18px_38px_rgba(15,23,42,0.12)]">
                    {SHADOW_OPTIONS.map((option) => {
                      const isSelected = option.value === shadowMode;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => applyShadowOption(option.value)}
                          className={`flex w-full items-center justify-between rounded-[10px] px-3 py-3 text-left text-[12px] transition ${
                            isSelected
                              ? "bg-[#eaf6fd] text-[#0b5d8d]"
                              : "text-[#2f3742] hover:bg-[#f7f9fb]"
                          }`}
                        >
                          <span className="whitespace-nowrap">{option.label}</span>
                          {isSelected ? <Check size={14} /> : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            {shadowMode !== "none" ? (
              <div className="space-y-4 rounded-[3px] border border-[#eef1f5] bg-[#fafbfd] px-3 py-3">
                {shadowMode === "custom-shadow" ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-[72px] whitespace-nowrap text-[12px] text-[#6b7280]">Color</div>
                      <label className="flex h-8 w-12 cursor-pointer items-center justify-center rounded-[3px] border border-[#d7dce3] bg-white p-1">
                        <input
                          type="color"
                          value={effect.shadowColor || CUSTOM_SHADOW_DEFAULTS.shadowColor}
                          onChange={(event) =>
                            updateEffect({
                              preset: "drop-shadow",
                              shadowColor: event.target.value,
                            })
                          }
                          className="h-6 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
                        />
                      </label>
                    </div>

                    <ShadowControl
                      label="Opacity"
                      value={Math.round((effect.shadowOpacity || 0) * 100)}
                      min={0}
                      max={100}
                      step={1}
                      onChange={(value) =>
                        updateEffect({
                          preset: "drop-shadow",
                          shadowOpacity: value / 100,
                        })
                      }
                    />

                    <ShadowControl
                      label="Distance"
                      value={shadowDistance}
                      min={0}
                      max={40}
                      step={1}
                      onChange={(value) =>
                        updateEffect({
                          preset: "drop-shadow",
                          ...getShadowOffsets(value, shadowAngle),
                        })
                      }
                    />

                    <ShadowControl
                      label="Angle"
                      value={shadowAngle}
                      min={0}
                      max={360}
                      step={1}
                      onChange={(value) =>
                        updateEffect({
                          preset: "drop-shadow",
                          ...getShadowOffsets(shadowDistance, value),
                        })
                      }
                    />

                    <ShadowControl
                      label="Blur"
                      value={Math.round(effect.shadowBlur || 0)}
                      min={0}
                      max={40}
                      step={1}
                      onChange={(value) =>
                        updateEffect({
                          preset: "drop-shadow",
                          shadowBlur: value,
                        })
                      }
                    />
                  </>
                ) : (
                  <ShadowControl
                    label="Distance"
                    value={shadowDistance}
                    min={0}
                    max={40}
                    step={1}
                    onChange={(value) => {
                      const preset = SHADOW_PRESET_CONFIG[shadowMode];
                      updateEffect({
                        preset: "drop-shadow",
                        shadowColor: preset.shadowColor,
                        shadowOpacity: preset.shadowOpacity,
                        shadowBlur: preset.shadowBlur,
                        ...getShadowOffsets(value, preset.angle),
                      });
                    }}
                  />
                )}
              </div>
            ) : null}
          </div>
        </div>
      </Section>

      {/* <Section title="Interactivity">
        <div className="space-y-2.5">
          <div className={ROW_LABEL}>Link</div>
          <div className="relative">
            <Link2
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a94a3]"
            />
            <input
              type="url"
              value={selectedText.linkUrl || ""}
              onChange={(event) => updateText({ linkUrl: event.target.value })}
              placeholder="Add a URL"
              className="h-9 w-full rounded-[3px] border border-[#d7dce3] bg-white pl-9 pr-3 text-[12px] text-[#1f2937] outline-none focus:ring-1 focus:ring-[#9ed8fb]"
            />
          </div>
          <p className="text-[11px] leading-5 text-[#9ca3af]">
            You can add a link to any web page. Links are clickable in these options.
          </p>
          <div className="space-y-1 bg-[#f6f7f9] px-2 py-2 text-[11px] text-[#7650e3]">

            <button type="button" className="flex items-center gap-1.5 text-left hover:underline">
              <span className="text-[#5dc0f4]">✓</span>
              Publish as Embedded Link
            </button>
          </div>
        </div>
      </Section> */}

      <Section title="Position">
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: "X", value: selectedText.x, key: "x" },
            { label: "Y", value: selectedText.y, key: "y" },
            { label: "W", value: selectedText.width, key: "width" },
            { label: "H", value: selectedText.height, key: "height" },
          ].map((item) => (
            <label key={item.label} className="space-y-1.5">
              <span className={ROW_LABEL}>{item.label}</span>
              <input
                type="number"
                inputMode="decimal"
                disabled={isLocked}
                value={Math.round(item.value)}
                onChange={(event) =>
                  !isLocked &&
                  updateText({
                    [item.key]: Number(event.target.value),
                  } as Partial<CanvasElement>)
                }
                className={`h-9 w-full rounded-[3px] border px-3 text-[12px] font-medium outline-none focus:ring-1 ${
                  isLocked
                    ? "cursor-not-allowed border-[#e5e7eb] bg-[#f3f4f6] text-[#9ca3af]"
                    : "border-[#d7dce3] bg-white text-[#1f2937] focus:ring-[#9ed8fb]"
                }`}
              />
            </label>
          ))}
        </div>
      </Section>
    </div>
  );
};
