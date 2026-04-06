import React from "react";
import {
  CalendarDays,
  CircleDot,
  Eraser,
  ImagePlus,
  Mic,
  Minus,
  PaintBucket,
  Plus,
  ScanLine,
  SquareMenu,
  Table2,
  Type,
  Upload,
  Video,
  Wand2,
} from "lucide-react";
import type {
  CanvasBackgroundValue,
  CanvasElement,
  DrawSettings,
  DrawToolKind,
} from "./EditorShell";

type DispatchDetail = {
  tool: string;
  action: string;
  payload?: Record<string, unknown>;
};

const dispatchEditorAction = (detail: DispatchDetail) => {
  window.dispatchEvent(new CustomEvent("editor:tool-action", { detail }));
};

const getImageBackgroundValue = (background: CanvasBackgroundValue) => {
  if (typeof background === "string") return null;
  if (background.type !== "image" || typeof background.src !== "string") return null;

  return {
    ...background,
    fit: background.fit ?? "cover",
    opacity: typeof background.opacity === "number" ? background.opacity : 1,
  };
};

const CardOption: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick?: () => void;
}> = ({ icon, title, subtitle, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-4 rounded-2xl px-3 py-3 text-left transition hover:bg-[#f3efff]"
  >
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f3efff] text-[#7650e3]">
      {icon}
    </div>
    <div>
      <div className="text-[15px] font-semibold text-[#4A5568]">{title}</div>
      <div className="text-[13px] leading-snug text-[#718096]">{subtitle}</div>
    </div>
  </button>
);

const DrawToolButton: React.FC<{
  active?: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}> = ({ active, icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex h-11 items-center justify-center rounded-xl border w-full text-[12px] font-medium transition ${
      active
        ? "border-[#90cdf4] bg-[#ebf8ff] text-[#7650e3]"
        : "border-[#E2E8F0] bg-white text-[#4A5568] hover:bg-[#f8fbfd]"
    }`}
  >
    <span className={label ? "mr-1.5" : ""}>{icon}</span>
    {label || null}
  </button>
);

const DrawBrushPreview: React.FC<{
  active?: boolean;
  label: string;
  preview: React.ReactNode;
  onClick: () => void;
}> = ({ active, label, preview, onClick }) => (
  <button type="button" onClick={onClick} className="flex flex-col items-center gap-1.5 w-full text-center">
    <div
      className={`flex h-[42px] w-full items-center justify-center rounded-md border transition ${
        active
          ? "border-[#f3efff] bg-white shadow-[inset_0_0_0_1px_rgba(83,184,234,0.18)]"
          : "border-[#D9E2EC] bg-white hover:bg-[#f3efff]"
      }`}
    >
      {preview}
    </div>
    <span className={`text-[12px] ${active ? "font-semibold text-[#7650e3]" : "font-medium text-[#7a7f91]"}`}>{label}</span>
  </button>
);

export const BackgroundFlyout: React.FC<{
  onBackgroundChange: (bg: CanvasBackgroundValue) => void;
  onAddElement: (el: Omit<CanvasElement, "id">) => void;
  canvasBackground: CanvasBackgroundValue;
}> = ({ onBackgroundChange, canvasBackground }) => {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [backgroundUploads, setBackgroundUploads] = React.useState<Array<{ src: string }>>([]);
  const imageBackground = React.useMemo(
    () => getImageBackgroundValue(canvasBackground),
    [canvasBackground],
  );

  const handleBackgroundFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;

        setBackgroundUploads((prev) =>
          prev.some((upload) => upload.src === dataUrl) ? prev : [{ src: dataUrl }, ...prev],
        );

        onBackgroundChange({
          type: "image",
          src: dataUrl,
          fit: imageBackground?.fit ?? "cover",
          opacity: imageBackground?.opacity ?? 1,
        });

        dispatchEditorAction({
          tool: "background",
          action: imageBackground ? "replace" : "upload",
          payload: { background: dataUrl },
        });
      };

      reader.readAsDataURL(file);
    });

    e.currentTarget.value = "";
  };

  const updateImageBackground = (
    updates: Partial<{ fit: "cover" | "contain" | "stretch"; opacity: number }>,
  ) => {
    if (!imageBackground) return;

    onBackgroundChange({
      ...imageBackground,
      ...updates,
    });
  };

  const addBackgroundFromUpload = (src: string) => {
    onBackgroundChange({
      type: "image",
      src,
      fit: imageBackground?.fit ?? "cover",
      opacity: imageBackground?.opacity ?? 1,
    });

    dispatchEditorAction({
      tool: "background",
      action: "upload-select",
      payload: { background: src },
    });
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleBackgroundFileChange}
        multiple
      />

      <div
        onClick={() => fileRef.current?.click()}
        className="cursor-pointer flex w-full items-center gap-4 rounded-2xl px-3 py-3 text-left transition hover:bg-[#f3efff]"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f3efff] text-[#7650e3]">
          <Upload size={20} />
        </div>
        <div>
          <div className="text-[15px] font-semibold text-[#4A5568]">
            {imageBackground ? "Replace Background" : "Upload Background"}
          </div>
          <div className="text-[13px] leading-snug text-[#718096]">
            {imageBackground ? "Choose another image background" : "Upload image as background"}
          </div>
        </div>
      </div>

      {imageBackground ? (
        <div className="space-y-4 rounded-2xl border border-[#e3e7ed] bg-white p-4">
          <div className="overflow-hidden rounded-xl border border-[#e3e7ed] bg-[#f8fafc]">
            <div className="aspect-[4/3] w-full">
              <img src={imageBackground.src} alt="Current background" className="h-full w-full object-cover" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8b84b3]">Fit</div>
            <div className="grid grid-cols-3 gap-2">
              {(["cover", "contain", "stretch"] as const).map((fitMode) => (
                <button
                  key={fitMode}
                  type="button"
                  onClick={() => updateImageBackground({ fit: fitMode })}
                  className={`rounded-xl border px-3 py-2 text-[12px] font-medium capitalize transition ${
                    imageBackground.fit === fitMode
                      ? "border-[#c8b7ff] bg-[#f3efff] text-[#7650e3]"
                      : "border-[#e3e7ed] bg-white text-[#4A5568] hover:bg-[#f8fbfd]"
                  }`}
                >
                  {fitMode}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8b84b3]">Opacity</div>
              <div className="text-[12px] font-medium text-[#4A5568]">
                {Math.round((imageBackground.opacity ?? 1) * 100)}%
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round((imageBackground.opacity ?? 1) * 100)}
              onChange={(event) =>
                updateImageBackground({ opacity: Number(event.target.value) / 100 })
              }
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#ece7ff] accent-[#7650e3]"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              onBackgroundChange("#FFFFFF");
              dispatchEditorAction({ tool: "background", action: "remove-image" });
            }}
            className="w-full rounded-xl border border-[#f1d2d2] px-3 py-2 text-[12px] font-semibold text-[#c24141] transition hover:bg-[#fff5f5]"
          >
            Remove image background
          </button>
        </div>
      ) : null}

      {backgroundUploads.length > 0 && (
        <div className="border-t border-[#e3e7ed] pt-4">
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8b84b3] mb-3">
            Your Uploads
          </div>
          <div className="grid grid-cols-2 gap-3">
            {backgroundUploads.map((upload, i) => (
              <button
                key={i}
                className="aspect-[4/3] overflow-hidden rounded-xl border border-[#e3e7ed] bg-white transition hover:border-[#b9c6dd]"
                onClick={() => addBackgroundFromUpload(upload.src)}
              >
                <img src={upload.src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-[#e3e7ed] pt-4 space-y-1">
        <CardOption
          icon={<CircleDot size={20} />}
          title="Gradient"
          subtitle="Create a gradient background"
          onClick={() => {
            const background = "linear-gradient(135deg, #a7d8ff 0%, #3182CE 100%)";
            onBackgroundChange(background);
            dispatchEditorAction({ tool: "background", action: "gradient", payload: { background } });
          }}
        />
        <CardOption
          icon={<ScanLine size={20} />}
          title="Transparent"
          subtitle="Add a transparent background"
          onClick={() => {
            onBackgroundChange("transparent");
            dispatchEditorAction({ tool: "background", action: "transparent" });
          }}
        />
      </div>
    </div>
  );
};

export const LayoutFlyout: React.FC<{
  onAddElement: (el: Omit<CanvasElement, "id">) => void;
}> = ({ onAddElement }) => (
  <div className="space-y-1">
    <CardOption
      icon={<CalendarDays size={20} />}
      title="Schedule"
      subtitle="Create an event schedule"
      onClick={() => {
        onAddElement({ type: "table", x: 120, y: 140, width: 520, height: 300, rows: 5, cols: 2, tableData: [["Time", "Event"], ["9:00", "Opening"], ["10:00", "Keynote"], ["12:00", "Lunch"], ["15:00", "Closing"]], borderWidth: 1, borderColor: "#CBD5E0", backgroundColor: "#ffffff", color: "#2D3748", fontSize: 14 });
        dispatchEditorAction({ tool: "layout", action: "schedule" });
      }}
    />
    <CardOption
      icon={<SquareMenu size={20} />}
      title="Menu"
      subtitle="Create your own menu"
      onClick={() => {
        onAddElement({ type: "text", x: 140, y: 120, width: 420, height: 260, content: "Menu\nStarter\nMain Course\nDessert", fontSize: 32, fontFamily: "'Georgia', serif", fontWeight: "700", color: "#2D3748", lineHeight: 1.5 });
        dispatchEditorAction({ tool: "layout", action: "menu" });
      }}
    />
    <CardOption
      icon={<Table2 size={20} />}
      title="Table"
      subtitle="Add a table"
      onClick={() => {
        onAddElement({ type: "table", x: 120, y: 140, width: 420, height: 220, rows: 3, cols: 3, tableData: [["A", "B", "C"], ["1", "2", "3"], ["4", "5", "6"]], borderWidth: 1, borderColor: "#CBD5E0", backgroundColor: "#ffffff", color: "#2D3748", fontSize: 14 });
        dispatchEditorAction({ tool: "layout", action: "table" });
      }}
    />
    <CardOption
      icon={<Wand2 size={20} />}
      title="Tear-Off Tabs"
      subtitle="Add a tabs section"
      onClick={() => {
        onAddElement({ type: "text", x: 100, y: 140, width: 620, height: 120, content: "Tab 1   Tab 2   Tab 3   Tab 4", fontSize: 28, fontFamily: "'Inter', sans-serif", fontWeight: "600", color: "#2D3748", backgroundColor: "#ffffff", letterSpacing: 1 });
        dispatchEditorAction({ tool: "layout", action: "tear-off-tabs" });
      }}
    />
  </div>
);

export const RecordFlyout: React.FC = () => (
  <div className="space-y-1">
    <CardOption icon={<CircleDot size={20} />} title="Photo" subtitle="Capture a photo with your webcam" onClick={() => dispatchEditorAction({ tool: "record", action: "photo" })} />
    <CardOption icon={<Video size={20} />} title="Video" subtitle="Record a video with your webcam" onClick={() => dispatchEditorAction({ tool: "record", action: "video" })} />
    <CardOption icon={<Mic size={20} />} title="Audio" subtitle="Record an audio or voice over" onClick={() => dispatchEditorAction({ tool: "record", action: "audio" })} />
  </div>
);

export const SlideshowFlyout: React.FC<{
  onAddElement: (el: Omit<CanvasElement, "id">) => void;
}> = ({ onAddElement }) => (
  <div className="space-y-1">
    <CardOption
      icon={<Type size={20} />}
      title="Text slideshow"
      subtitle="Add multiple text items in a slideshow"
      onClick={() => {
        onAddElement({ type: "text", x: 120, y: 120, width: 480, height: 120, content: "Slide 1\nSlide 2\nSlide 3", fontSize: 34, fontFamily: "'Inter', sans-serif", fontWeight: "700", color: "#2D3748", lineHeight: 1.4 });
        dispatchEditorAction({ tool: "slideshow", action: "text-slideshow" });
      }}
    />
    <CardOption icon={<Upload size={20} />} title="My Uploads" subtitle="Add media from your uploads" onClick={() => dispatchEditorAction({ tool: "slideshow", action: "uploads" })} />
    <CardOption icon={<ImagePlus size={20} />} title="Explore media" subtitle="Add a stock media slide" onClick={() => dispatchEditorAction({ tool: "slideshow", action: "explore-media" })} />
  </div>
);

export const DrawFlyout: React.FC<{
  onAddElement: (el: Omit<CanvasElement, "id">) => void;
  settings?: DrawSettings;
  onSettingsChange?: (updates: Partial<DrawSettings>) => void;
  onFinishDrawing?: () => void;
}> = ({ onAddElement, settings, onSettingsChange, onFinishDrawing }) => {
  const [localSettings, setLocalSettings] = React.useState<DrawSettings>({
    tool: "pencil",
    color: "#000000",
    brushSize: 10,
  });
  const activeSettings = settings ?? localSettings;
  const tool = activeSettings.tool;
  const color = activeSettings.color;
  const brushSize = activeSettings.brushSize;

  const updateSettings = React.useCallback(
    (updates: Partial<DrawSettings>) => {
      if (onSettingsChange) {
        onSettingsChange(updates);
        return;
      }

      setLocalSettings((prev) => ({ ...prev, ...updates }));
    },
    [onSettingsChange],
  );

  const selectTool = (nextTool: DrawToolKind) => updateSettings({ tool: nextTool });

  const finishDrawing = () => {
    if (onFinishDrawing) {
      onFinishDrawing();
      return;
    }

    if (tool === "eraser") {
      dispatchEditorAction({ tool: "draw", action: "finish", payload: { tool, color, brushSize } });
      return;
    }

    if (tool === "circle") {
      onAddElement({ type: "shape", x: 180, y: 180, width: brushSize * 14, height: brushSize * 14, shapeType: "circle", backgroundColor: color, opacity: 100 });
    } else {
      onAddElement({ type: "shape", x: 180, y: 220, width: Math.max(180, brushSize * 18), height: Math.max(4, brushSize), shapeType: "line", backgroundColor: color, borderWidth: brushSize, opacity: 100 });
    }

    dispatchEditorAction({ tool: "draw", action: "finish", payload: { tool, color, brushSize } });
  };

  return (
    <div className="flex max-h-[85vh] flex-col overflow-hidden bg-[#fbfbfc]">
      <div className="border-b border-[#DDE3EA] px-5 py-4 text-center text-[22px] font-semibold tracking-[-0.02em] text-[#7650e3]">
        Draw
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 w-full">
        <div className="space-y-6 w-full">
          <div className="space-y-2 w-full">
            <DrawToolButton active={tool === "eraser"} icon={<Eraser size={16} />} label="" onClick={() => selectTool("eraser")} />
            <div className="text-center text-[13px] font-medium text-[#7c8496]">Eraser</div>
          </div>

          <div className="grid grid-cols-3 gap-3 px-0.5">
            <div className="w-full">
              <DrawBrushPreview
                active={tool === "pencil"}
                label="Pencil"
                onClick={() => selectTool("pencil")}
                preview={
                  <svg width="52" height="22" viewBox="0 0 52 22" fill="none" aria-hidden="true" style={{ color }}>
                    <path d="M10 16C15 10 22 7 37 7" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
                  </svg>
                }
              />
            </div>
            <DrawBrushPreview
              active={tool === "circle"}
              label="Circle"
              onClick={() => selectTool("circle")}
              preview={
                <svg width="52" height="22" viewBox="0 0 52 22" fill="none" aria-hidden="true" style={{ color }}>
                  <circle cx="26" cy="11" r="6.5" stroke="currentColor" strokeWidth="2.4" />
                </svg>
              }
            />
            <DrawBrushPreview
              active={tool === "spray"}
              label="Spray"
              onClick={() => selectTool("spray")}
              preview={
                <svg width="52" height="22" viewBox="0 0 52 22" fill="none" aria-hidden="true" style={{ color }}>
                  {[
                    [12, 13, 0.16],
                    [15, 11, 0.22],
                    [18, 9, 0.2],
                    [21, 12, 0.26],
                    [24, 10, 0.18],
                    [27, 8, 0.24],
                    [30, 11, 0.3],
                    [33, 9, 0.22],
                    [36, 12, 0.18],
                    [39, 10, 0.14],
                  ].map(([cx, cy, opacity], index) => (
                    <circle key={index} cx={cx} cy={cy} r="2" fill="currentColor" fillOpacity={opacity} />
                  ))}
                </svg>
              }
            />
          </div>

          <div className="border-t border-[#E1E7EE]" />

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[13px] font-medium text-[#6f7688]">Color</span>
              <label className="flex h-10 w-12 cursor-pointer items-center justify-center rounded-[4px] border border-[#D0D7E2] bg-white p-1 shadow-sm">
                <input
                  type="color"
                  value={color}
                  onChange={(event) => updateSettings({ color: event.target.value })}
                  className="h-8 w-10 cursor-pointer border-0 bg-transparent p-0"
                />
              </label>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[13px] font-medium text-[#6f7688]">Brush Size</span>
                <div className="flex items-center overflow-hidden rounded-[4px] border border-[#D0D7E2] bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => updateSettings({ brushSize: Math.max(1, brushSize - 1) })}
                    className="flex h-9 w-9 items-center justify-center text-[#6b7280] transition hover:bg-[#f7fafc]"
                  >
                    <Minus size={14} />
                  </button>
                  <div className="flex h-9 min-w-[44px] items-center justify-center border-x border-[#D0D7E2] px-3 text-[13px] font-medium text-[#4A5568]">
                    {brushSize}
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSettings({ brushSize: Math.min(60, brushSize + 1) })}
                    className="flex h-9 w-9 items-center justify-center text-[#6b7280] transition hover:bg-[#f7fafc]"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <input
                type="range"
                min={1}
                max={60}
                step={1}
                value={brushSize}
                onChange={(event) => updateSettings({ brushSize: Number(event.target.value) })}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#f3efff] accent-[#7650e3]"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-[#E1E6ED] bg-white px-5 py-4">
        <button
          type="button"
          onClick={finishDrawing}
          className="h-11 w-full rounded-[8px] bg-[#7650e3] text-sm font-semibold text-white shadow-sm transition "
        >
          Finish drawing
        </button>
      </div>
    </div>
  );
};