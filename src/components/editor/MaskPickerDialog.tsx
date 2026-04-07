import React from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Check,
  ChevronDown,
  Minus,
  Plus,
  Redo2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { CanvasElement } from "./EditorShell";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type MaskShapeValue = NonNullable<CanvasElement["maskShape"]>;
type MaskEditorMode = "freehand" | "shape" | "text";
type PreviewJointMode = NonNullable<CanvasElement["maskJointMode"]>;
type PreviewTextAlign = NonNullable<CanvasElement["maskTextAlign"]>;

interface MaskPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedImage: CanvasElement;
  onApply: (updates: Partial<CanvasElement>) => void;
}

type Point = { x: number; y: number };
type Position = { x: number; y: number };

const FONT_OPTIONS = [
  "Archivo Black",
  "Poppins",
  "Montserrat",
  "DM Sans",
  "Playfair Display",
  "Oswald",
];

const MASK_OPTIONS: Array<{
  value: MaskShapeValue;
  label: string;
  previewColor: string;
}> = [
  { value: "triangle", label: "Triangle", previewColor: "#ffd3a7" },
  { value: "rounded", label: "Rounded", previewColor: "#f2a3ad" },
  { value: "circle", label: "Circle", previewColor: "#f2666d" },
  { value: "half-circle", label: "Half Circle", previewColor: "#60e4b0" },
  { value: "oval", label: "Oval", previewColor: "#e9a7c9" },
  { value: "right-triangle", label: "Right Triangle", previewColor: "#f472b6" },
  { value: "parallelogram", label: "Parallelogram", previewColor: "#f4ae61" },
  { value: "hexagon", label: "Hexagon", previewColor: "#f5c6a0" },
];

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const dotGridStyle: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(circle, rgba(227, 183, 108, 0.22) 1px, transparent 1.4px)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0",
};

const railDividerClass = "mx-auto w-[72px] border-t border-[#eceff3]";

const getInitialMode = (selectedImage: CanvasElement): MaskEditorMode => {
  if (selectedImage.maskMode === "text") {
    return "text";
  }

  if (selectedImage.maskMode === "freehand") {
    return "freehand";
  }

  if (selectedImage.maskShape && selectedImage.maskShape !== "none") {
    return "shape";
  }

  return "freehand";
};

const getDefaultMaskScale = (mode: MaskEditorMode) => (mode === "shape" ? 42 : 100);

const getShapeClipPath = (maskShape: MaskShapeValue) => {
  if (maskShape === "triangle") {
    return "polygon(50% 0%, 100% 100%, 0% 100%)";
  }

  if (maskShape === "star") {
    return "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";
  }

  if (maskShape === "heart") {
    return "path('M 50 92 C 15 70 0 48 0 28 C 0 10 14 0 28 0 C 40 0 48 8 50 16 C 52 8 60 0 72 0 C 86 0 100 10 100 28 C 100 48 85 70 50 92 Z')";
  }

  if (maskShape === "half-circle") {
    return "polygon(0% 50%, 2% 62%, 7% 73%, 15% 82%, 25% 90%, 37% 96%, 50% 100%, 63% 96%, 75% 90%, 85% 82%, 93% 73%, 98% 62%, 100% 50%)";
  }

  if (maskShape === "oval") {
    return "ellipse(50% 35% at 50% 50%)";
  }

  if (maskShape === "right-triangle") {
    return "polygon(0% 0%, 100% 100%, 0% 100%)";
  }

  if (maskShape === "parallelogram") {
    return "polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)";
  }

  if (maskShape === "hexagon") {
    return "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)";
  }

  return undefined;
};

const getShapeBorderRadius = (maskShape: MaskShapeValue) => {
  if (maskShape === "circle") {
    return "999px";
  }

  if (maskShape === "rounded") {
    return "22px";
  }

  return "0px";
};

const getShapeSample = (maskShape: MaskShapeValue, color: string) => {
  if (maskShape === "circle") {
    return <div className="h-[88px] w-[88px] rounded-full" style={{ backgroundColor: color }} />;
  }

  if (maskShape === "rounded") {
    return <div className="h-[88px] w-[88px] rounded-[2px]" style={{ backgroundColor: color }} />;
  }

  if (maskShape === "triangle") {
    return (
      <div
        className="h-[88px] w-[88px]"
        style={{
          backgroundColor: color,
          clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
        }}
      />
    );
  }

  if (maskShape === "heart") {
    return (
      <div
        className="h-[88px] w-[88px]"
        style={{
          backgroundColor: color,
          clipPath: "path('M 50 92 C 15 70 0 48 0 28 C 0 10 14 0 28 0 C 40 0 48 8 50 16 C 52 8 60 0 72 0 C 86 0 100 10 100 28 C 100 48 85 70 50 92 Z')",
        }}
      />
    );
  }

  if (maskShape === "star") {
    return (
      <div
        className="h-[88px] w-[88px]"
        style={{
          backgroundColor: color,
          clipPath:
            "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
        }}
      />
    );
  }

  if (maskShape === "half-circle") {
    return (
      <div
        className="h-[88px] w-[88px]"
        style={{
          backgroundColor: color,
          clipPath: "polygon(0% 50%, 2% 62%, 7% 73%, 15% 82%, 25% 90%, 37% 96%, 50% 100%, 63% 96%, 75% 90%, 85% 82%, 93% 73%, 98% 62%, 100% 50%)",
        }}
      />
    );
  }

  if (maskShape === "oval") {
    return (
      <div
        className="h-[88px] w-[88px]"
        style={{
          backgroundColor: color,
          clipPath: "ellipse(50% 35% at 50% 50%)",
        }}
      />
    );
  }

  if (maskShape === "right-triangle") {
    return (
      <div
        className="h-[88px] w-[88px]"
        style={{
          backgroundColor: color,
          clipPath: "polygon(0% 0%, 100% 100%, 0% 100%)",
        }}
      />
    );
  }

  if (maskShape === "parallelogram") {
    return (
      <div
        className="h-[88px] w-[88px]"
        style={{
          backgroundColor: color,
          clipPath: "polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)",
        }}
      />
    );
  }

  if (maskShape === "hexagon") {
    return (
      <div
        className="h-[88px] w-[88px]"
        style={{
          backgroundColor: color,
          clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
        }}
      />
    );
  }

  return (
    <div
      className="h-[88px] w-[88px]"
      style={{
        backgroundColor: color,
        clipPath: "polygon(0 32%, 100% 32%, 70% 74%, 0 74%)",
      }}
    />
  );
};

const buildFreehandPreviewPath = (points: Point[], jointMode: PreviewJointMode) => {
  if (points.length < 2) {
    return "";
  }

  if (jointMode === "straight") {
    // Subsample points so angular joints are clearly visible
    const step = Math.max(1, Math.floor(points.length / 30));
    const sampled: Point[] = [];
    for (let i = 0; i < points.length; i += step) {
      sampled.push(points[i]);
    }
    if (sampled[sampled.length - 1] !== points[points.length - 1]) {
      sampled.push(points[points.length - 1]);
    }
    return `${sampled.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")} Z`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const midpointX = (current.x + next.x) / 2;
    const midpointY = (current.y + next.y) / 2;
    path += ` Q ${current.x} ${current.y} ${midpointX} ${midpointY}`;
  }

  if (points.length >= 3) {
    const last = points[points.length - 1];
    const first = points[0];
    const closingMidpointX = (last.x + first.x) / 2;
    const closingMidpointY = (last.y + first.y) / 2;
    path += ` Q ${last.x} ${last.y} ${closingMidpointX} ${closingMidpointY}`;
  }

  return `${path} Z`;
};

const useElementSize = <T extends HTMLElement>() => {
  const ref = React.useRef<T | null>(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    const node = ref.current;
    if (!node) {
      return undefined;
    }

    const update = () => {
      const rect = node.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return { ref, size };
};

const SpinnerToggle: React.FC<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ label, checked, onChange }) => (
  <div className="space-y-1">
    <div className="text-[12px] font-medium text-[#a1a1aa]">{label}</div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative flex h-8 w-12 items-center rounded-full px-0.5 transition ${checked ? "bg-[#46c0f0]" : "bg-[#e5e7eb]"}`}
    >
      <span
        className={`h-7 w-7 rounded-full bg-white shadow-[0_1px_3px_rgba(15,23,42,0.18)] transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`}
      />
    </button>
  </div>
);

const FreehandRailIcon: React.FC<{ kind: "color-pop" | "joints" }> = ({ kind }) => {
  if (kind === "color-pop") {
    return (
      <div className="relative h-6 w-6">
        <span className="absolute left-[6px] top-[15px] h-[2px] w-[12px] -rotate-45 rounded-full bg-[#8f98aa]" />
        <span className="absolute left-[13px] top-[3px] h-[5px] w-[5px] rotate-45 border-r border-t border-[#8f98aa]" />
        <span className="absolute left-[4px] top-[7px] h-[4px] w-[4px] rotate-45 border-r border-t border-[#8f98aa]" />
      </div>
    );
  }

  return (
    <div className="relative h-6 w-6">
      <span className="absolute left-[4px] top-[17px] h-[4px] w-[4px] rounded-full bg-[#8f98aa]" />
      <span className="absolute left-[18px] top-[3px] h-[4px] w-[4px] rounded-full bg-[#8f98aa]" />
      <span className="absolute left-[7px] top-[7px] h-[2px] w-[12px] rotate-[-35deg] rounded-full bg-[#8f98aa]" />
    </div>
  );
};

const FreehandRailItem: React.FC<{
  icon: "color-pop" | "joints";
  title: string;
  value: string;
  onClick?: () => void;
}> = ({ icon, title, value, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full flex-col items-center gap-2 py-3 text-center ${onClick ? "transition hover:bg-[#fafbfd]" : "cursor-default"}`}
  >
    <FreehandRailIcon kind={icon} />
    <div className="text-[12px] leading-4 text-[#a1a1aa]">{title}</div>
    <div className="text-[13px] leading-4 text-[#7b8494]">{value}</div>
  </button>
);

const FooterActionButton: React.FC<{
  label: string;
  tone?: "primary" | "secondary" | "danger";
  onClick: () => void;
}> = ({ label, tone = "secondary", onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex h-[38px] items-center justify-center rounded-[8px] px-4 text-[12px] font-semibold transition ${
      tone === "primary"
        ? "bg-[#46c0f0] text-white hover:bg-[#25afe6]"
        : tone === "danger"
        ? "bg-[#e4405f] text-white hover:bg-[#d63354]"
        : "border border-[#d6deea] bg-white text-[#596275] hover:bg-[#f7f9fc]"
    }`}
  >
    {label}
  </button>
);

const TabButton: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex h-10 min-w-[74px] items-center justify-center rounded-[8px] border px-4 text-[14px] font-medium transition ${
      active
        ? "border-[#46c0f0] bg-[#46c0f0] text-white"
        : "border-[#d8dee9] bg-white text-[#465066] hover:bg-[#f8fafc]"
    }`}
  >
    {label}
  </button>
);

const NumericStepper: React.FC<{
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}> = ({ value, min, max, step = 1, onChange }) => {
  const apply = (nextValue: number) => onChange(clamp(nextValue, min, max));

  return (
    <div className="flex h-8 items-center overflow-hidden rounded-[4px] border border-[#d6deea] bg-white">
      <button
        type="button"
        onClick={() => apply(value - step)}
        className="flex h-8 w-8 items-center justify-center text-[#8490a3] transition hover:bg-[#f4f7fb]"
      >
        <Minus size={13} />
      </button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => apply(Number(event.target.value))}
        className="h-8 w-[54px] border-x border-[#d6deea] text-center text-[12px] font-medium text-[#4b5563] outline-none"
      />
      <button
        type="button"
        onClick={() => apply(value + step)}
        className="flex h-8 w-8 items-center justify-center text-[#8490a3] transition hover:bg-[#f4f7fb]"
      >
        <Plus size={13} />
      </button>
    </div>
  );
};

const SliderRow: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}> = ({ label, value, min, max, step = 1, onChange }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between gap-3">
      <div className="text-[13px] text-[#6b7280]">{label}</div>
      <NumericStepper value={value} min={min} max={max} step={step} onChange={onChange} />
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#d9edf8] accent-[#46c0f0]"
    />
  </div>
);

const AlignmentButton: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex h-7 w-7 items-center justify-center rounded-[6px] transition ${
      active ? "bg-[#dff4fd] text-[#46c0f0]" : "text-[#6b7280] hover:bg-[#f3f6fa]"
    }`}
  >
    {children}
  </button>
);

const PreviewHandles: React.FC = () => (
  <>
    {[
      "left-0 top-0",
      "left-1/2 top-0 -translate-x-1/2",
      "right-0 top-0",
      "left-0 top-1/2 -translate-y-1/2",
      "right-0 top-1/2 -translate-y-1/2",
      "left-0 bottom-0",
      "left-1/2 bottom-0 -translate-x-1/2",
      "right-0 bottom-0",
    ].map((position) => (
      <span
        key={position}
        className={`absolute h-3 w-3 rounded-[3px] border border-[#cfe9f7] bg-white ${position}`}
      />
    ))}
    <span className="absolute left-1/2 top-0 h-8 w-px -translate-x-1/2 -translate-y-full bg-[#38bdf8]" />
    <span className="absolute left-1/2 top-0 flex h-7 w-7 -translate-x-1/2 -translate-y-[38px] items-center justify-center rounded-full border border-[#d7e6f4] bg-white text-[#475569] shadow-[0_4px_14px_rgba(15,23,42,0.12)]">
      <span className="text-[14px] leading-none">⟳</span>
    </span>
  </>
);

const ShapePreview: React.FC<{
  imageSrc?: string;
  maskShape: MaskShapeValue;
  invert: boolean;
  colorPop: boolean;
  position: Position;
  scalePercent: number;
  onPositionChange: (next: Position) => void;
}> = ({ imageSrc, maskShape, invert, colorPop, position, scalePercent, onPositionChange }) => {
  const { ref, size } = useElementSize<HTMLDivElement>();
  const dragStateRef = React.useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const clipPath = getShapeClipPath(maskShape);
  const borderRadius = getShapeBorderRadius(maskShape);
  const boxSize = Math.max(64, (Math.min(size.width || 0, size.height || 0) * scalePercent) / 100);
  const halfSize = boxSize / 2;
  const overlayLeft = ((size.width || 0) * position.x) / 100 - halfSize;
  const overlayTop = ((size.height || 0) * position.y) / 100 - halfSize;
  const showBackgroundImage = colorPop || invert || maskShape === "none";

  const updatePositionFromPointer = React.useCallback(
    (clientX: number, clientY: number, offsetX: number, offsetY: number) => {
      const node = ref.current;
      if (!node) return;

      const rect = node.getBoundingClientRect();
      const centerX = clamp(clientX - rect.left - offsetX, halfSize, rect.width - halfSize);
      const centerY = clamp(clientY - rect.top - offsetY, halfSize, rect.height - halfSize);

      onPositionChange({
        x: clamp((centerX / rect.width) * 100, 0, 100),
        y: clamp((centerY / rect.height) * 100, 0, 100),
      });
    },
    [halfSize, onPositionChange, ref],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const node = ref.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const centerX = (position.x / 100) * rect.width;
    const centerY = (position.y / 100) * rect.height;
    dragStateRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left - centerX,
      offsetY: event.clientY - rect.top - centerY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    updatePositionFromPointer(event.clientX, event.clientY, dragState.offsetX, dragState.offsetY);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  if (!imageSrc) {
    return (
      <div className="flex h-full items-center justify-center rounded-[12px] border border-dashed border-[#d8e0eb] bg-white px-8 text-center text-sm text-[#94a3b8]">
        Add an image to preview the mask.
      </div>
    );
  }

  const baseImageFilter = colorPop && !invert ? "grayscale(100%)" : "none";
  const maskImageFilter = invert ? "grayscale(100%)" : "none";

  return (
    <div className="flex h-full items-center justify-center">
      <div ref={ref} className="relative aspect-[4/3] w-full max-w-[760px] overflow-hidden bg-white shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
        {showBackgroundImage ? (
          <img
            src={imageSrc}
            alt="Mask preview background"
            className="absolute inset-0 h-full w-full object-cover select-none"
            draggable={false}
            style={{ filter: baseImageFilter }}
          />
        ) : null}
        {!showBackgroundImage ? (
          <div className="absolute inset-0 bg-white" />
        ) : null}
        {maskShape === "none" ? null : (
        <div
          role="presentation"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="absolute cursor-move touch-none"
          style={{
            left: `${position.x}%`,
            top: `${position.y}%`,
            width: `${boxSize}px`,
            height: `${boxSize}px`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div
            className="relative h-full w-full overflow-hidden"
            style={{ borderRadius, clipPath }}
          >
            <img
              src={imageSrc}
              alt="Mask preview"
              className="absolute max-w-none select-none"
              draggable={false}
              style={{
                left: `${-overlayLeft}px`,
                top: `${-overlayTop}px`,
                width: `${size.width}px`,
                height: `${size.height}px`,
                objectFit: "cover",
                filter: maskImageFilter,
              }}
            />
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

const TextPreview: React.FC<{
  imageSrc?: string;
  text: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  fontWeight: "400" | "700";
  italic: boolean;
  decoration: "none" | "underline" | "line-through";
  textAlign: PreviewTextAlign;
  onTextChange: (text: string) => void;
}> = ({
  imageSrc,
  text,
  fontFamily,
  fontSize,
  lineHeight,
  letterSpacing,
  fontWeight,
  italic,
  decoration,
  textAlign,
  onTextChange,
}) => (
  <div className="flex h-full items-center justify-center">
    <div className="relative aspect-[4/3] w-full max-w-[760px] overflow-hidden bg-white shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
      {imageSrc ? <img src={imageSrc} alt="Text mask preview" className="h-full w-full object-cover" /> : null}
      <div className="absolute inset-x-[3%] top-[35%] min-h-[20%] border border-[#46c0f0] bg-[#47bdef]/22">
        <div
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onTextChange(e.currentTarget.textContent || "")}
          className="flex min-h-full items-center px-7 text-white outline-none"
          style={{
            fontFamily,
            fontSize: `${fontSize}px`,
            lineHeight: String(lineHeight / 100),
            letterSpacing: `${letterSpacing}px`,
            fontWeight,
            fontStyle: italic ? "italic" : "normal",
            textDecoration: decoration === "none" ? "none" : decoration,
            justifyContent:
              textAlign === "left"
                ? "flex-start"
                : textAlign === "center"
                ? "center"
                : textAlign === "justify"
                ? "flex-start"
                : "flex-end",
            textAlign,
            textShadow: "0 2px 8px rgba(0,0,0,0.3)",
            wordBreak: "break-word",
          }}
        >
          {text}
        </div>
        <PreviewHandles />
      </div>
    </div>
  </div>
);

const FreehandPreview: React.FC<{
  imageSrc?: string;
  points: Point[];
  jointMode: PreviewJointMode;
  colorPop: boolean;
  invert: boolean;
  onPointsChange: (points: Point[]) => void;
}> = ({ imageSrc, points, jointMode, colorPop, invert, onPointsChange }) => {
  const { ref, size } = useElementSize<HTMLDivElement>();
  const drawingRef = React.useRef(false);
  const [zoom, setZoom] = React.useState(1);

  const getRelativePoint = React.useCallback(
    (clientX: number, clientY: number) => {
      const node = ref.current;
      if (!node) {
        return null;
      }

      const rect = node.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const adjustedX = (clientX - rect.left - centerX) / zoom + centerX;
      const adjustedY = (clientY - rect.top - centerY) / zoom + centerY;
      const x = clamp((adjustedX / rect.width) * 100, 0, 100);
      const y = clamp((adjustedY / rect.height) * 100, 0, 100);
      return { x, y };
    },
    [ref, zoom],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const point = getRelativePoint(event.clientX, event.clientY);
    if (!point) return;

    drawingRef.current = true;
    onPointsChange([point]);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drawingRef.current) return;

    const point = getRelativePoint(event.clientX, event.clientY);
    if (!point) return;

    const previous = points[points.length - 1];
    if (previous && Math.abs(previous.x - point.x) <= 0.4 && Math.abs(previous.y - point.y) <= 0.4) {
      return;
    }

    onPointsChange([...points, point]);
  };

  const stopDrawing = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const previewPath = React.useMemo(() => buildFreehandPreviewPath(points, jointMode), [jointMode, points]);

  const baseFilter = colorPop && !invert ? "grayscale(100%)" : "none";
  const maskFilter = invert ? "grayscale(100%)" : "none";
  const hasMaskEffect = previewPath && (colorPop || invert);
  const maskSvgDataUrl = hasMaskEffect
    ? `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100%' height='100%' fill='black'/><path d='${previewPath}' fill='white'/></svg>`)}")`
    : undefined;

  return (
    <div className="relative flex h-full items-center justify-center">
      <div
        ref={ref}
        className="relative aspect-[4/3] w-full max-w-[760px] overflow-hidden bg-white shadow-[0_4px_14px_rgba(15,23,42,0.04)]"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDrawing}
        onPointerCancel={stopDrawing}
      >
        <div style={{ transform: `scale(${zoom})`, transformOrigin: "center center", width: "100%", height: "100%" }}>
          {imageSrc ? (
            <img src={imageSrc} alt="Freehand preview" className="h-full w-full object-cover" draggable={false} style={{ filter: baseFilter }} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[#94a3b8]">Add an image to preview the mask.</div>
          )}
          {imageSrc && maskSvgDataUrl ? (
            <img
              src={imageSrc}
              alt=""
              className="absolute inset-0 h-full w-full object-cover pointer-events-none"
              draggable={false}
              style={{
                filter: maskFilter,
                WebkitMaskImage: maskSvgDataUrl,
                maskImage: maskSvgDataUrl,
                WebkitMaskSize: "100% 100%",
                maskSize: "100% 100%",
              }}
            />
          ) : null}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full pointer-events-none">
            {previewPath ? (
              <path d={previewPath} fill="rgba(70,192,240,0.24)" stroke="rgba(70,192,240,0.92)" strokeWidth="0.45" />
            ) : null}
            {points.map((point, index) => (
              <g key={`${point.x}-${point.y}-${index}`}>
                <circle cx={point.x} cy={point.y} r="0.9" fill="#ffffff" stroke="#7dd3fc" strokeWidth="0.35" />
              </g>
            ))}
          </svg>
        </div>
      </div>
      <div className="absolute bottom-4 left-4 flex overflow-hidden rounded-[6px] border border-[#d7dce3] bg-white shadow-[0_4px_12px_rgba(15,23,42,0.08)]">
        <button
          type="button"
          onClick={() => onPointsChange([])}
          className="flex h-9 w-10 items-center justify-center text-[#64748b] transition hover:bg-[#f8fafc]"
        >
          <Undo2 size={15} />
        </button>
        <button type="button" className="flex h-9 w-10 items-center justify-center border-l border-[#d7dce3] text-[#cbd5e1]">
          <Redo2 size={15} />
        </button>
      </div>
      <div className="absolute bottom-4 right-4 flex overflow-hidden rounded-[6px] border border-[#d7dce3] bg-white shadow-[0_4px_12px_rgba(15,23,42,0.08)]">
        <button type="button" onClick={() => setZoom((z) => Math.min(z + 0.1, 3))} className="flex h-9 w-10 items-center justify-center text-[#64748b] transition hover:bg-[#f8fafc]">
          <ZoomIn size={15} />
        </button>
        <button type="button" onClick={() => setZoom((z) => Math.max(z - 0.1, 0.5))} className="flex h-9 w-10 items-center justify-center border-l border-[#d7dce3] text-[#64748b] transition hover:bg-[#f8fafc]">
          <ZoomOut size={15} />
        </button>
      </div>
      <div className="absolute top-3 right-3 rounded-md bg-white/90 px-3 py-1 text-[12px] text-[#64748b] shadow-[0_4px_12px_rgba(15,23,42,0.08)]">
        {zoom !== 1 ? `${Math.round(zoom * 100)}%` : size.width > 0 && points.length < 3 ? "Drag on the image to draw a mask" : `${points.length} points`}
      </div>
    </div>
  );
};

export const MaskPickerDialog: React.FC<MaskPickerDialogProps> = ({
  open,
  onOpenChange,
  selectedImage,
  onApply,
}) => {
  const [mode, setMode] = React.useState<MaskEditorMode>(() => getInitialMode(selectedImage));
  const [draftMaskShape, setDraftMaskShape] = React.useState<MaskShapeValue>(selectedImage.maskShape ?? "circle");
  const [invertPreview, setInvertPreview] = React.useState(Boolean(selectedImage.maskInvert));
  const [colorPopPreview, setColorPopPreview] = React.useState(Boolean(selectedImage.maskColorPop));
  const [jointMode, setJointMode] = React.useState<PreviewJointMode>(selectedImage.maskJointMode ?? "curved");
  const [textFontFamily, setTextFontFamily] = React.useState(selectedImage.maskTextFontFamily || FONT_OPTIONS[0]);
  const [textSize, setTextSize] = React.useState(selectedImage.maskTextFontSize ?? 180);
  const [textBold, setTextBold] = React.useState((selectedImage.maskTextFontWeight ?? "700") === "700");
  const [textItalic, setTextItalic] = React.useState((selectedImage.maskTextFontStyle ?? "normal") === "italic");
  const [textUnderline, setTextUnderline] = React.useState((selectedImage.maskTextDecoration ?? "none") === "underline");
  const [textStrike, setTextStrike] = React.useState((selectedImage.maskTextDecoration ?? "none") === "line-through");
  const [textAlign, setTextAlign] = React.useState<PreviewTextAlign>(selectedImage.maskTextAlign ?? "center");
  const [lineHeight, setLineHeight] = React.useState(selectedImage.maskTextLineHeight ?? 120);
  const [letterSpacing, setLetterSpacing] = React.useState(selectedImage.maskTextLetterSpacing ?? 0);
  const [textValue, setTextValue] = React.useState(selectedImage.maskText || "add your text");
  const [maskPosition, setMaskPosition] = React.useState<Position>({
    x: selectedImage.maskPositionX ?? 50,
    y: selectedImage.maskPositionY ?? 50,
  });
  const [maskScale, setMaskScale] = React.useState(selectedImage.maskScale ?? getDefaultMaskScale(getInitialMode(selectedImage)));
  const [freehandPoints, setFreehandPoints] = React.useState<Point[]>(selectedImage.maskFreehandPoints ?? []);

  React.useEffect(() => {
    if (!open) return;

    const initialMode = getInitialMode(selectedImage);
    setMode(initialMode);
    setDraftMaskShape(selectedImage.maskShape ?? "circle");
    setInvertPreview(Boolean(selectedImage.maskInvert));
    setColorPopPreview(Boolean(selectedImage.maskColorPop));
    setJointMode(selectedImage.maskJointMode ?? "curved");
    setTextFontFamily(selectedImage.maskTextFontFamily || FONT_OPTIONS[0]);
    setTextSize(selectedImage.maskTextFontSize ?? 180);
    setTextBold((selectedImage.maskTextFontWeight ?? "700") === "700");
    setTextItalic((selectedImage.maskTextFontStyle ?? "normal") === "italic");
    setTextUnderline((selectedImage.maskTextDecoration ?? "none") === "underline");
    setTextStrike((selectedImage.maskTextDecoration ?? "none") === "line-through");
    setTextAlign(selectedImage.maskTextAlign ?? "center");
    setLineHeight(selectedImage.maskTextLineHeight ?? 120);
    setLetterSpacing(selectedImage.maskTextLetterSpacing ?? 0);
    setTextValue(selectedImage.maskText || "add your text");
    setMaskPosition({
      x: selectedImage.maskPositionX ?? 50,
      y: selectedImage.maskPositionY ?? 50,
    });
    setMaskScale(selectedImage.maskScale ?? getDefaultMaskScale(initialMode));
    setFreehandPoints(selectedImage.maskFreehandPoints ?? []);
  }, [open, selectedImage]);

  const handleApply = () => {
    const baseUpdates: Partial<CanvasElement> = {
      maskInvert: invertPreview,
      maskColorPop: colorPopPreview,
      maskPositionX: maskPosition.x,
      maskPositionY: maskPosition.y,
      maskScale,
    };

    if (mode === "shape") {
      onApply({
        ...baseUpdates,
        maskMode: "shape",
        maskShape: draftMaskShape,
      });
      onOpenChange(false);
      return;
    }

    if (mode === "text") {
      onApply({
        ...baseUpdates,
        maskMode: "text",
        maskShape: "none",
        maskText: textValue,
        maskTextFontFamily: textFontFamily,
        maskTextFontSize: textSize,
        maskTextFontWeight: textBold ? "700" : "400",
        maskTextFontStyle: textItalic ? "italic" : "normal",
        maskTextDecoration: textStrike ? "line-through" : textUnderline ? "underline" : "none",
        maskTextAlign: textAlign,
        maskTextLineHeight: lineHeight,
        maskTextLetterSpacing: letterSpacing,
      });
      onOpenChange(false);
      return;
    }

    onApply({
      ...baseUpdates,
      maskMode: "freehand",
      maskShape: "none",
      maskJointMode: jointMode,
      maskFreehandPoints: freehandPoints,
    });
    onOpenChange(false);
  };

  const leftColumnWidth = mode === "freehand" ? "grid-cols-[170px_minmax(0,1fr)]" : "grid-cols-[248px_minmax(0,1fr)]";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[min(750px,92vh)] max-w-[1180px] overflow-hidden border-[#d9e1eb] bg-white p-0 sm:rounded-[4px]">
        <div className="border-b border-[#d8dee8] px-7 py-5">
          <DialogHeader className="text-left">
            <DialogTitle className="text-[18px] font-semibold text-[#374151]">Mask</DialogTitle>
          </DialogHeader>
        </div>

        <div className={`grid h-[calc(100%-77px)] ${leftColumnWidth} overflow-hidden`}>
          <div className="min-h-0 overflow-y-auto border-r border-[#e3e8ee] bg-white px-5 py-6">
            {mode === "shape" ? (
              <div className="space-y-5 pb-4">
                <div className="flex gap-5">
                  <SpinnerToggle label="Invert" checked={invertPreview} onChange={setInvertPreview} />
                  <SpinnerToggle label="Color Pop" checked={colorPopPreview} onChange={setColorPopPreview} />
                </div>

                <div>
                  <div className="pb-2 text-[14px] text-[#a1a1aa]">Select a shape</div>
                  <div className="border-t border-[#eceff3] pt-3" />
                  <div className="max-h-[430px] overflow-y-auto pr-1">
                    <div className="grid grid-cols-2 gap-3">
                      {MASK_OPTIONS.map((option) => {
                        const isSelected = option.value === draftMaskShape;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setDraftMaskShape(option.value)}
                            className={`relative flex h-[96px] items-center justify-center overflow-hidden border transition ${
                              isSelected ? "border-[#5b6174] bg-[#636878]" : "border-[#dde3eb] bg-white hover:bg-[#fafbfd]"
                            }`}
                          >
                            {getShapeSample(option.value, option.previewColor)}
                            {isSelected ? (
                              <span className="absolute inset-0 flex items-center justify-center">
                                <span className="flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-white bg-[#6b2837] text-white shadow-[0_8px_20px_rgba(15,23,42,0.18)]">
                                  <Check size={24} strokeWidth={3} />
                                </span>
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <SliderRow label="Size" value={maskScale} min={12} max={80} onChange={setMaskScale} />
              </div>
            ) : null}

            {mode === "text" ? (
              <div className="space-y-6 pb-4">
                <div className="space-y-2">
                  <div className="text-[14px] font-medium text-[#6b7280]">Select a font</div>
                  <div className="relative">
                    <select
                      value={textFontFamily}
                      onChange={(event) => setTextFontFamily(event.target.value)}
                      className="h-12 w-full appearance-none rounded-[4px] border border-[#d6deea] bg-white px-4 pr-10 text-[15px] text-[#616b7b] outline-none"
                    >
                      {FONT_OPTIONS.map((font) => (
                        <option key={font} value={font}>
                          {font}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#8b96a8]" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="border-b border-[#eceff3] pb-3 text-[14px] font-medium text-[#6b7280]">Font style</div>
                  <SliderRow label="Size" value={textSize} min={12} max={180} onChange={setTextSize} />

                  <div className="space-y-2">
                    <div className="text-[13px] text-[#6b7280]">Styles</div>
                    <div className="flex items-center gap-4 text-[#6b7280]">
                      <button type="button" onClick={() => setTextBold((value) => !value)} className={`text-[16px] ${textBold ? "font-bold text-[#46c0f0]" : "font-semibold"}`}>
                        B
                      </button>
                      <button type="button" onClick={() => setTextItalic((value) => !value)} className={`text-[16px] ${textItalic ? "text-[#46c0f0]" : "text-[#6b7280]"}`}>
                        <span className="italic">I</span>
                      </button>
                      <button type="button" onClick={() => { setTextUnderline((value) => !value); setTextStrike(false); }} className={`text-[16px] underline ${textUnderline ? "text-[#46c0f0]" : "text-[#6b7280]"}`}>
                        U
                      </button>
                      <button type="button" onClick={() => { setTextStrike((value) => !value); setTextUnderline(false); }} className={`text-[16px] line-through ${textStrike ? "text-[#46c0f0]" : "text-[#6b7280]"}`}>
                        S
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[13px] text-[#6b7280]">Alignment</div>
                    <div className="flex items-center gap-3">
                      <AlignmentButton active={textAlign === "left"} onClick={() => setTextAlign("left")}>
                        <AlignLeft size={15} />
                      </AlignmentButton>
                      <AlignmentButton active={textAlign === "center"} onClick={() => setTextAlign("center")}>
                        <AlignCenter size={15} />
                      </AlignmentButton>
                      <AlignmentButton active={textAlign === "justify"} onClick={() => setTextAlign("justify")}>
                        <AlignJustify size={15} />
                      </AlignmentButton>
                      <AlignmentButton active={textAlign === "right"} onClick={() => setTextAlign("right")}>
                        <AlignRight size={15} />
                      </AlignmentButton>
                    </div>
                  </div>

                  <SliderRow label="Line Height" value={lineHeight} min={60} max={220} onChange={setLineHeight} />
                  <SliderRow label="Letter Spacing" value={letterSpacing} min={0} max={40} onChange={setLetterSpacing} />
                </div>
              </div>
            ) : null}

            {mode === "freehand" ? (
              <div className="flex h-full justify-center">
                <div className="w-full space-y-2">
                  <FreehandRailItem icon="color-pop" title="Color Pop:" value={colorPopPreview ? "On" : "Off"} onClick={() => setColorPopPreview((v) => !v)} />
                  <div className={railDividerClass} />
                  <FreehandRailItem icon="joints" title="Joints:" value={jointMode === "straight" ? "Straight" : "Curved"} onClick={() => setJointMode((v) => v === "straight" ? "curved" : "straight")} />
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative flex min-w-0 flex-col overflow-hidden bg-white">
            <div className="min-h-0 flex-1 overflow-auto px-8 py-8" style={dotGridStyle}>
              {mode === "shape" ? (
                <ShapePreview
                  imageSrc={selectedImage.src}
                  maskShape={draftMaskShape}
                  invert={invertPreview}
                  colorPop={colorPopPreview}
                  position={maskPosition}
                  scalePercent={maskScale}
                  onPositionChange={setMaskPosition}
                />
              ) : null}
              {mode === "text" ? (
                <TextPreview
                  imageSrc={selectedImage.src}
                  text={textValue || "add your text"}
                  fontFamily={textFontFamily}
                  fontSize={textSize}
                  lineHeight={lineHeight}
                  letterSpacing={letterSpacing}
                  fontWeight={textBold ? "700" : "400"}
                  italic={textItalic}
                  decoration={textStrike ? "line-through" : textUnderline ? "underline" : "none"}
                  textAlign={textAlign}
                  onTextChange={setTextValue}
                />
              ) : null}
              {mode === "freehand" ? (
                <FreehandPreview
                  imageSrc={selectedImage.src}
                  points={freehandPoints}
                  jointMode={jointMode}
                  colorPop={colorPopPreview}
                  invert={invertPreview}
                  onPointsChange={setFreehandPoints}
                />
              ) : null}
            </div>

            <div className="border-t border-[#e3e8ee] px-7 py-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <TabButton label="Freehand" active={mode === "freehand"} onClick={() => setMode("freehand")} />
                  <TabButton label="Shape" active={mode === "shape"} onClick={() => setMode("shape")} />
                  <TabButton label="Text" active={mode === "text"} onClick={() => setMode("text")} />
                </div>
                <div className="flex items-center gap-3">
                  <FooterActionButton label="Remove mask" tone="danger" onClick={() => { onApply({ maskMode: "shape", maskShape: "none" }); onOpenChange(false); }} />
                  <FooterActionButton label="Mask" tone="primary" onClick={handleApply} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
