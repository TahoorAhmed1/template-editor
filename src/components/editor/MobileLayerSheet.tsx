import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Copy, Trash2, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown } from "lucide-react";
import type { CanvasElement } from "./EditorShell";

export type MobileLayerSheetSection = "content" | "style" | "arrange";

interface MobileLayerSheetProps {
  layer: CanvasElement | null;
  section?: MobileLayerSheetSection;
  onSectionChange?: (section: MobileLayerSheetSection) => void;
  onClose: () => void;
  onUpdateLayer: (id: string, updates: Partial<CanvasElement>) => void;
  onDeleteLayer: (id: string) => void;
  onDuplicateLayer: (id: string) => void;
  onMoveLayer: (id: string, direction: "up" | "down" | "top" | "bottom") => void;
  hideSectionTabs?: boolean;
}

const SECTION_LABELS: Record<MobileLayerSheetSection, string> = {
  content: "Content",
  style: "Style",
  arrange: "Arrange",
};

const getAvailableSections = (layer: CanvasElement): MobileLayerSheetSection[] => {
  switch (layer.type) {
    case "text":
      return ["content", "style", "arrange"];
    case "table":
    case "video":
      return ["content", "style", "arrange"];
    case "image":
    case "shape":
    default:
      return ["style", "arrange"];
  }
};

const numberValue = (value: number | undefined, fallback = 0) =>
  Number.isFinite(value) ? Number(value) : fallback;

const compactInputClass =
  "h-9 rounded-lg border border-border bg-accent/40 px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20";

const compactNumberClass =
  "h-9 w-full rounded-lg border border-border bg-accent/40 px-2 text-center text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20";

const compactButtonClass =
  "rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground transition hover:bg-accent";

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{children}</div>
);

const FieldRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-sm text-muted-foreground">{label}</span>
    <div className="flex items-center gap-2">{children}</div>
  </div>
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
        <span className="text-xs font-medium text-muted-foreground">{field.label}</span>
        <input
          type="number"
          value={Math.round(field.value)}
          onChange={(event) => onUpdate({ [field.key]: Number(event.target.value) } as Partial<CanvasElement>)}
          className={compactNumberClass}
        />
      </label>
    ))}
  </div>
);

const ActionRow: React.FC<{
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveLayer: (direction: "up" | "down" | "top" | "bottom") => void;
}> = ({ onDuplicate, onDelete, onMoveLayer }) => (
  <div className="space-y-3">
    <SectionTitle>Layer</SectionTitle>
    <div className="grid grid-cols-3 gap-2">
      <button type="button" onClick={onDuplicate} className={compactButtonClass}>
        <span className="inline-flex items-center gap-2"><Copy size={14} />Duplicate</span>
      </button>
      <button type="button" onClick={() => onMoveLayer("up")} className={compactButtonClass}>
        <span className="inline-flex items-center gap-2"><ArrowUp size={14} />Up</span>
      </button>
      <button type="button" onClick={() => onMoveLayer("down")} className={compactButtonClass}>
        <span className="inline-flex items-center gap-2"><ArrowDown size={14} />Down</span>
      </button>
      <button type="button" onClick={() => onMoveLayer("top")} className={compactButtonClass}>
        <span className="inline-flex items-center gap-2"><ChevronsUp size={14} />Front</span>
      </button>
      <button type="button" onClick={() => onMoveLayer("bottom")} className={compactButtonClass}>
        <span className="inline-flex items-center gap-2"><ChevronsDown size={14} />Back</span>
      </button>
      <button type="button" onClick={onDelete} className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive transition hover:bg-destructive/10">
        <span className="inline-flex items-center gap-2"><Trash2 size={14} />Delete</span>
      </button>
    </div>
  </div>
);

const ContentPanel: React.FC<{
  layer: CanvasElement;
  onUpdate: (updates: Partial<CanvasElement>) => void;
}> = ({ layer, onUpdate }) => {
  if (layer.type === "text") {
    return (
      <div className="space-y-4">
        <SectionTitle>Text</SectionTitle>
        <textarea
          value={layer.content || ""}
          onChange={(event) => onUpdate({ content: event.target.value })}
          className="min-h-[120px] w-full rounded-xl border border-border bg-accent/30 px-3 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="Enter text"
        />
        <FieldRow label="Alignment">
          <select
            value={layer.textAlign || "left"}
            onChange={(event) => onUpdate({ textAlign: event.target.value as CanvasElement["textAlign"] })}
            className={compactInputClass}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
            <option value="justify">Justify</option>
          </select>
        </FieldRow>
      </div>
    );
  }

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
              const tableData = Array.from({ length: rows }, (_, rowIndex) => currentData[rowIndex] || Array(cols).fill(""));
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
                for (let index = row.length; index < cols; index += 1) nextRow[index] = "";
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
            onChange={(event) => onUpdate({ duration: Math.max(1, Number(event.target.value) || 1) })}
            className={compactNumberClass}
          />
        </FieldRow>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-accent/20 px-4 py-3 text-sm text-muted-foreground">
      No separate content controls for this layer.
    </div>
  );
};

const StylePanel: React.FC<{
  layer: CanvasElement;
  onUpdate: (updates: Partial<CanvasElement>) => void;
}> = ({ layer, onUpdate }) => {
  if (layer.type === "text") {
    return (
      <div className="space-y-4">
        <SectionTitle>Style</SectionTitle>
        <FieldRow label="Color">
          <input type="color" value={layer.color || "#123a63"} onChange={(event) => onUpdate({ color: event.target.value })} className="h-9 w-10 rounded-lg border border-border" />
        </FieldRow>
        <FieldRow label="Font Size">
          <input type="number" min="8" value={layer.fontSize || 24} onChange={(event) => onUpdate({ fontSize: Number(event.target.value) })} className={compactNumberClass} />
        </FieldRow>
        <FieldRow label="Weight">
          <select value={layer.fontWeight || "400"} onChange={(event) => onUpdate({ fontWeight: event.target.value })} className={compactInputClass}>
            <option value="300">Light</option>
            <option value="400">Regular</option>
            <option value="500">Medium</option>
            <option value="600">Semibold</option>
            <option value="700">Bold</option>
          </select>
        </FieldRow>
        <FieldRow label="Line Height">
          <input type="number" step="0.1" min="0.8" value={layer.lineHeight || 1.2} onChange={(event) => onUpdate({ lineHeight: Number(event.target.value) })} className={compactNumberClass} />
        </FieldRow>
      </div>
    );
  }

  if (layer.type === "image") {
    return (
      <div className="space-y-4">
        <SectionTitle>Adjustments</SectionTitle>
        <FieldRow label="Brightness">
          <input type="range" min="0" max="200" value={layer.brightness ?? 100} onChange={(event) => onUpdate({ brightness: Number(event.target.value) })} className="w-36" />
        </FieldRow>
        <FieldRow label="Contrast">
          <input type="range" min="0" max="200" value={layer.contrast ?? 100} onChange={(event) => onUpdate({ contrast: Number(event.target.value) })} className="w-36" />
        </FieldRow>
        <FieldRow label="Saturation">
          <input type="range" min="0" max="200" value={layer.saturation ?? 100} onChange={(event) => onUpdate({ saturation: Number(event.target.value) })} className="w-36" />
        </FieldRow>
        <FieldRow label="Blur">
          <input type="range" min="0" max="40" value={layer.blur ?? 0} onChange={(event) => onUpdate({ blur: Number(event.target.value) })} className="w-36" />
        </FieldRow>
      </div>
    );
  }

  if (layer.type === "shape") {
    return (
      <div className="space-y-4">
        <SectionTitle>Shape</SectionTitle>
        <FieldRow label="Fill">
          <input type="color" value={layer.backgroundColor || "#4488FF"} onChange={(event) => onUpdate({ backgroundColor: event.target.value })} className="h-9 w-10 rounded-lg border border-border" />
        </FieldRow>
        <FieldRow label="Border">
          <input type="color" value={layer.borderColor || "#000000"} onChange={(event) => onUpdate({ borderColor: event.target.value })} className="h-9 w-10 rounded-lg border border-border" />
        </FieldRow>
        <FieldRow label="Border Width">
          <input type="number" min="0" value={layer.borderWidth || 0} onChange={(event) => onUpdate({ borderWidth: Number(event.target.value) })} className={compactNumberClass} />
        </FieldRow>
        {layer.shapeType !== "circle" && layer.shapeType !== "triangle" && layer.shapeType !== "line" ? (
          <FieldRow label="Radius">
            <input type="number" min="0" value={layer.borderRadius || 0} onChange={(event) => onUpdate({ borderRadius: Number(event.target.value) })} className={compactNumberClass} />
          </FieldRow>
        ) : null}
      </div>
    );
  }

  if (layer.type === "table") {
    return (
      <div className="space-y-4">
        <SectionTitle>Style</SectionTitle>
        <FieldRow label="Text Color">
          <input type="color" value={layer.color || "#000000"} onChange={(event) => onUpdate({ color: event.target.value })} className="h-9 w-10 rounded-lg border border-border" />
        </FieldRow>
        <FieldRow label="Border Color">
          <input type="color" value={layer.borderColor || "#000000"} onChange={(event) => onUpdate({ borderColor: event.target.value })} className="h-9 w-10 rounded-lg border border-border" />
        </FieldRow>
        <FieldRow label="Border Width">
          <input type="number" min="0" value={layer.borderWidth || 1} onChange={(event) => onUpdate({ borderWidth: Number(event.target.value) })} className={compactNumberClass} />
        </FieldRow>
        <FieldRow label="Font Size">
          <input type="number" min="8" value={layer.fontSize || 14} onChange={(event) => onUpdate({ fontSize: Number(event.target.value) })} className={compactNumberClass} />
        </FieldRow>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionTitle>Style</SectionTitle>
      <FieldRow label="Opacity">
        <input type="range" min="0" max="100" value={layer.opacity ?? 100} onChange={(event) => onUpdate({ opacity: Number(event.target.value) })} className="w-36" />
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
  <div className="space-y-5">
    <div className="space-y-3">
      <SectionTitle>Position & Size</SectionTitle>
      <NumericGrid layer={layer} onUpdate={onUpdate} />
    </div>

    <div className="space-y-3">
      <SectionTitle>Transform</SectionTitle>
      <FieldRow label="Rotation">
        <input type="number" value={numberValue(layer.rotation)} onChange={(event) => onUpdate({ rotation: Number(event.target.value) })} className={compactNumberClass} />
      </FieldRow>
      <FieldRow label="Opacity">
        <input type="range" min="0" max="100" value={layer.opacity ?? 100} onChange={(event) => onUpdate({ opacity: Number(event.target.value) })} className="w-36" />
      </FieldRow>
    </div>

    <ActionRow onDuplicate={onDuplicate} onDelete={onDelete} onMoveLayer={onMoveLayer} />
  </div>
);

export const MobileLayerSheet: React.FC<MobileLayerSheetProps> = ({
  layer,
  section,
  onSectionChange,
  onClose,
  onUpdateLayer,
  onDeleteLayer,
  onDuplicateLayer,
  onMoveLayer,
  hideSectionTabs = false,
}) => {
  const availableSections = React.useMemo(
    () => (layer ? getAvailableSections(layer) : []),
    [layer],
  );
  const [internalSection, setInternalSection] = React.useState<MobileLayerSheetSection>("content");

  React.useEffect(() => {
    if (!layer) return;
    const nextSection = section && availableSections.includes(section) ? section : availableSections[0] || "arrange";
    setInternalSection(nextSection);
  }, [availableSections, layer, section]);

  const activeSection = section && availableSections.includes(section) ? section : internalSection;
  const setSection = (nextSection: MobileLayerSheetSection) => {
    setInternalSection(nextSection);
    onSectionChange?.(nextSection);
  };

  return (
    <AnimatePresence>
      {layer ? (
        <>
          <motion.button
            type="button"
            aria-label="Close selected layer panel"
            className="fixed inset-0 z-[70] bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed inset-x-0 bottom-0 z-[80] flex max-h-[74dvh] flex-col rounded-t-[28px] border-t border-border bg-background shadow-[0_-10px_30px_rgba(0,0,0,0.12)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
          >
            <div className="flex shrink-0 justify-center pt-2">
              <div className="h-1.5 w-12 rounded-full bg-muted" />
            </div>

            <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-3">
              <div>
                <div className="text-base font-semibold text-foreground">{hideSectionTabs ? SECTION_LABELS[activeSection] : "Layer"}</div>
                <div className="text-xs text-muted-foreground">
                  {hideSectionTabs
                    ? `${layer.type.charAt(0).toUpperCase() + layer.type.slice(1)} ${SECTION_LABELS[activeSection].toLowerCase()}`
                    : `${layer.type.charAt(0).toUpperCase() + layer.type.slice(1)} settings`}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {!hideSectionTabs ? (
              <div className="shrink-0 overflow-x-auto px-3 pb-2">
                <div className="flex gap-2">
                  {availableSections.map((item) => {
                    const active = item === activeSection;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setSection(item)}
                        className={`shrink-0 rounded-full px-3 py-2 text-sm font-medium transition ${active ? "bg-primary/10 text-primary" : "bg-accent/30 text-muted-foreground hover:bg-accent"}`}
                      >
                        {SECTION_LABELS[item]}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-2 editor-scroll"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {activeSection === "content" ? (
                <ContentPanel layer={layer} onUpdate={(updates) => onUpdateLayer(layer.id, updates)} />
              ) : null}
              {activeSection === "style" ? (
                <StylePanel layer={layer} onUpdate={(updates) => onUpdateLayer(layer.id, updates)} />
              ) : null}
              {activeSection === "arrange" ? (
                <ArrangePanel
                  layer={layer}
                  onUpdate={(updates) => onUpdateLayer(layer.id, updates)}
                  onDuplicate={() => onDuplicateLayer(layer.id)}
                  onDelete={() => {
                    onDeleteLayer(layer.id);
                    onClose();
                  }}
                  onMoveLayer={(direction) => onMoveLayer(layer.id, direction)}
                />
              ) : null}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
};
