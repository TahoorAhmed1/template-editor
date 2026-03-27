import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { ElementInspector } from "./Inspector";
import type { CanvasElement } from "./EditorShell";

interface MobileLayerSheetProps {
  layer: CanvasElement | null;
  onClose: () => void;
  onUpdateLayer: (id: string, updates: Partial<CanvasElement>) => void;
  onDeleteLayer: (id: string) => void;
  onDuplicateLayer: (id: string) => void;
  onMoveLayer: (id: string, direction: "up" | "down" | "top" | "bottom") => void;
}

export const MobileLayerSheet: React.FC<MobileLayerSheetProps> = ({
  layer,
  onClose,
  onUpdateLayer,
  onDeleteLayer,
  onDuplicateLayer,
  onMoveLayer,
}) => {
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
            className="fixed inset-x-0 bottom-0 z-[80] rounded-t-[28px] border-t border-border bg-background shadow-[0_-10px_30px_rgba(0,0,0,0.12)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            style={{ maxHeight: "72dvh" }}
          >
            <div className="flex justify-center pt-2">
              <div className="h-1.5 w-12 rounded-full bg-muted" />
            </div>

            <div className="flex items-center justify-between px-4 pb-2 pt-3">
              <div>
                <div className="text-base font-semibold text-foreground">Layer</div>
                <div className="text-xs text-muted-foreground">
                  {layer.type.charAt(0).toUpperCase() + layer.type.slice(1)} settings
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

            <div className="overflow-y-auto px-3 pb-[calc(env(safe-area-inset-bottom)+16px)] editor-scroll">
              <ElementInspector
                element={layer}
                onUpdate={(updates) => onUpdateLayer(layer.id, updates)}
                onDelete={() => {
                  onDeleteLayer(layer.id);
                  onClose();
                }}
                onDuplicate={() => onDuplicateLayer(layer.id)}
                onMoveLayer={(direction) => onMoveLayer(layer.id, direction)}
              />
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
};
