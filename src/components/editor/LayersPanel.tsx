import React from "react";
import { Eye, EyeOff, GripVertical, Layers2, Trash2 } from "lucide-react";
import type { CanvasElement } from "./EditorShell";

interface LayersPanelProps {
  layers: CanvasElement[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onReorderLayers: (activeId: string, overId: string) => void;
}

const getLayerLabel = (layer: CanvasElement) => {
  if (layer.role === "design-title") return "Title";
  if (layer.type === "text") return layer.content?.trim() || "Text layer";
  if (layer.type === "image") return "Image layer";
  if (layer.type === "shape") return `${layer.shapeType || "shape"} layer`;
  if (layer.type === "table") return "Table layer";
  return "Layer";
};

export const LayersPanel: React.FC<LayersPanelProps> = ({
  layers,
  selectedLayerId,
  onSelectLayer,
  onToggleVisibility,
  onDeleteLayer,
  onReorderLayers,
}) => {
  const [draggedLayerId, setDraggedLayerId] = React.useState<string | null>(null);

  return (
    <div className="border-t border-editor-inspector-border bg-editor-inspector">
      <div className="flex items-center gap-2 px-4 py-3">
        <Layers2 size={15} className="text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Layers</h3>
      </div>

      <div className="max-h-[34vh] overflow-y-auto px-2 pb-3 editor-scroll">
        {layers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-editor-inspector-border px-3 py-6 text-center text-sm text-muted-foreground">
            No layers yet.
          </div>
        ) : (
          layers
            .slice()
            .sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0))
            .map((layer) => {
              const selected = selectedLayerId === layer.id;
              const visible = layer.visible !== false;

              return (
                <button
                  key={layer.id}
                  type="button"
                  draggable
                  onDragStart={() => setDraggedLayerId(layer.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (draggedLayerId && draggedLayerId !== layer.id) {
                      onReorderLayers(draggedLayerId, layer.id);
                    }
                    setDraggedLayerId(null);
                  }}
                  onDragEnd={() => setDraggedLayerId(null)}
                  onClick={() => onSelectLayer(layer.id)}
                  className={`mb-2 flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                    selected
                      ? "border-[#7650e3] bg-[#7650e3]/5"
                      : "border-transparent bg-accent/40 hover:border-editor-inspector-border hover:bg-accent/70"
                  }`}
                >
                  <GripVertical size={16} className="shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">
                      {getLayerLabel(layer)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {layer.type} · z{layer.zIndex ?? 0}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleVisibility(layer.id);
                    }}
                    className="rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                    aria-label={visible ? "Hide layer" : "Show layer"}
                  >
                    {visible ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteLayer(layer.id);
                    }}
                    className="rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Delete layer"
                  >
                    <Trash2 size={16} />
                  </button>
                </button>
              );
            })
        )}
      </div>
    </div>
  );
};
