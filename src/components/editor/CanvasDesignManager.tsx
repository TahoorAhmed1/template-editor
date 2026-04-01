import React from "react";
import {
  CopyPlus,
  FolderOpen,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { CanvasSizePreset } from "./EditorShell";
import type { CanvasDesignRecord } from "@/services/canvasDesigns";

type DesignActionType = "load" | "rename" | "delete" | null;

interface CanvasDesignManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDesignId: string | null;
  currentDesignName: string;
  currentCanvasSize: CanvasSizePreset;
  currentElementCount: number;
  designs: CanvasDesignRecord[];
  isLoading: boolean;
  isSaving: boolean;
  activeDesignId: string | null;
  activeAction: DesignActionType;
  onRefresh: () => void;
  onSaveCurrent: (name: string) => void;
  onSaveAsNew: (name: string) => void;
  onLoadDesign: (design: CanvasDesignRecord) => void;
  onRenameDesign: (design: CanvasDesignRecord, name: string) => void;
  onDeleteDesign: (design: CanvasDesignRecord) => void;
}

const formatTimestamp = (value?: string) => {
  if (!value) {
    return "Not saved yet";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not saved yet";
  }

  return date.toLocaleString();
};

const getPreviewBackground = (design: CanvasDesignRecord) => {
  const background = design.json.canvasBackground?.trim();
  if (background) {
    return background;
  }

  return "linear-gradient(135deg, #f1f5f9, #dbeafe)";
};

const getElementCount = (design: CanvasDesignRecord) =>
  Array.isArray(design.json.elements) ? design.json.elements.length : 0;

export const CanvasDesignManager: React.FC<CanvasDesignManagerProps> = ({
  open,
  onOpenChange,
  currentDesignId,
  currentDesignName,
  currentCanvasSize,
  currentElementCount,
  designs,
  isLoading,
  isSaving,
  activeDesignId,
  activeAction,
  onRefresh,
  onSaveCurrent,
  onSaveAsNew,
  onLoadDesign,
  onRenameDesign,
  onDeleteDesign,
}) => {
  const [draftName, setDraftName] = React.useState(currentDesignName);
  const [editingDesignId, setEditingDesignId] = React.useState<string | null>(null);
  const [renameDraft, setRenameDraft] = React.useState("");

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setDraftName(currentDesignName);
    setEditingDesignId(null);
    setRenameDraft("");
  }, [currentDesignName, open]);

  const trimmedDraftName = draftName.trim();
  const canSave = trimmedDraftName.length > 0 && !isSaving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-5xl overflow-hidden p-0">
        <div className="border-b border-border px-6 py-5">
          <DialogHeader>
            <DialogTitle>Canvas JSON Library</DialogTitle>
            <DialogDescription>
              Save the current canvas, reopen previous versions, rename entries, or delete them.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="grid gap-6 overflow-hidden p-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <section className="space-y-4 rounded-2xl border border-border bg-muted/30 p-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Current canvas</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {currentCanvasSize.width} x {currentCanvasSize.height} px · {currentElementCount} layer{currentElementCount === 1 ? "" : "s"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Design name
              </label>
              <Input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="Enter a canvas name"
              />
            </div>

            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={() => onSaveCurrent(trimmedDraftName)}
                disabled={!canSave}
              >
                {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
                {currentDesignId ? "Update current design" : "Save new design"}
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => onSaveAsNew(trimmedDraftName)}
                disabled={!canSave}
              >
                <CopyPlus />
                Save as new copy
              </Button>
            </div>
          </section>

          <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-background">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Saved designs</h3>
                <p className="text-xs text-muted-foreground">
                  {designs.length} item{designs.length === 1 ? "" : "s"}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isLoading}>
                <RefreshCw className={cn(isLoading && "animate-spin")} />
                Refresh
              </Button>
            </div>

            <div className="min-h-[320px] overflow-y-auto p-4">
              {isLoading ? (
                <div className="flex h-full min-h-[240px] items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 animate-spin" />
                  Loading saved designs...
                </div>
              ) : !designs.length ? (
                <div className="flex h-full min-h-[240px] items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                  No saved canvas JSON yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {designs.map((design) => {
                    const isCurrent = design.id === currentDesignId;
                    const isBusy = activeDesignId === design.id;
                    const isEditing = editingDesignId === design.id;

                    return (
                      <div
                        key={design.id}
                        className={cn(
                          "grid gap-4 rounded-2xl border px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto]",
                          isCurrent ? "border-[#7650e3]/40 bg-[#7650e3]/5" : "border-border",
                        )}
                      >
                        <div className="flex min-w-0 gap-3">
                          <div className="mt-0.5 h-16 w-24 shrink-0 overflow-hidden rounded-2xl border border-border/80 bg-muted/30">
                            {design.json.thumbnailDataUrl ? (
                              <img
                                src={design.json.thumbnailDataUrl}
                                alt={design.name}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div
                                className="h-full w-full"
                                style={{ background: getPreviewBackground(design) }}
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            {isEditing ? (
                              <div className="space-y-2">
                                <Input
                                  value={renameDraft}
                                  onChange={(event) => setRenameDraft(event.target.value)}
                                  placeholder="Rename design"
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      onRenameDesign(design, renameDraft.trim());
                                      setEditingDesignId(null);
                                      setRenameDraft("");
                                    }}
                                    disabled={!renameDraft.trim() || (isBusy && activeAction === "rename")}
                                  >
                                    {isBusy && activeAction === "rename" ? (
                                      <Loader2 className="animate-spin" />
                                    ) : (
                                      <Save />
                                    )}
                                    Save name
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingDesignId(null);
                                      setRenameDraft("");
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2">
                                  <div className="truncate text-sm font-semibold text-foreground">
                                    {design.name}
                                  </div>
                                  {isCurrent ? (
                                    <span className="rounded-full bg-[#7650e3]/12 px-2 py-0.5 text-[11px] font-medium text-[#7650e3]">
                                      Current
                                    </span>
                                  ) : null}
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {design.dimension || "Custom size"} · {getElementCount(design)} layer{getElementCount(design) === 1 ? "" : "s"}
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  Updated {formatTimestamp(design.updatedAt ?? design.json.savedAt ?? design.createdAt)}
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {!isEditing ? (
                          <div className="flex flex-wrap items-start justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onLoadDesign(design)}
                              disabled={isBusy && activeAction === "load"}
                            >
                              {isBusy && activeAction === "load" ? (
                                <Loader2 className="animate-spin" />
                              ) : (
                                <FolderOpen />
                              )}
                              Open
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingDesignId(design.id);
                                setRenameDraft(design.name);
                              }}
                              disabled={isBusy}
                            >
                              <Pencil />
                              Rename
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onDeleteDesign(design)}
                              disabled={isBusy && activeAction === "delete"}
                            >
                              {isBusy && activeAction === "delete" ? (
                                <Loader2 className="animate-spin" />
                              ) : (
                                <Trash2 />
                              )}
                              Delete
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};