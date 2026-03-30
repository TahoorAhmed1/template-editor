import React from "react";
import { ArrowLeft, Lock } from "lucide-react";
import type { CanvasElement, CanvasSizePreset } from "./EditorShell";

interface PositionSidebarProps {
  layer: CanvasElement;
  canvasSize: CanvasSizePreset;
  onUpdate: (updates: Partial<CanvasElement>) => void;
  onBack: () => void;
}

type AlignmentAction = "left" | "middle" | "right" | "top" | "center" | "bottom" | "core";
type LayerOrderAction = "bottom" | "backward" | "forward" | "top";

const clampToCanvas = (value: number, max: number) => Math.min(Math.max(0, Math.round(value)), Math.max(0, max));

const getVisualBounds = (layer: CanvasElement) => {
  const scale = layer.scale ?? 1;
  const width = Math.max(1, layer.width * scale);
  const height = Math.max(1, layer.height * scale);
  const angle = ((layer.rotation ?? 0) * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const corners = [
    { x: 0, y: 0 },
    { x: width * cos, y: width * sin },
    { x: -height * sin, y: height * cos },
    { x: width * cos - height * sin, y: width * sin + height * cos },
  ];

  const xs = corners.map((corner) => corner.x);
  const ys = corners.map((corner) => corner.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

const LayerOrderGlyph: React.FC<{ action: LayerOrderAction; muted?: boolean }> = ({ action, muted = false }) => {
  const tone = muted ? "text-[#C8CDD8]" : "text-[#163B72]";

  if (action === "bottom") {
    return (
      <span className={`relative h-[18px] w-[18px] ${tone}`}>
        <span className="absolute left-1/2 top-[1px] h-[7px] w-[7px] -translate-x-1/2 rotate-45 border-b-[1.7px] border-r-[1.7px] border-current" />
        <span className="absolute left-1/2 top-[6px] h-[7px] w-[7px] -translate-x-1/2 rotate-45 border-b-[1.7px] border-r-[1.7px] border-current" />
        <span className="absolute left-1/2 top-[13px] h-[1.7px] w-[12px] -translate-x-1/2 rounded-full bg-current" />
      </span>
    );
  }

  if (action === "top") {
    return (
      <span className={`relative h-[18px] w-[18px] ${tone}`}>
        <span className="absolute left-1/2 bottom-[1px] h-[7px] w-[7px] -translate-x-1/2 rotate-45 border-r-[1.7px] border-t-[1.7px] border-current" />
        <span className="absolute left-1/2 bottom-[6px] h-[7px] w-[7px] -translate-x-1/2 rotate-45 border-r-[1.7px] border-t-[1.7px] border-current" />
        <span className="absolute left-1/2 top-[1px] h-[1.7px] w-[12px] -translate-x-1/2 rounded-full bg-current" />
      </span>
    );
  }

  if (action === "backward") {
    return (
      <span className={`relative h-[18px] w-[18px] ${tone}`}>
        <span className="absolute left-1/2 top-[4px] h-[7px] w-[7px] -translate-x-1/2 rotate-45 border-b-[1.7px] border-r-[1.7px] border-current" />
        <span className="absolute left-1/2 top-[11px] h-[1.7px] w-[12px] -translate-x-1/2 rounded-full bg-current" />
      </span>
    );
  }

  return (
    <span className={`relative h-[18px] w-[18px] ${tone}`}>
      <span className="absolute left-1/2 bottom-[4px] h-[7px] w-[7px] -translate-x-1/2 rotate-45 border-r-[1.7px] border-t-[1.7px] border-current" />
      <span className="absolute left-1/2 top-[4px] h-[1.7px] w-[12px] -translate-x-1/2 rounded-full bg-current" />
    </span>
  );
};

const ArrangeButton: React.FC<{
  label: string;
  action: LayerOrderAction;
  onClick: () => void;
  disabled?: boolean;
}> = ({ label, action, onClick, disabled = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`flex flex-col items-center gap-1 rounded-[8px] px-1 py-1.5 text-center transition ${disabled ? "cursor-not-allowed" : "hover:bg-[#F8FAFD]"}`}
  >
    <span className="flex h-6 w-6 items-center justify-center">
      <LayerOrderGlyph action={action} muted={disabled} />
    </span>
    <span className={`text-[11px] leading-[14px] ${disabled ? "text-[#C7CCD7]" : "text-[#6A7283]"}`}>{label}</span>
  </button>
);

interface ArrangementControlsProps {
  layer: CanvasElement;
  maxLayerZIndex: number;
  onMoveLayer: (id: string, direction: "up" | "down" | "top" | "bottom") => void;
}

export const ArrangementControls: React.FC<ArrangementControlsProps> = ({
  layer,
  maxLayerZIndex,
  onMoveLayer,
}) => {
  const locked = Boolean(layer.locked);
  const isAtBottom = (layer.zIndex ?? 1) <= 1;
  const isAtTop = (layer.zIndex ?? 1) >= Math.max(1, maxLayerZIndex);

  return (
    <div className="grid grid-cols-4 gap-x-[6px]">
      <ArrangeButton
        label="To Botto..."
        action="bottom"
        onClick={() => onMoveLayer(layer.id, "bottom")}
        disabled={isAtBottom || locked}
      />
      <ArrangeButton
        label="Backward"
        action="backward"
        onClick={() => onMoveLayer(layer.id, "down")}
        disabled={isAtBottom || locked}
      />
      <ArrangeButton
        label="Forward"
        action="forward"
        onClick={() => onMoveLayer(layer.id, "up")}
        disabled={locked || isAtTop}
      />
      <ArrangeButton
        label="To Top"
        action="top"
        onClick={() => onMoveLayer(layer.id, "top")}
        disabled={locked || isAtTop}
      />
    </div>
  );
};

interface LockInPlaceControlProps {
  locked: boolean;
  onToggle: () => void;
}

export const LockInPlaceControl: React.FC<LockInPlaceControlProps> = ({
  locked,
  onToggle,
}) => (
  <button
    type="button"
    onClick={onToggle}
    aria-pressed={locked}
    aria-label={locked ? "Unlock layer" : "Lock layer"}
    title={locked ? "Unlock layer" : "Lock layer"}
    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border transition ${locked ? "border-[#B9C7EA] bg-[#E8F0FF] text-[#1D4ED8]" : "border-[#D8DCE5] bg-[#F8FAFD] text-[#6B7280] hover:bg-[#F1F5F9]"}`}
  >
    <Lock size={16} strokeWidth={1.8} />
  </button>
);

const AlignmentGlyph: React.FC<{ action: AlignmentAction }> = ({ action }) => {
  const verticalClass =
    action === "left"
      ? "left-[5px]"
      : action === "middle" || action === "core"
      ? "left-1/2 -translate-x-1/2"
      : "right-[5px]";
  const horizontalClass =
    action === "top"
      ? "top-[5px]"
      : action === "center" || action === "core"
      ? "top-1/2 -translate-y-1/2"
      : "bottom-[5px]";

  if (action === "core") {
    return (
      <span className="relative h-[16px] w-[16px] rounded-[3px] border-[1.4px] border-current">
        <span className="absolute left-1/2 top-1/2 h-[3px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-current" />
      </span>
    );
  }

  if (action === "left" || action === "middle" || action === "right") {
    return (
      <span className="relative h-[16px] w-[16px] rounded-[3px] border-[1.4px] border-current">
        <span className={`absolute bottom-[2px] top-[2px] w-[1.5px] rounded-full bg-current ${verticalClass}`} />
      </span>
    );
  }

  return (
    <span className="relative h-[16px] w-[16px] rounded-[3px] border-[1.4px] border-current">
      <span className={`absolute left-[2px] right-[2px] h-[1.5px] rounded-full bg-current ${horizontalClass}`} />
    </span>
  );
};

const AlignmentButton: React.FC<{
  label: string;
  action: AlignmentAction;
  onClick: () => void;
  disabled?: boolean;
}> = ({ label, action, onClick, disabled = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`flex flex-col items-center gap-1.5 rounded-[8px] px-1 py-1.5 text-center transition ${disabled ? "cursor-not-allowed opacity-50" : "hover:bg-[#F8FAFD]"}`}
  >
    <span className="flex h-6 w-6 items-center justify-center text-[#15386D]">
      <AlignmentGlyph action={action} />
    </span>
    <span className="text-[11px] leading-[14px] text-[#5B6780]">{label}</span>
  </button>
);

export const PositionSidebar: React.FC<PositionSidebarProps> = ({
  layer,
  canvasSize,
  onUpdate,
  onBack,
}) => {
  const locked = Boolean(layer.locked);
  const visualBounds = getVisualBounds(layer);

  const handleAlign = (action: AlignmentAction) => {
    if (locked) {
      return;
    }

    const maxCanvasX = Math.max(0, canvasSize.width - visualBounds.width);
    const maxCanvasY = Math.max(0, canvasSize.height - visualBounds.height);
    const left = clampToCanvas(0, maxCanvasX);
    const middle = clampToCanvas((canvasSize.width - visualBounds.width) / 2, maxCanvasX);
    const right = clampToCanvas(canvasSize.width - visualBounds.width, maxCanvasX);
    const top = clampToCanvas(0, maxCanvasY);
    const center = clampToCanvas((canvasSize.height - visualBounds.height) / 2, maxCanvasY);
    const bottom = clampToCanvas(canvasSize.height - visualBounds.height, maxCanvasY);

    if (action === "left") {
      onUpdate({ x: Math.round(left - visualBounds.minX) });
      return;
    }

    if (action === "middle") {
      onUpdate({ x: Math.round(middle - visualBounds.minX) });
      return;
    }

    if (action === "right") {
      onUpdate({ x: Math.round(right - visualBounds.minX) });
      return;
    }

    if (action === "top") {
      onUpdate({ y: Math.round(top - visualBounds.minY) });
      return;
    }

    if (action === "center") {
      onUpdate({ y: Math.round(center - visualBounds.minY) });
      return;
    }

    if (action === "bottom") {
      onUpdate({ y: Math.round(bottom - visualBounds.minY) });
      return;
    }

    onUpdate({
      x: Math.round(middle - visualBounds.minX),
      y: Math.round(center - visualBounds.minY),
    });
  };

  return (
    <div className="min-h-full bg-white text-[#1f2937]">
      <div className="flex items-center justify-between border-b border-[#E6E8ED] px-5 py-4">
        <button
          type="button"
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#44516A] transition hover:bg-[#F5F7FB]"
          aria-label="Back"
        >
          <ArrowLeft size={16} />
        </button>
        <h3 className="pr-8 text-[17px] font-medium tracking-[-0.01em] text-[#24324A]">Position</h3>
      </div>

      <div className="space-y-0 px-[14px] pb-5 pt-3">
        <div className="border-b border-[#D6DBE6] pb-[7px] pt-[4px]">
          <div className="text-[15px] font-medium text-[#1F3764]">
            Alignment on Design
          </div>
        </div>

        <div className="grid grid-cols-4 gap-x-[14px] gap-y-[16px] pt-[16px]">
          <div>
            <AlignmentButton label="Left" action="left" onClick={() => handleAlign("left")} disabled={locked} />
          </div>
          <div>
            <AlignmentButton label="Middle" action="middle" onClick={() => handleAlign("middle")} disabled={locked} />
          </div>
          <div>
            <AlignmentButton label="Right" action="right" onClick={() => handleAlign("right")} disabled={locked} />
          </div>
          <div>
            <AlignmentButton label="Top" action="top" onClick={() => handleAlign("top")} disabled={locked} />
          </div>
          <div>
            <AlignmentButton label="Center" action="center" onClick={() => handleAlign("center")} disabled={locked} />
          </div>
          <div>
            <AlignmentButton label="Bottom" action="bottom" onClick={() => handleAlign("bottom")} disabled={locked} />
          </div>
          <div>
            <AlignmentButton label="Core" action="core" onClick={() => handleAlign("core")} disabled={locked} />
          </div>
        </div>
      </div>
    </div>
  );
};