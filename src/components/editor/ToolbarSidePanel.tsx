import React, { useRef, useState } from "react";
import {
  Search,
  Plus,
  Square,
  Circle,
  Triangle,
  Minus,
  Star,
  Hexagon,
  Heart,
  Pen,
  Type,
  Bold,
  Italic,
  Underline,
  Image as ImageIcon,
  LayoutGrid,
  Sparkles,
  ScanLine,
  Clapperboard,
  Mic,
  UploadCloud,
  Shapes,
  Palette,
  Columns3,
  Table2,
  Captions,
  List,
} from "lucide-react";
import type { ToolType, CanvasElement, EditorMode, CanvasSizePreset, DrawSettings } from "./EditorShell";
import {
  BackgroundFlyout,
  DrawFlyout,
  LayoutFlyout,
  RecordFlyout,
  SlideshowFlyout,
} from "./GlobalSidebarFlyouts";

interface ToolbarSidePanelProps {
  activeTool: ToolType;
  onAddElement: (el: Omit<CanvasElement, "id">) => void;
  onBackgroundChange: (bg: string) => void;
  canvasBackground: string;
  mode: EditorMode;
  onCanvasSizeChange: (preset: CanvasSizePreset) => void;
  drawSettings?: DrawSettings;
  onUpdateDrawSettings?: (updates: Partial<DrawSettings>) => void;
  onFinishDrawing?: () => void;
}

export const ToolbarSidePanel: React.FC<ToolbarSidePanelProps> = ({
  activeTool,
  onAddElement,
  onBackgroundChange,
  canvasBackground,
  mode,
  onCanvasSizeChange,
  drawSettings,
  onUpdateDrawSettings,
  onFinishDrawing,
}) => {
  switch (activeTool) {
    case "templates":
      return <TemplatesPanel />;
    case "text":
      return <TextPanel onAddElement={onAddElement} />;
    case "media":
      return <MediaPanel onAddElement={onAddElement} mode={mode} />;
    case "uploads":
      return <UploadsPanel onAddElement={onAddElement} mode={mode} />;
    case "background":
      return <BackgroundFlyout onBackgroundChange={onBackgroundChange} onAddElement={onAddElement} />;
    case "ai":
      return <AIPanel onAddElement={onAddElement} />;
    case "draw":
      return (
        <DrawFlyout
          onAddElement={onAddElement}
          settings={drawSettings}
          onSettingsChange={onUpdateDrawSettings}
          onFinishDrawing={onFinishDrawing}
        />
      );
    case "layout":
      return <LayoutFlyout onAddElement={onAddElement} />;
    case "table":
      return <TablePanel onAddElement={onAddElement} />;
    case "record":
      return <RecordFlyout />;
    case "slideshow":
      return <SlideshowFlyout onAddElement={onAddElement} />;
    case "qrcode":
      return <QRCodePanel onAddElement={onAddElement} />;
    default:
      return (
        <div className="flex flex-col items-center justify-center h-40 text-[#6b7280]">
          <p className="text-sm">Coming soon</p>
        </div>
      );
  }
};

/* ---------- shared UI ---------- */

const panelText = {
  title: "text-[14px] font-semibold text-[#2b2150]",
  body: "text-[13px] text-[#6f7890]",
  small: "text-[11px] font-medium uppercase tracking-[0.08em] text-[#8b84b3]",
};

const SearchBar: React.FC<{
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
}> = ({ placeholder = "Search", value, onChange }) => (
  <div className="relative mb-4">
    <Search
      size={15}
      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8d88b5]"
    />
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className="h-[38px] w-full rounded-xl border border-[#d8d4f7] bg-[#faf8ff] pl-9 pr-3 text-[13px] text-[#2b2150] placeholder:text-[#8d88b5] outline-none transition focus:border-[#7650e3] focus:bg-white"
    />
  </div>
);

const SegmentedTabs: React.FC<{
  tabs: string[];
  active: string;
  onChange: (v: string) => void;
}> = ({ tabs, active, onChange }) => (
  <div className="mb-4 flex rounded-xl bg-[#f3efff] p-1">
    {tabs.map((tab) => {
      const isActive = tab === active;
      return (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`flex-1 rounded-lg px-3 py-2 text-[12px] font-medium capitalize transition ${
            isActive
              ? "bg-white text-[#7650e3] shadow-sm"
              : "text-[#6f7890] hover:text-[#2b2150]"
          }`}
        >
          {tab}
        </button>
      );
    })}
  </div>
);

const PanelCard: React.FC<React.PropsWithChildren<{ className?: string }>> = ({
  children,
  className = "",
}) => (
  <div >
    {children}
  </div>
);

const ToolListItem: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  active?: boolean;
  onClick?: () => void;
}> = ({ icon, title, subtitle, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left transition ${
      active ? "" : "hover:bg-[#faf8ff]"
    }`}
  >
    <div className="flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-xl bg-[#f3efff] text-[#7650e3]">
      {icon}
    </div>
    <div className="min-w-0">
      <div className="text-[14px] font-semibold text-[#2b2150]">{title}</div>
      <div className="text-[13px] leading-snug text-[#6f7890]">{subtitle}</div>
    </div>
  </button>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[#8b84b3]">
    {children}
  </p>
);

/* ---------- templates ---------- */

const TemplatesPanel: React.FC = () => {
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("all");
  const categories = ["all", "business", "event", "social", "sale", "food"];

  return (
    <div>
      <SearchBar placeholder="Search templates" value={search} onChange={setSearch} />

      <div className="mb-4 flex flex-wrap gap-2">
        {categories.map((cat) => {
          const isActive = activeCat === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-medium capitalize transition ${
                isActive
                  ? "bg-[#d9eef8] text-[#0d73aa]"
                  : "bg-[#f3f5f7] text-[#667085] hover:text-[#243b63]"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <button
            key={i}
            className="aspect-[3/4] overflow-hidden rounded-xl border border-[#e3e7ed] bg-gradient-to-br from-[#eef2f7] to-[#dde6ef] transition hover:shadow-sm"
          >
            <div className="flex h-full items-center justify-center text-[12px] font-medium text-[#667085]">
              Template {i + 1}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

/* ---------- text ---------- */

const TextPanel: React.FC<{ onAddElement: (el: Omit<CanvasElement, "id">) => void }> = ({
  onAddElement,
}) => {
  const addText = (preset: "plain" | "fancy" | "subtitle" | "slideshow" | "menu") => {
    const map = {
      plain: {
        content: "Plain Text",
        fontSize: 42,
        fontWeight: "500",
        fontFamily: "'Georgia', serif",
        width: 420,
        height: 60,
      },
      fancy: {
        content: "Fancy Text",
        fontSize: 46,
        fontWeight: "700",
        fontFamily: "'Georgia', serif",
        width: 440,
        height: 70,
      },
      subtitle: {
        content: "Subtitle text",
        fontSize: 22,
        fontWeight: "500",
        fontFamily: "'Inter', sans-serif",
        width: 340,
        height: 36,
      },
      slideshow: {
        content: "Slideshow text",
        fontSize: 26,
        fontWeight: "600",
        fontFamily: "'Inter', sans-serif",
        width: 360,
        height: 40,
      },
      menu: {
        content: "Menu",
        fontSize: 32,
        fontWeight: "700",
        fontFamily: "'Georgia', serif",
        width: 260,
        height: 44,
      },
    };

    const cfg = map[preset];

    onAddElement({
      type: "text",
      x: 120,
      y: 120 + Math.random() * 120,
      width: cfg.width,
      height: cfg.height,
      content: cfg.content,
      fontSize: cfg.fontSize,
      fontFamily: cfg.fontFamily,
      fontWeight: cfg.fontWeight,
      color: "#123a63",
      textAlign: "left",
      lineHeight: 1.15,
    });
  };

  return (
    <PanelCard className="overflow-hidden">
      <div className="space-y-1">
        <ToolListItem
          icon={<Type size={28} strokeWidth={1.6} />}
          title="Plain Text"
          subtitle="Add simple text"
          onClick={() => addText("plain")}
        />
        <ToolListItem
          icon={<Sparkles size={28} strokeWidth={1.6} />}
          title="Fancy Text"
          subtitle="Add creative font styles"
          active
          onClick={() => addText("fancy")}
        />
        <ToolListItem
          icon={<Captions size={28} strokeWidth={1.6} />}
          title="Subtitles"
          subtitle="Add subtitles to your design"
          onClick={() => addText("subtitle")}
        />
        <div className="mx-4 border-t border-[#e5e7eb]" />
        {/* <ToolListItem
          icon={<Clapperboard size={28} strokeWidth={1.6} />}
          title="Slideshow"
          subtitle="Add a text slideshow"
          onClick={() => addText("slideshow")}
        />
        <ToolListItem
          icon={<List size={28} strokeWidth={1.6} />}
          title="Menu"
          subtitle="Create your own menu"
          onClick={() => addText("menu")}
        /> */}
      </div>
    </PanelCard>
  );
};

/* ---------- media ---------- */

const MediaPanel: React.FC<{
  onAddElement: (el: Omit<CanvasElement, "id">) => void;
  mode: EditorMode;
}> = ({ onAddElement, mode }) => {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("photos");

  const stockImages = [
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&h=300&fit=crop",
  ];

  return (
    <div>
      <SearchBar
        placeholder={mode === "video" ? "Search photos & videos" : "Search photos & icons"}
        value={search}
        onChange={setSearch}
      />

      <SegmentedTabs
        tabs={["photos", "icons"]}
        active={tab}
        onChange={setTab}
      />

      {tab === "photos" ? (
        <div className="grid grid-cols-2 gap-3">
          {stockImages.map((src, i) => (
            <button
              key={i}
              className="aspect-[4/3] overflow-hidden rounded-xl border border-[#e3e7ed] bg-white transition hover:shadow-sm"
              onClick={() =>
                onAddElement({
                  type: "image",
                  x: 100,
                  y: 100,
                  width: 300,
                  height: 225,
                  src,
                })
              }
            >
              <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {[Square, Circle, Triangle, Star, Hexagon, Heart, Minus, Pen].map((Icon, i) => (
            <button
              key={i}
              className="flex aspect-square items-center justify-center rounded-xl border border-[#e3e7ed] bg-white text-[#51627c] transition hover:bg-[#f7fafc]"
              onClick={() =>
                onAddElement({
                  type: "shape",
                  x: 180,
                  y: 180,
                  width: 140,
                  height: 140,
                  shapeType:
                    i === 0 ? "rectangle" : i === 1 ? "circle" : i === 2 ? "triangle" : "rectangle",
                  backgroundColor: "#2f80ed",
                  borderWidth: 0,
                  opacity: 100,
                })
              }
            >
              <Icon size={22} strokeWidth={1.6} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ---------- uploads ---------- */

const UploadsPanel: React.FC<{
  onAddElement: (el: Omit<CanvasElement, "id">) => void;
  mode: EditorMode;
}> = ({ onAddElement, mode }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<Array<{ src: string; kind: "image" | "video" }>>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("video/")) {
        const objectUrl = URL.createObjectURL(file);
        setUploads((prev) => [{ src: objectUrl, kind: "video" }, ...prev]);

        const probeVideo = document.createElement("video");
        probeVideo.preload = "metadata";
        probeVideo.src = objectUrl;
        probeVideo.addEventListener(
          "loadedmetadata",
          () => {
            const maxW = 500;
            const ratio = (probeVideo.videoWidth || 16) / Math.max(1, probeVideo.videoHeight || 9);
            const w = Math.min(probeVideo.videoWidth || maxW, maxW);
            const h = w / ratio;
            onAddElement({ type: "video", x: 100, y: 100, width: w, height: h, src: objectUrl, duration: Math.round(probeVideo.duration || 0) });
          },
          { once: true },
        );
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setUploads((prev) => [{ src: dataUrl, kind: "image" }, ...prev]);

        const img = new window.Image();
        img.onload = () => {
          const maxW = 500;
          const ratio = img.width / img.height;
          const w = Math.min(img.width, maxW);
          const h = w / ratio;
          onAddElement({ type: "image", x: 100, y: 100, width: w, height: h, src: dataUrl });
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileChange}
        multiple
      />

      <button
        onClick={() => fileRef.current?.click()}
        className="flex h-[132px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#cfd8e3] bg-[#f8fbfd] text-[#607086] transition hover:border-[#9cc7df] hover:bg-white"
      >
        <UploadCloud size={30} strokeWidth={1.6} />
        <div className="mt-2 text-[14px] font-semibold text-[#243b63]">Upload files</div>
        <div className="text-[12px] text-[#7b8798]">or drag and drop</div>
      </button>

      {uploads.length > 0 && (
        <div>
          <SectionTitle>Your uploads</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            {uploads.map((upload, i) => (
              <button
                key={i}
                className="aspect-[4/3] overflow-hidden rounded-xl border border-[#e3e7ed] bg-white"
                onClick={() => {
                  if (upload.kind === "video") {
                    const probeVideo = document.createElement("video");
                    probeVideo.preload = "metadata";
                    probeVideo.src = upload.src;
                    probeVideo.addEventListener(
                      "loadedmetadata",
                      () => {
                        const maxW = 500;
                        const ratio = (probeVideo.videoWidth || 16) / Math.max(1, probeVideo.videoHeight || 9);
                        const w = Math.min(probeVideo.videoWidth || maxW, maxW);
                        const h = w / ratio;
                        onAddElement({ type: "video", x: 100, y: 100, width: w, height: h, src: upload.src, duration: Math.round(probeVideo.duration || 0) });
                      },
                      { once: true },
                    );
                    return;
                  }

                  const img = new window.Image();
                  img.onload = () => {
                    const maxW = 500;
                    const ratio = img.width / img.height;
                    const w = Math.min(img.width, maxW);
                    const h = w / ratio;
                    onAddElement({ type: "image", x: 100, y: 100, width: w, height: h, src: upload.src });
                  };
                  img.src = upload.src;
                }}
              >
                {upload.kind === "video" ? (
                  <video src={upload.src} className="h-full w-full object-cover" muted playsInline />
                ) : (
                  <img src={upload.src} alt="" className="h-full w-full object-cover" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------- background ---------- */

const BackgroundPanel: React.FC<{
  onBackgroundChange: (bg: string) => void;
  canvasBackground: string;
}> = ({ onBackgroundChange, canvasBackground }) => {
  const [customColor, setCustomColor] = useState(
    canvasBackground.startsWith("#") ? canvasBackground : "#ffffff"
  );
  const [tab, setTab] = useState("colors");

  const colors = [
    "#FFFFFF", "#F8F8F8", "#EDEDED", "#D9D9D9", "#BDBDBD", "#8D99AE",
    "#4F5D75", "#2D3142", "#000000", "#F94144", "#F3722C", "#F9C74F",
    "#90BE6D", "#43AA8B", "#4D96FF", "#577590", "#9B5DE5", "#F15BB5",
  ];

  const gradients = [
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)",
  ];

  return (
    <div>
      <SegmentedTabs tabs={["colors", "gradients", "patterns"]} active={tab} onChange={setTab} />

      {tab === "colors" && (
        <div className="space-y-4">
          <div className="grid grid-cols-6 gap-2">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => {
                  setCustomColor(color);
                  onBackgroundChange(color);
                }}
                className={`aspect-square rounded-lg border ${
                  canvasBackground === color
                    ? "border-[#0d73aa] ring-2 ring-[#d9eef8]"
                    : "border-[#e3e7ed]"
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <div className="rounded-2xl border border-[#e4e7ec] bg-white p-3">
            <label className="mb-2 block text-[12px] font-medium text-[#5b6577]">Custom color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={customColor}
                onChange={(e) => {
                  setCustomColor(e.target.value);
                  onBackgroundChange(e.target.value);
                }}
                className="h-10 w-12 rounded-lg border border-[#dfe3ea]"
              />
              <input
                type="text"
                value={customColor}
                onChange={(e) => {
                  setCustomColor(e.target.value);
                  if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onBackgroundChange(e.target.value);
                }}
                className="h-10 flex-1 rounded-xl border border-[#dfe3ea] bg-[#f8fafc] px-3 text-[13px] text-[#243b63] outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {tab === "gradients" && (
        <div className="grid grid-cols-2 gap-3">
          {gradients.map((gradient, i) => (
            <button
              key={i}
              onClick={() => onBackgroundChange(gradient)}
              className={`aspect-[4/3] rounded-xl border ${
                canvasBackground === gradient
                  ? "border-[#0d73aa] ring-2 ring-[#d9eef8]"
                  : "border-[#e3e7ed]"
              }`}
              style={{ background: gradient }}
            />
          ))}
        </div>
      )}

      {tab === "patterns" && (
        <PanelCard className="p-6 text-center">
          <div className="text-[13px] text-[#6b7280]">Pattern backgrounds coming soon</div>
        </PanelCard>
      )}
    </div>
  );
};

/* ---------- draw ---------- */

const DrawPanel: React.FC<{ onAddElement: (el: Omit<CanvasElement, "id">) => void }> = ({
  onAddElement,
}) => {
  const shapes = [
    { label: "Rectangle", icon: Square, shapeType: "rectangle" as const, w: 200, h: 150 },
    { label: "Circle", icon: Circle, shapeType: "circle" as const, w: 150, h: 150 },
    { label: "Triangle", icon: Triangle, shapeType: "triangle" as const, w: 180, h: 150 },
    { label: "Line", icon: Minus, shapeType: "line" as const, w: 300, h: 4 },
  ];

  const colors = ["#2f80ed", "#eb5757", "#f2c94c", "#27ae60", "#bb6bd9", "#111827"];

  return (
    <div className="space-y-5">
      <div>
        <SectionTitle>Basic Shapes</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {shapes.map((shape) => (
            <button
              key={shape.shapeType}
              onClick={() =>
                onAddElement({
                  type: "shape",
                  x: 180,
                  y: 180,
                  width: shape.w,
                  height: shape.h,
                  shapeType: shape.shapeType,
                  backgroundColor: "#2f80ed",
                  borderWidth: 0,
                  opacity: 100,
                })
              }
              className="rounded-xl border border-[#e3e7ed] bg-white p-4 transition hover:bg-[#f7fafc]"
            >
              <div className="flex flex-col items-center gap-2 text-[#51627c]">
                <shape.icon size={24} strokeWidth={1.6} />
                <span className="text-[12px] font-medium text-[#243b63]">{shape.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle>Quick Colors</SectionTitle>
        <div className="grid grid-cols-6 gap-2">
          {colors.map((color) => (
            <button
              key={color}
              onClick={() =>
                onAddElement({
                  type: "shape",
                  x: 180,
                  y: 180,
                  width: 180,
                  height: 120,
                  shapeType: "rectangle",
                  backgroundColor: color,
                  borderWidth: 0,
                  opacity: 100,
                })
              }
              className="aspect-square rounded-lg border border-[#e3e7ed]"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

/* ---------- layout ---------- */

const IMAGE_SIZES: CanvasSizePreset[] = [
  { label: "Instagram Post", width: 1080, height: 1080, description: "1080 × 1080" },
  { label: "Instagram Story", width: 1080, height: 1920, description: "1080 × 1920" },
  { label: "Instagram Portrait", width: 1080, height: 1350, description: "1080 × 1350" },
  { label: "Flyer (US Letter)", width: 2550, height: 3300, description: "8.5 × 11in" },
  { label: "Facebook Post", width: 1200, height: 630, description: "1200 × 630" },
  { label: "Twitter/X Post", width: 1200, height: 675, description: "1200 × 675" },
  { label: "YouTube Thumbnail", width: 1280, height: 720, description: "1280 × 720" },
];

const VIDEO_SIZES: CanvasSizePreset[] = [
  { label: "Instagram Reel", width: 1080, height: 1920, description: "9:16 vertical" },
  { label: "YouTube Video", width: 1920, height: 1080, description: "16:9 landscape" },
  { label: "TikTok Video", width: 1080, height: 1920, description: "9:16 vertical" },
  { label: "Square Video", width: 1080, height: 1080, description: "1:1 square" },
];

const LayoutPanel: React.FC<{
  mode: EditorMode;
  onCanvasSizeChange: (preset: CanvasSizePreset) => void;
}> = ({ mode, onCanvasSizeChange }) => {
  const [search, setSearch] = useState("");
  const sizes = mode === "video" ? VIDEO_SIZES : IMAGE_SIZES;
  const filtered = search
    ? sizes.filter((s) => s.label.toLowerCase().includes(search.toLowerCase()))
    : sizes;

  return (
    <div>
      <SearchBar placeholder="Search sizes" value={search} onChange={setSearch} />

      <PanelCard className="overflow-hidden">
        <div className="divide-y divide-[#edf1f5]">
          {filtered.map((item) => (
            <button
              key={item.label}
              onClick={() => onCanvasSizeChange(item)}
              className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-[#f7fafc]"
            >
              <span className="text-[13px] font-medium text-[#243b63]">{item.label}</span>
              <span className="text-[12px] text-[#7c8798]">{item.description}</span>
            </button>
          ))}
        </div>
      </PanelCard>
    </div>
  );
};

/* ---------- ai ---------- */

const AIPanel: React.FC<{ onAddElement: (el: Omit<CanvasElement, "id">) => void }> = ({
  onAddElement,
}) => {
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState("text");

  return (
    <div className="space-y-4">
      <PanelCard className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3efff] text-[#7650e3]">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="text-[14px] font-semibold text-[#243b63]">AI Design Assistant</div>
            <div className="text-[13px] text-[#6b7280]">
              Describe what you want to create and let AI help.
            </div>
          </div>
        </div>
      </PanelCard>

      <SegmentedTabs tabs={["text", "image"]} active={mode} onChange={setMode} />

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={
          mode === "text"
            ? "Describe the text content you need"
            : "Describe the image you want"
        }
        className="h-28 w-full resize-none rounded-2xl border border-[#dfe3ea] bg-[#f8fafc] p-3 text-[13px] text-[#243b63] outline-none placeholder:text-[#8b95a7] focus:border-[#b8d4e8] focus:bg-white"
      />

      <button
        onClick={() => {
          if (!prompt.trim()) return;
          if (mode === "text") {
            onAddElement({
              type: "text",
              x: 120,
              y: 200,
              width: 420,
              height: 60,
              content: prompt,
              fontSize: 24,
              fontFamily: "'Inter', sans-serif",
              fontWeight: "400",
              color: "#243b63",
              textAlign: "left",
            });
          }
          setPrompt("");
        }}
        className="h-11 w-full rounded-xl bg-[#7650e3] text-sm font-semibold text-white transition hover:bg-[#6945d2]"
      >
        Generate
      </button>
    </div>
  );
};

/* ---------- qrcode ---------- */

const QRCodePanel: React.FC<{ onAddElement: (el: Omit<CanvasElement, "id">) => void }> = ({
  onAddElement,
}) => {
  const [url, setUrl] = useState("https://example.com");
  const [fgColor, setFgColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");

  const generateQR = () => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
      url
    )}&color=${fgColor.replace("#", "")}&bgcolor=${bgColor.replace("#", "")}`;

    onAddElement({
      type: "image",
      x: 200,
      y: 200,
      width: 200,
      height: 200,
      src: qrUrl,
    });
  };

  return (
    <div className="space-y-4">
      <PanelCard className="p-4">
        <label className="mb-2 block text-[12px] font-medium text-[#5b6577]">URL or text</label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="h-10 w-full rounded-xl border border-[#dfe3ea] bg-[#f8fafc] px-3 text-[13px] text-[#243b63] outline-none"
        />
      </PanelCard>

      <div className="grid grid-cols-2 gap-3">
        <PanelCard className="p-3">
          <label className="mb-2 block text-[12px] font-medium text-[#5b6577]">Foreground</label>
          <input
            type="color"
            value={fgColor}
            onChange={(e) => setFgColor(e.target.value)}
            className="h-10 w-full rounded-lg border border-[#dfe3ea]"
          />
        </PanelCard>

        <PanelCard className="p-3">
          <label className="mb-2 block text-[12px] font-medium text-[#5b6577]">Background</label>
          <input
            type="color"
            value={bgColor}
            onChange={(e) => setBgColor(e.target.value)}
            className="h-10 w-full rounded-lg border border-[#dfe3ea]"
          />
        </PanelCard>
      </div>

      <button
        onClick={generateQR}
        className="h-11 w-full rounded-xl bg-[#0d73aa] text-sm font-semibold text-white transition hover:bg-[#0b6798]"
      >
        Add QR code
      </button>
    </div>
  );
};

/* ---------- record ---------- */

const RecordPanel: React.FC = () => (
  <div className="space-y-4">
    <PanelCard className="p-5">
      <div className="flex flex-col items-center text-center">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#feecee]">
          <div className="h-6 w-6 rounded-full bg-[#e5484d]" />
        </div>
        <div className="text-[14px] font-semibold text-[#2b2150]">Record yourself</div>
        <div className="mt-1 text-[13px] text-[#6b7890]">
          Record your camera or screen and add it to your design.
        </div>
      </div>
    </PanelCard>

    <button className="h-11 w-full rounded-xl bg-[#e5484d] text-sm font-semibold text-white transition hover:opacity-95">
      Start recording
    </button>
  </div>
);

/* ---------- slideshow ---------- */

const SlideshowPanel: React.FC = () => (
  <div className="space-y-4">
    <PanelCard className="p-4">
      <div className="text-[14px] font-semibold text-[#243b63]">Slideshow</div>
      <div className="mt-1 text-[13px] text-[#6b7280]">
        Create a slideshow by adding multiple slides with transitions and timing.
      </div>
    </PanelCard>

    <button className="h-11 w-full rounded-xl bg-[#0d73aa] text-sm font-semibold text-white transition hover:bg-[#0b6798]">
      Add slide
    </button>
  </div>
);

/* ---------- table ---------- */

const TablePanel: React.FC<{ onAddElement: (el: Omit<CanvasElement, "id">) => void }> = ({
  onAddElement,
}) => {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);

  const addTable = () => {
    const tableData = Array(rows)
      .fill(null)
      .map(() => Array(cols).fill(""));

    onAddElement({
      type: "table",
      x: 100,
      y: 100,
      width: 420,
      height: 220,
      rows,
      cols,
      tableData,
      fontSize: 14,
      color: "#000000",
      backgroundColor: "#ffffff",
      borderWidth: 1,
      borderColor: "#000000",
    });
  };

  return (
    <div className="space-y-4">
      <PanelCard className="p-4">
        <SectionTitle>Table size</SectionTitle>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[12px] text-[#6b7280]">Rows</label>
            <input
              type="number"
              min="1"
              max="10"
              value={rows}
              onChange={(e) => setRows(Number(e.target.value))}
              className="h-10 w-full rounded-xl border border-[#dfe3ea] bg-[#f8fafc] px-3 text-[13px] text-[#243b63] outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] text-[#6b7280]">Columns</label>
            <input
              type="number"
              min="1"
              max="10"
              value={cols}
              onChange={(e) => setCols(Number(e.target.value))}
              className="h-10 w-full rounded-xl border border-[#dfe3ea] bg-[#f8fafc] px-3 text-[13px] text-[#243b63] outline-none"
            />
          </div>
        </div>
      </PanelCard>

      <button
        onClick={addTable}   
        className="h-11 w-full rounded-xl bg-[#7650e3] text-sm font-semibold text-white transition hover:bg-[#0b6798]"
      >
        Add table
      </button>
    </div>
  );
};