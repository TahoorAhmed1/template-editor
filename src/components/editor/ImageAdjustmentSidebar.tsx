import React from "react";
import {
  ChevronDown,
  Copy,
  Crop,
  Crown,
  ImagePlus,
  Link2,
  Minus,
  Move,
  Plus,
  Scissors,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { CanvasElement, CanvasSizePreset, LayerEffectProps } from "./EditorShell";
import { ArrangementControls, LockInPlaceControl, PositionSidebar } from "./PositionSidebar";

interface ImageAdjustmentSidebarProps {
  selectedImage: CanvasElement;
  canvasSize: CanvasSizePreset;
  maxLayerZIndex: number;
  onUpdate: (id: string, updates: Partial<CanvasElement>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveLayer: (id: string, dir: "up" | "down" | "top" | "bottom") => void;
}

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

const ROW_LABEL = "text-[11px] font-medium text-[#6b7280]";
const DIVIDER = "border-t border-[#e5e7eb] pt-4";

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const normalizeEffectProps = (selectedImage: CanvasElement): LayerEffectProps => ({
  ...defaultEffects,
  ...(selectedImage.effectProps ?? {}),
});

const ActionButton: React.FC<{
  icon: React.ReactNode;
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

const PrecisionControl: React.FC<{
  title: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  vibrateAtMidpoint?: boolean;
  isMobileViewport: boolean;
}> = ({ title, value, min, max, step, onChange, vibrateAtMidpoint = false, isMobileViewport }) => {
  const previousValueRef = React.useRef(value);

  const apply = React.useCallback(
    (nextValue: number) => {
      const safeValue = clamp(Number.isFinite(nextValue) ? nextValue : min, min, max);
      if (
        vibrateAtMidpoint &&
        isMobileViewport &&
        typeof navigator !== "undefined" &&
        typeof navigator.vibrate === "function"
      ) {
        const prev = previousValueRef.current;
        const crossedMidpoint = (prev < 50 && safeValue >= 50) || (prev > 50 && safeValue <= 50);
        if (crossedMidpoint) {
          navigator.vibrate(8);
        }
      }

      previousValueRef.current = safeValue;
      onChange(safeValue);
    },
    [isMobileViewport, max, min, onChange, vibrateAtMidpoint],
  );

  React.useEffect(() => {
    previousValueRef.current = value;
  }, [value]);

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

const SelectRow: React.FC<{
  title: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}> = ({ title, value, options, onChange }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between gap-3">
      <div className={ROW_LABEL}>{title}</div>
      <div className="relative w-[128px] shrink-0">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-full appearance-none rounded-[3px] border border-[#d7dce3] bg-white pl-3 pr-8 text-[12px] text-[#2f3742] outline-none"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8a94a3]" />
      </div>
    </div>
  </div>
);

export const ImageAdjustmentSidebar: React.FC<ImageAdjustmentSidebarProps> = ({
  selectedImage,
  canvasSize,
  maxLayerZIndex,
  onUpdate,
  onDuplicate,
  onDelete,
  onMoveLayer,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [activePanel, setActivePanel] = React.useState<"main" | "position">("main");
  const [isAiProcessing, setIsAiProcessing] = React.useState(false);
  const [isMobileViewport, setIsMobileViewport] = React.useState(false);
  const isLocked = Boolean(selectedImage.locked);
  const effect = normalizeEffectProps(selectedImage);
  const activePhase = selectedImage.animationProps?.activePhase ?? "end";

  React.useEffect(() => {
    setActivePanel("main");
  }, [selectedImage.id]);

  React.useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobileViewport(media.matches);
    update();

    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const updateImage = (updates: Partial<CanvasElement>) => {
    onUpdate(selectedImage.id, updates);
  };

  const updateEffect = (updates: Partial<LayerEffectProps>) => {
    updateImage({
      effectProps: {
        ...effect,
        ...updates,
      },
    });
  };

  const updateAnimationPhase = (phase: "start" | "end") => {
    updateImage({
      animationProps: {
        activePhase: phase,
        start:
          selectedImage.animationProps?.start ??
          { opacity: 0, x: 0, y: 20, scale: 1, rotation: 0 },
        end:
          selectedImage.animationProps?.end ??
          { opacity: 1, x: 0, y: 0, scale: 1, rotation: 0 },
      },
    });
  };

  const handleReplace = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateImage({ src: reader.result });
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleAiBackground = () => {
    setIsAiProcessing(true);
    window.setTimeout(() => {
      setIsAiProcessing(false);
    }, 1800);
  };

  if (activePanel === "position") {
    return (
      <PositionSidebar
        layer={selectedImage}
        canvasSize={canvasSize}
        onUpdate={updateImage}
        onBack={() => setActivePanel("main")}
      />
    );
  }

  return (
    <div className="bg-white px-3 pb-5 pt-2 text-[#1f2937]">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleReplace}
        className="hidden"
      />

      <div className="grid grid-cols-4 gap-2">
        <ActionButton icon={<Move size={13} />} label="Position" onClick={() => setActivePanel("position")} />
        <ActionButton icon={<Copy size={13} />} label="Duplicate" onClick={onDuplicate} />
        <ActionButton
          icon={<Copy size={13} />}
          label="Copy Style"
          onClick={() => {
            void navigator.clipboard?.writeText(
              JSON.stringify({
                brightness: selectedImage.brightness ?? 50,
                contrast: selectedImage.contrast ?? 50,
                vibrance: selectedImage.vibrance ?? 50,
                saturation: selectedImage.saturation ?? 50,
                blackAndWhite: selectedImage.blackAndWhite ?? false,
                sepiaEnabled: selectedImage.sepiaEnabled ?? false,
                invert: selectedImage.invert ?? 0,
                removeColorEnabled: selectedImage.removeColorEnabled ?? false,
                tintEnabled: selectedImage.tintEnabled ?? false,
                gammaEnabled: selectedImage.gammaEnabled ?? false,
                roundnessEnabled: selectedImage.roundnessEnabled ?? false,
                borderRadius: selectedImage.borderRadius ?? 0,
                borderWidth: selectedImage.borderWidth ?? 0,
                linkUrl: selectedImage.linkUrl ?? "",
                effectProps: effect,
              }),
            );
          }}
        />
        <ActionButton icon={<Trash2 size={13} />} label="Delete" onClick={onDelete} tone="danger" />
      </div>

      <Section title="Arrangement" divider={false}>
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <ArrangementControls
                layer={selectedImage}
                maxLayerZIndex={maxLayerZIndex}
                onMoveLayer={onMoveLayer}
              />
            </div>
            <LockInPlaceControl
              locked={isLocked}
              onToggle={() => updateImage({ locked: !isLocked })}
            />
          </div>
          <ToggleSwitch
            label="Preserve Ratio"
            checked={Boolean(selectedImage.preserveAspectRatio)}
            onToggle={() =>
              updateImage({
                preserveAspectRatio: !selectedImage.preserveAspectRatio,
              })
            }
          />
        </div>
      </Section>

      <Section title="Opacity">
        <PrecisionControl
          title=""
          value={selectedImage.opacity ?? 100}
          min={0}
          max={100}
          step={1}
          onChange={(value) => updateImage({ opacity: value })}
          isMobileViewport={isMobileViewport}
        />
      </Section>

      {/* <Section title="Animation">
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: "start", label: "Start" },
            { key: "end", label: "End" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => updateAnimationPhase(item.key as "start" | "end")}
              className={`flex min-h-[54px] flex-col items-center justify-center rounded-md border transition ${
                activePhase === item.key
                  ? "border-[#9ed8fb] bg-[#7650e3] text-[#33a8ef]"
                  : "border-[#d7dce3] bg-white text-[#6b7280] hover:bg-[#f7f9fb]"
              }`}
            >
              <Sparkles size={15} />
              <span className="mt-1 text-[12px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </Section> */}

      <Section title="Image Actions">
        <div className="space-y-2 text-[12px] text-[#4b5563]">
          <button type="button" className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 hover:bg-[#f7f9fb]" onClick={() => updateImage({ maskShape: selectedImage.maskShape === "rounded" ? "none" : "rounded" })}>
            <Crop size={14} className="text-[#6b7280]" />
            <span>Crop</span>
          </button>
          <button type="button" className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 hover:bg-[#f7f9fb]" onClick={() => fileInputRef.current?.click()}>
            <ImagePlus size={14} className="text-[#6b7280]" />
            <span>Replace</span>
          </button>
     
          <button type="button" className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 hover:bg-[#f7f9fb]" onClick={() => updateImage({ maskShape: selectedImage.maskShape === "circle" ? "none" : "circle" })}>
            <Scissors size={14} className="text-[#6b7280]" />
            <span>Mask</span>
          </button>
        </div>
      </Section>

      <Section title="Effects">
        <div className="space-y-4">
          <SelectRow
            title="Edge Effects"
            value={(selectedImage.borderWidth ?? 0) > 0 ? "outline" : "none"}
            options={[
              { label: "None", value: "none" },
              { label: "Outline", value: "outline" },
            ]}
            onChange={(value) =>
              updateImage(
                value === "outline"
                  ? { borderWidth: 2, borderColor: selectedImage.borderColor || "#ffffff" }
                  : { borderWidth: 0 },
              )
            }
          />

          <SelectRow
            title="Shadow"
            value={effect.preset === "drop-shadow" ? "drop-shadow" : "none"}
            options={[
              { label: "None", value: "none" },
              { label: "Soft", value: "drop-shadow" },
            ]}
            onChange={(value) =>
              updateEffect(
                value === "drop-shadow"
                  ? { preset: "drop-shadow", shadowBlur: Math.max(18, effect.shadowBlur), shadowOffsetY: 8 }
                  : { preset: "none", shadowBlur: 0 },
              )
            }
          />

          {effect.preset === "drop-shadow" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className={ROW_LABEL}>Shadow Color</div>
                <label className="flex h-8 w-10 cursor-pointer items-center justify-center rounded-[3px] border border-[#d7dce3] bg-white p-1">
                  <input
                    type="color"
                    value={effect.shadowColor}
                    onChange={(event) =>
                      updateEffect({
                        preset: "drop-shadow",
                        shadowColor: event.target.value,
                      })
                    }
                    className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                </label>
              </div>
            </div>
          ) : null}

          <SelectRow
            title="Glow"
            value={effect.preset === "neon-glow" ? "neon-glow" : "none"}
            options={[
              { label: "None", value: "none" },
              { label: "Glow", value: "neon-glow" },
            ]}
            onChange={(value) =>
              updateEffect(
                value === "neon-glow"
                  ? { preset: "neon-glow", glowIntensity: Math.max(16, effect.glowIntensity) }
                  : { preset: effect.preset === "neon-glow" ? "none" : effect.preset },
              )
            }
          />

          <SelectRow
            title="Border"
            value={(selectedImage.borderWidth ?? 0) > 0 ? "solid" : "none"}
            options={[
              { label: "None", value: "none" },
              { label: "Solid", value: "solid" },
            ]}
            onChange={(value) =>
              updateImage(
                value === "solid"
                  ? { borderWidth: Math.max(2, selectedImage.borderWidth ?? 2), borderColor: selectedImage.borderColor || "#ffffff" }
                  : { borderWidth: 0 },
              )
            }
          />

          <ToggleSwitch
            label="Roundness"
            checked={Boolean(selectedImage.roundnessEnabled)}
            onToggle={() =>
              updateImage({
                roundnessEnabled: !selectedImage.roundnessEnabled,
                borderRadius: !selectedImage.roundnessEnabled
                  ? Math.max(32, selectedImage.borderRadius ?? 0)
                  : 0,
              })
            }
          />
          {selectedImage.roundnessEnabled ? (
            <PrecisionControl
              title="Radius"
              value={selectedImage.borderRadius ?? 32}
              min={0}
              max={200}
              step={1}
              onChange={(value) => updateImage({ borderRadius: value })}
              isMobileViewport={isMobileViewport}
            />
          ) : null}
          <ToggleSwitch
            label="Black & White"
            checked={Boolean(selectedImage.blackAndWhite)}
            onToggle={() => updateImage({ blackAndWhite: !selectedImage.blackAndWhite })}
          />
          <ToggleSwitch
            label="Sepia"
            checked={Boolean(selectedImage.sepiaEnabled)}
            onToggle={() => updateImage({ sepiaEnabled: !selectedImage.sepiaEnabled })}
          />
          <ToggleSwitch
            label="Invert"
            checked={(selectedImage.invert ?? 0) > 0}
            onToggle={() => updateImage({ invert: (selectedImage.invert ?? 0) > 0 ? 0 : 100 })}
          />
          <ToggleSwitch
            label="Remove color"
            checked={Boolean(selectedImage.removeColorEnabled)}
            onToggle={() => updateImage({ removeColorEnabled: !selectedImage.removeColorEnabled })}
          />
        </div>
      </Section>

      <Section title="Adjustments">
        <div className="space-y-4">
          <PrecisionControl
            title="Brightness"
            value={selectedImage.brightness ?? 50}
            min={0}
            max={100}
            step={1}
            onChange={(value) => updateImage({ brightness: value })}
            vibrateAtMidpoint
            isMobileViewport={isMobileViewport}
          />
          <PrecisionControl
            title="Contrast"
            value={selectedImage.contrast ?? 50}
            min={0}
            max={100}
            step={1}
            onChange={(value) => updateImage({ contrast: value })}
            vibrateAtMidpoint
            isMobileViewport={isMobileViewport}
          />
          <PrecisionControl
            title="Vibrance"
            value={selectedImage.vibrance ?? 50}
            min={0}
            max={100}
            step={1}
            onChange={(value) => updateImage({ vibrance: value })}
            vibrateAtMidpoint
            isMobileViewport={isMobileViewport}
          />
          <PrecisionControl
            title="Saturation"
            value={selectedImage.saturation ?? 50}
            min={0}
            max={100}
            step={1}
            onChange={(value) => updateImage({ saturation: value })}
            vibrateAtMidpoint
            isMobileViewport={isMobileViewport}
          />
          <ToggleSwitch
            label="Tint"
            checked={Boolean(selectedImage.tintEnabled)}
            onToggle={() => updateImage({ tintEnabled: !selectedImage.tintEnabled })}
          />
          <ToggleSwitch
            label="Multiply"
            checked={effect.blendMode === "multiply"}
            onToggle={() => updateEffect({ blendMode: effect.blendMode === "multiply" ? "normal" : "multiply" })}
          />
          <ToggleSwitch
            label="Gamma"
            checked={Boolean(selectedImage.gammaEnabled)}
            onToggle={() => updateImage({ gammaEnabled: !selectedImage.gammaEnabled })}
          />
        </div>
      </Section>

      {/* <Section title="Interactivity">
        <div className="space-y-2.5">
          <div className={ROW_LABEL}>Link</div>
          <div className="relative">
            <Link2 size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a94a3]" />
            <input
              type="url"
              value={selectedImage.linkUrl || ""}
              onChange={(event) => updateImage({ linkUrl: event.target.value })}
              placeholder="Add a URL"
              className="h-9 w-full rounded-[3px] border border-[#d7dce3] bg-white pl-9 pr-3 text-[12px] text-[#1f2937] outline-none focus:ring-1 focus:ring-[#9ed8fb]"
            />
          </div>
   
        </div>
      </Section> */}
    </div>
  );
};