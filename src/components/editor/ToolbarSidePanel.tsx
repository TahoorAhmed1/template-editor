import React, { useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Activity,
  Airplay,
  AlarmClock,
  ArrowLeft,
  Anchor,
  Aperture,
  Archive,
  Atom,
  Award,
  BadgeCheck,
  Bell,
  Bike,
  Bolt,
  BookOpen,
  Bookmark,
  Bot,
  Briefcase,
  Bug,
  CakeSlice,
  Camera,
  Candy,
  Car,
  Cherry,
  Check,
  Cloud,
  Clover,
  Compass,
  Cpu,
  Crown,
  Diamond,
  Feather,
  Flag,
  Flame,
  Flower2,
  Search,
  Plus,
  Square,
  Circle,
  Triangle,
  Gift,
  Globe,
  Hammer,
  Heart,
  Minus,
  KeyRound,
  Leaf,
  Lightbulb,
  Lock,
  Medal,
  MoonStar,
  Mountain,
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
  Pizza,
  Plane,
  Puzzle,
  Rocket,
  Shield,
  Star,
  Sun,
  Columns3,
  Table2,
  Telescope,
  ThumbsUp,
  TreePine,
  Trophy,
  Umbrella,
  Waves,
  X,
  Zap,
  Captions,
  List,
  type LucideIcon,
} from "lucide-react";
import type {
  ToolType,
  CanvasBackgroundValue,
  CanvasElement,
  EditorMode,
  CanvasSizePreset,
  DrawSettings,
  LayerEffectProps,
} from "./EditorShell";
import { API } from "@/services/api";
import {
  BackgroundFlyout,
  DrawFlyout,
  LayoutFlyout,
  RecordFlyout,
  SlideshowFlyout,
} from "./GlobalSidebarFlyouts";
import type { TemplateApplyPayload, TemplateRecord } from "./templateTypes";

interface ToolbarSidePanelProps {
  activeTool: ToolType;
  onAddElement: (el: Omit<CanvasElement, "id">) => void;
  onApplyTemplate: (template: TemplateApplyPayload) => void;
  onBackgroundChange: (bg: CanvasBackgroundValue) => void;
  canvasBackground: CanvasBackgroundValue;
  canvasSize: CanvasSizePreset;
  mode: EditorMode;
  onCanvasSizeChange: (preset: CanvasSizePreset) => void;
  drawSettings?: DrawSettings;
  onUpdateDrawSettings?: (updates: Partial<DrawSettings>) => void;
  onFinishDrawing?: () => void;
}

export const ToolbarSidePanel: React.FC<ToolbarSidePanelProps> = ({
  activeTool,
  onAddElement,
  onApplyTemplate,
  onBackgroundChange,
  canvasBackground,
  canvasSize,
  mode,
  onCanvasSizeChange,
  drawSettings,
  onUpdateDrawSettings,
  onFinishDrawing,
}) => {
  switch (activeTool) {
    case "templates":
      return (
        <TemplatesPanel
          canvasSize={canvasSize}
          onApplyTemplate={onApplyTemplate}
        />
      );
    case "text":
      return <TextPanel onAddElement={onAddElement} />;
    case "media":
      return <MediaPanel onAddElement={onAddElement} mode={mode} />;
    case "uploads":
      return <UploadsPanel onAddElement={onAddElement} mode={mode} />;
    case "background":
      return (
        <BackgroundFlyout
          onBackgroundChange={onBackgroundChange}
          onAddElement={onAddElement}
          canvasBackground={canvasBackground}
        />
      );
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
}) => <div>{children}</div>;

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

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[#8b84b3]">
    {children}
  </p>
);

type ShapeAsset = {
  label: string;
  icon: LucideIcon;
  color: string;
};

const SHAPE_ASSETS: ShapeAsset[] = [
  { label: "Activity", icon: Activity, color: "#2563eb" },
  { label: "Airplay", icon: Airplay, color: "#0f766e" },
  { label: "Alarm", icon: AlarmClock, color: "#9333ea" },
  { label: "Anchor", icon: Anchor, color: "#0f766e" },
  { label: "Aperture", icon: Aperture, color: "#dc2626" },
  { label: "Archive", icon: Archive, color: "#475569" },
  { label: "Atom", icon: Atom, color: "#7c3aed" },
  { label: "Award", icon: Award, color: "#ca8a04" },
  { label: "Badge", icon: BadgeCheck, color: "#059669" },
  { label: "Bell", icon: Bell, color: "#2563eb" },
  { label: "Bike", icon: Bike, color: "#ea580c" },
  { label: "Bolt", icon: Bolt, color: "#ca8a04" },
  { label: "Book", icon: BookOpen, color: "#1d4ed8" },
  { label: "Bookmark", icon: Bookmark, color: "#7c2d12" },
  { label: "Bot", icon: Bot, color: "#0f766e" },
  { label: "Briefcase", icon: Briefcase, color: "#334155" },
  { label: "Bug", icon: Bug, color: "#15803d" },
  { label: "Cake", icon: CakeSlice, color: "#db2777" },
  { label: "Camera", icon: Camera, color: "#0369a1" },
  { label: "Candy", icon: Candy, color: "#c026d3" },
  { label: "Car", icon: Car, color: "#0f766e" },
  { label: "Cherry", icon: Cherry, color: "#dc2626" },
  { label: "Cloud", icon: Cloud, color: "#0284c7" },
  { label: "Clover", icon: Clover, color: "#16a34a" },
  { label: "Compass", icon: Compass, color: "#7c3aed" },
  { label: "CPU", icon: Cpu, color: "#475569" },
  { label: "Crown", icon: Crown, color: "#ca8a04" },
  { label: "Diamond", icon: Diamond, color: "#0891b2" },
  { label: "Feather", icon: Feather, color: "#0284c7" },
  { label: "Flag", icon: Flag, color: "#dc2626" },
  { label: "Flame", icon: Flame, color: "#ea580c" },
  { label: "Flower", icon: Flower2, color: "#db2777" },
  { label: "Gift", icon: Gift, color: "#7c3aed" },
  { label: "Globe", icon: Globe, color: "#0369a1" },
  { label: "Hammer", icon: Hammer, color: "#92400e" },
  { label: "Heart", icon: Heart, color: "#e11d48" },
  { label: "Key", icon: KeyRound, color: "#ca8a04" },
  { label: "Leaf", icon: Leaf, color: "#16a34a" },
  { label: "Bulb", icon: Lightbulb, color: "#ca8a04" },
  { label: "Lock", icon: Lock, color: "#475569" },
  { label: "Medal", icon: Medal, color: "#ca8a04" },
  { label: "Moon", icon: MoonStar, color: "#4338ca" },
  { label: "Mountain", icon: Mountain, color: "#0f766e" },
  { label: "Palette", icon: Palette, color: "#7c3aed" },
  { label: "Pizza", icon: Pizza, color: "#ea580c" },
  { label: "Plane", icon: Plane, color: "#0284c7" },
  { label: "Puzzle", icon: Puzzle, color: "#9333ea" },
  { label: "Rocket", icon: Rocket, color: "#2563eb" },
  { label: "Shield", icon: Shield, color: "#0f766e" },
  { label: "Sparkles", icon: Sparkles, color: "#a21caf" },
  { label: "Star", icon: Star, color: "#ca8a04" },
  { label: "Sun", icon: Sun, color: "#d97706" },
  { label: "Telescope", icon: Telescope, color: "#1d4ed8" },
  { label: "Thumb", icon: ThumbsUp, color: "#2563eb" },
  { label: "Pine", icon: TreePine, color: "#15803d" },
  { label: "Trophy", icon: Trophy, color: "#ca8a04" },
  { label: "Umbrella", icon: Umbrella, color: "#7c3aed" },
  { label: "Waves", icon: Waves, color: "#0891b2" },
  { label: "Zap", icon: Zap, color: "#eab308" },
];

const createShapeAssetDataUrl = (icon: LucideIcon, color: string) => {
  const svg = renderToStaticMarkup(
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="256"
      height="256"
      viewBox="0 0 24 24"
      fill="none"
    >
      <rect width="24" height="24" fill="transparent" />
      {React.createElement(icon, {
        size: 24,
        color,
        strokeWidth: 1.8,
      })}
    </svg>
  );

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

type FancyTextFontOption = {
  id: string;
  label: string;
  fontFamily: string;
  fontWeight?: string;
};

type FancyTextStylePreset = {
  id: string;
  label: string;
  description: string;
  defaultFontId: string;
  palette: string[];
  fontSize: number;
  fontWeight: string;
  textTransform: "none" | "uppercase";
  letterSpacing: number;
  lineHeight: number;
  effect: Partial<LayerEffectProps>;
};

type FancyTextShapeOption = {
  value: NonNullable<CanvasElement["textShape"]>;
  label: string;
};

const createToolbarDefaultEffectProps = (): LayerEffectProps => ({
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
});

const FANCY_TEXT_FONTS: FancyTextFontOption[] = [
  { id: "bungee", label: "Bungee", fontFamily: "'Bungee', cursive", fontWeight: "400" },
  { id: "berkshire", label: "Berkshire Swash", fontFamily: "'Berkshire Swash', cursive", fontWeight: "400" },
  { id: "bevan", label: "Bevan", fontFamily: "'Bevan', serif", fontWeight: "400" },
  { id: "bowlby", label: "Bowlby One SC", fontFamily: "'Bowlby One SC', cursive", fontWeight: "400" },
  { id: "bree", label: "Bree Serif", fontFamily: "'Bree Serif', serif", fontWeight: "400" },
  { id: "righteous", label: "Righteous", fontFamily: "'Righteous', sans-serif", fontWeight: "400" },
  { id: "bebas", label: "Bebas Neue", fontFamily: "'Bebas Neue', sans-serif", fontWeight: "400" },
  { id: "monoton", label: "Monoton", fontFamily: "'Monoton', cursive", fontWeight: "400" },
];

const FANCY_TEXT_STYLES: FancyTextStylePreset[] = [
  {
    id: "retro",
    label: "Retro",
    description: "Bold headline with a poster feel",
    defaultFontId: "righteous",
    palette: ["#E33452", "#0E6177", "#F8F5EB"],
    fontSize: 76,
    fontWeight: "400",
    textTransform: "none",
    letterSpacing: -1,
    lineHeight: 1,
    effect: {
      preset: "drop-shadow",
      shadowColor: "#0E6177",
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 5,
      shadowOpacity: 0.25,
      strokeWidth: 1,
      strokeColor: "#F8F5EB",
    },
  },
  {
    id: "glow",
    label: "Glow",
    description: "Neon text with bright edge lighting",
    defaultFontId: "monoton",
    palette: ["#FF4AA2", "#52F1FF", "#FFF2A8"],
    fontSize: 68,
    fontWeight: "400",
    textTransform: "none",
    letterSpacing: 1.5,
    lineHeight: 1,
    effect: {
      preset: "neon-glow",
      glowColor: "#FF4AA2",
      glowIntensity: 22,
      strokeWidth: 1,
      strokeColor: "#ffffff",
    },
  },
  {
    id: "classified",
    label: "Classified",
    description: "Stamped editorial text with grit",
    defaultFontId: "bebas",
    palette: ["#D72626", "#6E1111", "#F6E9E9"],
    fontSize: 84,
    fontWeight: "400",
    textTransform: "uppercase",
    letterSpacing: 2.4,
    lineHeight: 1,
    effect: {
      preset: "drop-shadow",
      shadowColor: "#8B1E1E",
      shadowBlur: 4,
      shadowOffsetX: 2,
      shadowOffsetY: 3,
      shadowOpacity: 0.28,
      strokeWidth: 1,
      strokeColor: "#F6E9E9",
    },
  },
  {
    id: "baby",
    label: "Baby",
    description: "Soft script for playful captions",
    defaultFontId: "berkshire",
    palette: ["#67D5D0", "#F59BC7", "#FFF4E8"],
    fontSize: 70,
    fontWeight: "400",
    textTransform: "none",
    letterSpacing: 0,
    lineHeight: 1.02,
    effect: {
      preset: "drop-shadow",
      shadowColor: "#0f172a",
      shadowBlur: 7,
      shadowOffsetX: 0,
      shadowOffsetY: 4,
      shadowOpacity: 0.14,
    },
  },
  {
    id: "club",
    label: "Club",
    description: "High-energy uppercase for posters",
    defaultFontId: "bungee",
    palette: ["#7C3AED", "#38BDF8", "#F8FAFC"],
    fontSize: 72,
    fontWeight: "400",
    textTransform: "uppercase",
    letterSpacing: 1.4,
    lineHeight: 0.98,
    effect: {
      preset: "neon-glow",
      glowColor: "#7C3AED",
      glowIntensity: 18,
      strokeWidth: 1,
      strokeColor: "#F8FAFC",
    },
  },
  {
    id: "techno",
    label: "Techno",
    description: "Sharper edges with cool contrast",
    defaultFontId: "bowlby",
    palette: ["#0F766E", "#38BDF8", "#E6FFFB"],
    fontSize: 74,
    fontWeight: "400",
    textTransform: "uppercase",
    letterSpacing: 1.8,
    lineHeight: 1,
    effect: {
      preset: "drop-shadow",
      shadowColor: "#0A4F57",
      shadowBlur: 8,
      shadowOffsetX: 0,
      shadowOffsetY: 4,
      shadowOpacity: 0.22,
      strokeWidth: 2,
      strokeColor: "#E6FFFB",
    },
  },
];

const FANCY_TEXT_SHAPES: FancyTextShapeOption[] = [
  { value: "straight", label: "Straight" },
  { value: "curve-up", label: "Curve Up" },
  { value: "curve-down", label: "Curve Down" },
  { value: "wave", label: "Wave" },
  { value: "wedge-left", label: "Wedge Left" },
];

const normalizeFancyHexColor = (value: string, fallback: string) => {
  const trimmed = value.trim();
  const prefixed = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;

  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(prefixed)) {
    return fallback.toUpperCase();
  }

  if (prefixed.length === 4) {
    const red = prefixed[1];
    const green = prefixed[2];
    const blue = prefixed[3];
    return `#${red}${red}${green}${green}${blue}${blue}`.toUpperCase();
  }

  return prefixed.toUpperCase();
};

const buildFancyGradient = (colors: string[]) => {
  if (colors.length < 2) {
    return undefined;
  }

  const step = colors.length === 1 ? 100 : 100 / (colors.length - 1);
  const stops = colors.map((color, index) => `${color} ${Math.round(index * step)}%`);
  return `linear-gradient(90deg, ${stops.join(", ")})`;
};

const buildFancyTextPath = (shape: NonNullable<CanvasElement["textShape"]>, amount: number, width: number, height: number) => {
  const inset = Math.min(28, width * 0.06);
  const usableWidth = Math.max(width - inset * 2, 24);
  const baseY = height * 0.58;
  const amountRatio = Math.max(0, Math.min(1, amount / 100));
  const amplitude = Math.max(12, amountRatio * height * 0.28);
  const shouldUseCurveArc = shape === "curve-up" || shape === "curve-down";

  if (shouldUseCurveArc) {
    const radius = Math.max(24, Math.min(usableWidth / 2, height * 0.34));
    const centerX = inset + usableWidth / 2;
    const centerY = height / 2;
    const fullCircleThreshold = 0.9995;
    const isFullCircle = amountRatio >= fullCircleThreshold;

    if (isFullCircle) {
      const startY = shape === "curve-up" ? centerY + radius : centerY - radius;
      const verticalDelta = shape === "curve-up" ? -radius * 2 : radius * 2;
      return `M ${centerX} ${startY} a ${radius} ${radius} 0 1 1 0 ${verticalDelta} a ${radius} ${radius} 0 1 1 0 ${-verticalDelta}`;
    }

    const sweepDeg = 110 + amountRatio * 248;
    const centerAngleDeg = shape === "curve-up" ? -90 : 90;
    const startAngleDeg = centerAngleDeg - sweepDeg / 2;
    const endAngleDeg = centerAngleDeg + sweepDeg / 2;
    const startAngleRad = (startAngleDeg * Math.PI) / 180;
    const endAngleRad = (endAngleDeg * Math.PI) / 180;
    const startX = centerX + radius * Math.cos(startAngleRad);
    const startY = centerY + radius * Math.sin(startAngleRad);
    const endX = centerX + radius * Math.cos(endAngleRad);
    const endY = centerY + radius * Math.sin(endAngleRad);
    const largeArcFlag = sweepDeg > 180 ? 1 : 0;

    return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
  }

  switch (shape) {
    case "wave":
      return `M ${inset} ${baseY} C ${inset + usableWidth * 0.18} ${baseY - amplitude}, ${inset + usableWidth * 0.32} ${baseY - amplitude}, ${inset + usableWidth * 0.5} ${baseY} C ${inset + usableWidth * 0.68} ${baseY + amplitude}, ${inset + usableWidth * 0.82} ${baseY + amplitude}, ${width - inset} ${baseY}`;
    case "wedge-left":
      return `M ${inset} ${baseY - amplitude * 0.45} L ${width - inset} ${baseY + amplitude * 0.28}`;
    default:
      return `M ${inset} ${baseY} L ${width - inset} ${baseY}`;
  }
};

const getFancyShapeTextValue = (value: string) =>
  (value.trim() || "add your text").replace(/\r\n/g, "\n").split("\n").join(" ");

const getFancyShapePathLength = (
  shape: NonNullable<CanvasElement["textShape"]>,
  amount: number,
  width: number,
  height: number,
) => {
  const inset = Math.min(28, width * 0.06);
  const usableWidth = Math.max(width - inset * 2, 24);
  const amountRatio = Math.max(0, Math.min(1, amount / 100));
  const amplitude = Math.max(12, amountRatio * height * 0.28);
  const shouldUseCurveArc = shape === "curve-up" || shape === "curve-down";

  if (shouldUseCurveArc) {
    const radius = Math.max(24, Math.min(usableWidth / 2, height * 0.34));
    const fullCircleThreshold = 0.9995;
    const isFullCircle = amountRatio >= fullCircleThreshold;
    const sweepDeg = isFullCircle ? 360 : 110 + amountRatio * 248;
    const sweepRadians = (Math.min(sweepDeg, 360) * Math.PI) / 180;
    const arcLength = radius * sweepRadians;
    const circleBlend = Math.max(0, Math.min(1, (amountRatio - 0.85) / 0.15));
    const displayRatio = 0.94 - circleBlend * 0.22;
    return arcLength * displayRatio;
  }

  switch (shape) {
    case "wave":
      return usableWidth + amplitude * 1.45;
    case "wedge-left":
      return Math.hypot(usableWidth, amplitude * 0.73);
    default:
      return usableWidth;
  }
};

const getFittedFancyShapeFontSize = (
  text: string,
  baseFontSize: number,
  letterSpacing: number,
  availableLength: number,
) => {
  const safeText = text.trim();
  if (!safeText) {
    return baseFontSize;
  }

  const letters = safeText.replace(/\s/g, "").length;
  const spaces = safeText.length - letters;
  const gaps = Math.max(0, safeText.length - 1);
  const estimatedLength =
    letters * baseFontSize * 0.64 +
    spaces * baseFontSize * 0.28 +
    gaps * Math.max(letterSpacing, baseFontSize * 0.04);

  if (estimatedLength <= 0) {
    return baseFontSize;
  }

  const fitScale = Math.min(1, (availableLength * 0.94) / estimatedLength);
  return Math.max(22, baseFontSize * fitScale);
};

const buildFancyTextShadow = (effect: LayerEffectProps) => {
  const shadows: string[] = [];

  if (effect.preset === "neon-glow" || effect.preset === "pulse") {
    shadows.push(`0 0 ${Math.max(6, effect.glowIntensity * 0.55)}px ${effect.glowColor}`);
    shadows.push(`0 0 ${Math.max(10, effect.glowIntensity)}px ${effect.glowColor}`);
  }

  const hasShadow =
    effect.preset === "drop-shadow" ||
    effect.shadowBlur > 0 ||
    Math.abs(effect.shadowOffsetX) > 0 ||
    Math.abs(effect.shadowOffsetY) > 0 ||
    effect.shadowOpacity > 0;

  if (hasShadow) {
    const alpha = Math.max(0, Math.min(1, effect.shadowOpacity || 0));
    const color = effect.shadowColor;
    const red = Number.parseInt(color.slice(1, 3), 16);
    const green = Number.parseInt(color.slice(3, 5), 16);
    const blue = Number.parseInt(color.slice(5, 7), 16);
    shadows.push(
      `${effect.shadowOffsetX}px ${effect.shadowOffsetY}px ${effect.shadowBlur}px rgba(${red}, ${green}, ${blue}, ${alpha})`,
    );
  }

  return shadows.length > 0 ? shadows.join(", ") : undefined;
};

const getFancyFontById = (fontId: string) =>
  FANCY_TEXT_FONTS.find((font) => font.id === fontId) || FANCY_TEXT_FONTS[0];

const FancyTextComposer: React.FC<{
  onClose: () => void;
  onAddElement: (el: Omit<CanvasElement, "id">) => void;
}> = ({ onClose, onAddElement }) => {
  const [selectedStyleId, setSelectedStyleId] = useState(FANCY_TEXT_STYLES[0].id);
  const [selectedFontId, setSelectedFontId] = useState(FANCY_TEXT_STYLES[0].defaultFontId);
  const [draftText, setDraftText] = useState("add your text");
  const [customPalette, setCustomPalette] = useState(() => [...FANCY_TEXT_STYLES[0].palette]);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [draftColorValue, setDraftColorValue] = useState(FANCY_TEXT_STYLES[0].palette[0]);
  const [selectedTextShape, setSelectedTextShape] = useState<NonNullable<CanvasElement["textShape"]>>("straight");
  const [shapeAmount, setShapeAmount] = useState(64);

  const selectedStyle =
    FANCY_TEXT_STYLES.find((style) => style.id === selectedStyleId) || FANCY_TEXT_STYLES[0];
  const selectedFont = getFancyFontById(selectedFontId);
  const activeStopColor = customPalette[selectedColorIndex] || customPalette[0] || selectedStyle.palette[0];
  const gradientColors = React.useMemo(
    () => (customPalette.length > 0 ? [...customPalette] : [...selectedStyle.palette]),
    [customPalette, selectedStyle.palette],
  );
  const primaryGradientColor = gradientColors[0] || selectedStyle.palette[0];
  const gradientBackground = React.useMemo(
    () => buildFancyGradient(gradientColors),
    [gradientColors],
  );

  React.useEffect(() => {
    setSelectedFontId(selectedStyle.defaultFontId);
    setCustomPalette([...selectedStyle.palette]);
    setSelectedColorIndex(0);
    setDraftColorValue(selectedStyle.palette[0]);
  }, [selectedStyle]);

  React.useEffect(() => {
    setDraftColorValue(activeStopColor);
  }, [activeStopColor]);

  const updatePaletteColor = React.useCallback((index: number, nextColor: string) => {
    setCustomPalette((currentPalette) =>
      currentPalette.map((color, colorIndex) => (colorIndex === index ? nextColor : color)),
    );
  }, []);

  const commitDraftColorValue = React.useCallback(() => {
    const fallbackColor = customPalette[selectedColorIndex] || selectedStyle.palette[selectedColorIndex] || selectedStyle.palette[0];
    const normalizedColor = normalizeFancyHexColor(draftColorValue, fallbackColor);
    updatePaletteColor(selectedColorIndex, normalizedColor);
    setDraftColorValue(normalizedColor);
  }, [customPalette, draftColorValue, selectedColorIndex, selectedStyle.palette, updatePaletteColor]);

  const resetSelectedPaletteColor = React.useCallback(() => {
    const resetColor = selectedStyle.palette[selectedColorIndex] || selectedStyle.palette[0];
    updatePaletteColor(selectedColorIndex, resetColor);
    setDraftColorValue(resetColor);
  }, [selectedColorIndex, selectedStyle.palette, updatePaletteColor]);

  const mergedEffect = React.useMemo(() => {
    const defaults = createToolbarDefaultEffectProps();
    const nextEffect: LayerEffectProps = {
      ...defaults,
      ...selectedStyle.effect,
    };

    if (nextEffect.preset === "neon-glow") {
      nextEffect.glowColor = primaryGradientColor;
    }

    return nextEffect;
  }, [primaryGradientColor, selectedStyle]);

  const previewStyle: React.CSSProperties = {
    color: gradientBackground ? "transparent" : primaryGradientColor,
    fontFamily: selectedFont.fontFamily,
    fontWeight: selectedFont.fontWeight || selectedStyle.fontWeight,
    fontSize: `${Math.max(48, selectedStyle.fontSize * 0.74)}px`,
    textTransform: selectedStyle.textTransform,
    letterSpacing: `${selectedStyle.letterSpacing}px`,
    lineHeight: String(selectedStyle.lineHeight),
    textAlign: "center",
    textShadow: buildFancyTextShadow(mergedEffect),
    backgroundImage: gradientBackground,
    WebkitBackgroundClip: gradientBackground ? "text" : undefined,
    backgroundClip: gradientBackground ? "text" : undefined,
    WebkitTextFillColor: gradientBackground ? "transparent" : undefined,
    WebkitTextStroke:
      mergedEffect.strokeWidth > 0
        ? `${mergedEffect.strokeWidth}px ${mergedEffect.strokeColor}`
        : undefined,
  };

  const previewShapeTextValue = React.useMemo(
    () => getFancyShapeTextValue(draftText),
    [draftText],
  );
  const previewShapePathLength = React.useMemo(
    () => getFancyShapePathLength(selectedTextShape, shapeAmount, 420, 160),
    [selectedTextShape, shapeAmount],
  );
  const previewShapeFontSize = React.useMemo(
    () =>
      getFittedFancyShapeFontSize(
        previewShapeTextValue,
        Math.max(46, selectedStyle.fontSize * 0.72),
        selectedStyle.letterSpacing,
        previewShapePathLength,
      ),
    [previewShapePathLength, previewShapeTextValue, selectedStyle.fontSize, selectedStyle.letterSpacing],
  );

  const handleAddFancyText = () => {
    const usesCurvedShape = selectedTextShape !== "straight";

    onAddElement({
      type: "text",
      disableTextEditing: true,
      x: 120,
      y: 120 + Math.random() * 90,
      width: usesCurvedShape ? 620 : 540,
      height: usesCurvedShape
        ? Math.max(168, Math.round(selectedStyle.fontSize * 2))
        : Math.max(110, Math.round(selectedStyle.fontSize * 1.45)),
      content: draftText.trim() || "add your text",
      fontSize: selectedStyle.fontSize,
      fontFamily: selectedFont.fontFamily,
      fontWeight: selectedFont.fontWeight || selectedStyle.fontWeight,
      color: primaryGradientColor,
      textGradientColors: gradientColors,
      textGradientAngle: 90,
      textAlign: "center",
      textVerticalAlign: "middle",
      textTransform: selectedStyle.textTransform,
      textShape: selectedTextShape,
      textShapeAmount: shapeAmount,
      lineHeight: selectedStyle.lineHeight,
      letterSpacing: selectedStyle.letterSpacing,
      effectProps: mergedEffect,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(53,52,79,0.68)] p-4">
      <div className="flex h-[78vh] min-h-[560px] w-full max-w-[980px] flex-col overflow-hidden rounded-[10px] border border-[#d9dde8] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        <div className="flex items-center justify-between border-b border-[#d9dde8] px-8 py-5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-3 text-[15px] font-semibold text-[#3F4E6D] transition hover:text-[#1f2b46]"
          >
            <ArrowLeft size={20} strokeWidth={1.8} />
            Fancy Text
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#3F4E6D] transition hover:bg-[#F5F7FB]"
            aria-label="Close fancy text"
          >
            <X size={20} strokeWidth={1.8} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[235px_235px_minmax(0,1fr)]">
          <div className="min-h-0 border-r border-[#d9dde8]">
            <div className="px-8 py-4 text-[13px] font-semibold text-[#63708A]">Style</div>
            <div className="h-full overflow-y-auto px-6 pb-6 editor-scroll">
              <div className="space-y-2">
                {FANCY_TEXT_STYLES.map((style) => {
                  const styleFont = getFancyFontById(style.defaultFontId);
                  const isSelected = selectedStyleId === style.id;

                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setSelectedStyleId(style.id)}
                      className={`w-full rounded-[8px] border px-4 py-3 text-left transition ${
                        isSelected
                          ? "border-[#46B9F2] bg-white shadow-[inset_0_0_0_1px_rgba(70,185,242,0.14)]"
                          : "border-transparent bg-white hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <div
                        style={{
                          fontFamily: styleFont.fontFamily,
                          fontWeight: styleFont.fontWeight || style.fontWeight,
                          fontSize: "19px",
                          lineHeight: 1.1,
                          letterSpacing: `${Math.max(style.letterSpacing * 0.45, -0.5)}px`,
                          color: style.palette[0],
                          textTransform: style.textTransform,
                          textShadow: buildFancyTextShadow({
                            ...createToolbarDefaultEffectProps(),
                            ...style.effect,
                          }),
                          WebkitTextStroke:
                            (style.effect.strokeWidth ?? 0) > 0
                              ? `${style.effect.strokeWidth}px ${style.effect.strokeColor || "#ffffff"}`
                              : undefined,
                        }}
                      >
                        {style.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="min-h-0 border-r border-[#d9dde8]">
            <div className="px-8 py-4 text-[13px] font-semibold text-[#63708A]">Font</div>
            <div className="h-full overflow-y-auto px-6 pb-6 editor-scroll">
              <div className="space-y-2">
                {FANCY_TEXT_FONTS.map((font) => {
                  const isSelected = selectedFontId === font.id;

                  return (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => setSelectedFontId(font.id)}
                      className={`w-full rounded-[8px] border px-4 py-3 text-left transition ${
                        isSelected
                          ? "border-[#46B9F2] bg-white shadow-[inset_0_0_0_1px_rgba(70,185,242,0.14)]"
                          : "border-transparent bg-white hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <span
                        style={{
                          fontFamily: font.fontFamily,
                          fontWeight: font.fontWeight || selectedStyle.fontWeight,
                          fontSize: "20px",
                          color: "#4A4A4A",
                        }}
                      >
                        {font.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden">
            <div className="shrink-0 border-b border-[#E5E9F0] bg-[#FBFCFE] px-8 py-10">
              <div className="flex min-h-[110px] items-center justify-center overflow-hidden rounded-[4px] bg-white px-6 py-4">
                {selectedTextShape === "straight" ? (
                  <div style={previewStyle}>{draftText.trim() || "add your text"}</div>
                ) : (
                  <svg width="100%" height="160" viewBox="0 0 420 160" style={{ overflow: "hidden" }}>
                    {gradientBackground ? (
                      <defs>
                        <linearGradient id="fancy-preview-gradient" x1="0%" y1="50%" x2="100%" y2="50%">
                          {gradientColors.map((color, index, colors) => (
                            <stop
                              key={`${color}-${index}`}
                              offset={`${colors.length === 1 ? 0 : (index / (colors.length - 1)) * 100}%`}
                              stopColor={color}
                            />
                          ))}
                        </linearGradient>
                      </defs>
                    ) : null}
                    <path id="fancy-preview-path" d={buildFancyTextPath(selectedTextShape, shapeAmount, 420, 160)} fill="none" />
                    <text
                      fontSize={previewShapeFontSize}
                      fontFamily={selectedFont.fontFamily}
                      fontWeight={selectedFont.fontWeight || selectedStyle.fontWeight}
                      letterSpacing={selectedStyle.letterSpacing}
                      fill={gradientBackground ? "url(#fancy-preview-gradient)" : primaryGradientColor}
                      stroke={(mergedEffect.strokeWidth ?? 0) > 0 ? mergedEffect.strokeColor : undefined}
                      strokeWidth={mergedEffect.strokeWidth ?? 0}
                      paintOrder="stroke fill"
                      style={{ filter: mergedEffect.preset === "neon-glow" ? `drop-shadow(0 0 ${Math.max(8, mergedEffect.glowIntensity)}px ${mergedEffect.glowColor})` : undefined }}
                    >
                      <textPath
                        href="#fancy-preview-path"
                        startOffset="50%"
                        textAnchor="middle"
                        textLength={previewShapePathLength}
                        lengthAdjust="spacingAndGlyphs"
                      >
                        {previewShapeTextValue}
                      </textPath>
                    </text>
                  </svg>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6 editor-scroll">
              <div className="space-y-6 pb-2">
                <input
                  type="text"
                  value={draftText}
                  onChange={(event) => setDraftText(event.target.value)}
                  placeholder="add your text"
                  className="h-12 w-full rounded-[4px] border border-[#CCD3DF] bg-white px-4 text-[14px] text-[#3F4E6D] outline-none transition focus:border-[#46B9F2]"
                />

                <div className="flex items-center justify-between gap-4">
                  <span className="text-[14px] text-[#718096]">Gradient Colors</span>
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    {customPalette.map((color, index) => {
                      const isSelected = selectedColorIndex === index;

                      return (
                        <button
                          key={`${selectedStyle.id}-${index}`}
                          type="button"
                          onClick={() => setSelectedColorIndex(index)}
                          className={`flex h-11 w-11 items-center justify-center rounded-[4px] border transition ${
                            isSelected ? "border-[#46B9F2]" : "border-[#D9E2EC]"
                          }`}
                          style={{ backgroundColor: color }}
                          aria-label={`Select editable color ${index + 1}`}
                        >
                          {isSelected ? <Check size={16} className="text-white" strokeWidth={2.3} /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[8px] border border-[#E6ECF2] bg-[#FAFBFD] px-4 py-4">
                  <div
                    className="mb-4 h-3 w-full rounded-full border border-[#D9E2EC]"
                    style={{ backgroundImage: buildFancyGradient(gradientColors) || primaryGradientColor }}
                  />
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <span className="text-[13px] font-semibold text-[#53627C]">Edit gradient stop</span>
                    <span className="text-[12px] text-[#7B8798]">Stop {selectedColorIndex + 1}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <label
                      className="relative flex h-11 w-11 cursor-pointer overflow-hidden rounded-[8px] border border-[#CCD3DF] bg-white"
                      style={{ backgroundColor: activeStopColor }}
                      aria-label="Open color picker"
                    >
                      <input
                        type="color"
                        value={activeStopColor}
                        onChange={(event) => {
                          const nextColor = normalizeFancyHexColor(event.target.value, activeStopColor);
                          updatePaletteColor(selectedColorIndex, nextColor);
                          setDraftColorValue(nextColor);
                        }}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                    </label>
                    <input
                      type="text"
                      value={draftColorValue}
                      onChange={(event) => setDraftColorValue(event.target.value.toUpperCase())}
                      onBlur={commitDraftColorValue}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          commitDraftColorValue();
                        }
                      }}
                      className="h-11 min-w-[140px] flex-1 rounded-[6px] border border-[#CCD3DF] bg-white px-4 text-[14px] uppercase tracking-[0.04em] text-[#4A5568] outline-none transition focus:border-[#46B9F2]"
                      aria-label="Edit selected hex color"
                    />
                    <button
                      type="button"
                      onClick={resetSelectedPaletteColor}
                      className="inline-flex h-11 items-center justify-center rounded-[6px] border border-[#CCD3DF] bg-white px-4 text-[13px] font-medium text-[#53627C] transition hover:border-[#B9C4D4] hover:bg-[#F5F7FB]"
                    >
                      Reset stop
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-[14px] text-[#718096]">Text Shape</span>
                  <div className="relative w-[196px] max-w-full">
                    <select
                      value={selectedTextShape}
                      onChange={(event) => setSelectedTextShape(event.target.value as NonNullable<CanvasElement["textShape"]>)}
                      className="h-11 w-full appearance-none rounded-[6px] border border-[#CCD3DF] bg-white px-4 pr-10 text-[14px] text-[#4A5568] outline-none transition focus:border-[#46B9F2]"
                    >
                      {FANCY_TEXT_SHAPES.map((shape) => (
                        <option key={shape.value} value={shape.value}>
                          {shape.label}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#7C8798]">⌄</span>
                  </div>
                </div>

                {selectedTextShape !== "straight" ? (
                  <div className="rounded-[8px] border border-[#E6ECF2] bg-[#FAFBFD] px-4 py-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="text-[14px] text-[#718096]">Curve Amount</span>
                      <div className="flex h-10 items-center overflow-hidden rounded-[6px] border border-[#D7DCE3] bg-white">
                        <button
                          type="button"
                          onClick={() => setShapeAmount((value) => Math.max(0, value - 5))}
                          className="flex h-10 w-10 items-center justify-center text-[#6B7280] transition hover:bg-[#F5F7FB]"
                        >
                          -
                        </button>
                        <div className="flex h-10 min-w-[54px] items-center justify-center border-x border-[#D7DCE3] px-3 text-[13px] font-medium text-[#4A5568]">
                          {shapeAmount}
                        </div>
                        <button
                          type="button"
                          onClick={() => setShapeAmount((value) => Math.min(100, value + 5))}
                          className="flex h-10 w-10 items-center justify-center text-[#6B7280] transition hover:bg-[#F5F7FB]"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={shapeAmount}
                      onChange={(event) => setShapeAmount(Number(event.target.value))}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#D7DEE8] accent-[#49BAEA]"
                    />
                  </div>
                ) : null}

                <div className="rounded-[8px] border border-[#E6ECF2] bg-[#FAFBFD] px-4 py-4">
                  <div className="text-[13px] font-semibold text-[#53627C]">{selectedStyle.label}</div>
                  <div className="mt-1 text-[13px] text-[#7B8798]">{selectedStyle.description}</div>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex items-center justify-end border-t border-[#d9dde8] px-8 py-5">
              <button
                type="button"
                onClick={handleAddFancyText}
                className="inline-flex h-11 items-center justify-center rounded-[10px] bg-[#49BAEA] px-6 text-[16px] font-semibold text-white transition hover:bg-[#35a9db]"
              >
                Add fancy text
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------- templates ---------- */

const isTemplateRecord = (value: unknown): value is TemplateRecord => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<TemplateRecord>;
  return typeof candidate.id === "string" && typeof candidate.name === "string";
};

const getTemplateCategoryMatch = (
  template: TemplateRecord,
  category: string
) => {
  if (category === "all") {
    return true;
  }

  return template.name.toLowerCase().includes(category.toLowerCase());
};

const TemplatesPanel: React.FC<{
  canvasSize: CanvasSizePreset;
  onApplyTemplate: (template: TemplateApplyPayload) => void;
}> = ({ canvasSize, onApplyTemplate }) => {
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("all");
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const categories = ["all", "business", "event", "social", "sale", "food"];
  const dimension = `${canvasSize.width}x${canvasSize.height}`;

  React.useEffect(() => {
    let isMounted = true;

    const loadTemplates = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await API.listGlobalTemplates("");
        const payload = response?.data;
        const nextTemplates = (
          Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.data)
              ? payload.data
              : []
        ).filter(isTemplateRecord);

        if (isMounted) {
          setTemplates(nextTemplates);
        }
      } catch {
        if (isMounted) {
          setError("Unable to load templates.");
          setTemplates([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadTemplates();

    return () => {
      isMounted = false;
    };
  }, [dimension]);

  const filteredTemplates = React.useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return templates.filter((template) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        template.name.toLowerCase().includes(normalizedSearch);

      return matchesSearch && getTemplateCategoryMatch(template, activeCat);
    });
  }, [activeCat, search, templates]);

  return (
    <div>
      <SearchBar
        placeholder="Search templates"
        value={search}
        onChange={setSearch}
      />

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

      {error ? (
        <div className="rounded-xl border border-[#f1d2d2] bg-[#fff7f7] px-3 py-4 text-[12px] text-[#b54747]">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] animate-pulse overflow-hidden rounded-xl border border-[#e3e7ed] bg-[#f2f4f7]"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filteredTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() =>
                onApplyTemplate({
                  name: template.name,
                  dimension: template.dimension,
                  json: template.json,
                })
              }
              className="group aspect-[3/4] overflow-hidden rounded-xl border border-[#e3e7ed] bg-white text-left transition hover:border-[#cdd8e5] hover:shadow-sm"
            >
              <div className="flex h-full flex-col">
                <div className="relative flex-1 overflow-hidden bg-gradient-to-br from-[#eef2f7] to-[#dde6ef]">
                  {template.json.thumbnailDataUrl ? (
                    <img
                      src={template.json.thumbnailDataUrl}
                      alt={template.name}
                      className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-3 text-center text-[12px] font-medium text-[#667085]">
                      {template.name}
                    </div>
                  )}
                </div>
                <div className="border-t border-[#edf1f5] px-3 py-2.5">
                  <div className="truncate text-[12px] font-semibold text-[#243b63]">
                    {template.name}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#7b8798]">
                    {template.dimension || dimension}
                  </div>
                </div>
              </div>
            </button>
          ))}

          {!filteredTemplates.length && !error ? (
            <div className="col-span-2 rounded-xl border border-dashed border-[#d7dde6] px-3 py-8 text-center text-[12px] text-[#7b8798]">
              No templates found.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

/* ---------- text ---------- */

const TextPanel: React.FC<{
  onAddElement: (el: Omit<CanvasElement, "id">) => void;
}> = ({ onAddElement }) => {
  const [isFancyComposerOpen, setIsFancyComposerOpen] = useState(false);

  const addText = (
    preset: "plain" | "fancy" | "subtitle" | "slideshow" | "menu"
  ) => {
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
    <>
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
            onClick={() => setIsFancyComposerOpen(true)}
          />
      
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

      {isFancyComposerOpen ? (
        <FancyTextComposer
          onClose={() => setIsFancyComposerOpen(false)}
          onAddElement={onAddElement}
        />
      ) : null}
    </>
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
  const normalizedSearch = search.trim().toLowerCase();
  const filteredImages = stockImages.filter(
    (src) =>
      normalizedSearch.length === 0 ||
      src.toLowerCase().includes(normalizedSearch)
  );
  const filteredShapes = SHAPE_ASSETS.filter(
    (shape) =>
      normalizedSearch.length === 0 ||
      shape.label.toLowerCase().includes(normalizedSearch)
  );

  return (
    <div>
      <SearchBar
        placeholder={
          mode === "video" ? "Search photos & videos" : "Search photos & shapes"
        }
        value={search}
        onChange={setSearch}
      />

      <SegmentedTabs
        tabs={["photos", "shapes"]}
        active={tab}
        onChange={setTab}
      />

      <div className="h-[24rem] overflow-y-auto pr-1">
        {tab === "photos" ? (
          <div className="grid grid-cols-2 gap-3">
            {filteredImages.map((src, i) => (
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
                <img
                  src={src}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredShapes.map((shape) => (
              <button
                key={shape.label}
                className="flex aspect-[4/3] flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border border-[#e3e7ed] bg-white px-3 py-4 text-[#51627c] transition hover:bg-[#f7fafc] hover:shadow-sm"
                onClick={() =>
                  onAddElement({
                    type: "image",
                    x: 120,
                    y: 120,
                    width: 180,
                    height: 180,
                    src: createShapeAssetDataUrl(shape.icon, shape.color),
                    opacity: 100,
                  })
                }
              >
                <div className="flex h-full w-full items-center justify-center rounded-xl bg-[#f8fafc]">
                  <shape.icon size={52} strokeWidth={1.8} color={shape.color} />
                </div>
                <span className="text-[12px] font-medium text-[#51627c]">
                  {shape.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------- uploads ---------- */

const UploadsPanel: React.FC<{
  onAddElement: (el: Omit<CanvasElement, "id">) => void;
  mode: EditorMode;
}> = ({ onAddElement, mode }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<
    Array<{ src: string; kind: "image" | "video" }>
  >([]);

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
            const ratio =
              (probeVideo.videoWidth || 16) /
              Math.max(1, probeVideo.videoHeight || 9);
            const w = Math.min(probeVideo.videoWidth || maxW, maxW);
            const h = w / ratio;
            onAddElement({
              type: "video",
              x: 100,
              y: 100,
              width: w,
              height: h,
              src: objectUrl,
              duration: Math.round(probeVideo.duration || 0),
            });
          },
          { once: true }
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
          onAddElement({
            type: "image",
            x: 100,
            y: 100,
            width: w,
            height: h,
            src: dataUrl,
          });
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
        <div className="mt-2 text-[14px] font-semibold text-[#243b63]">
          Upload files
        </div>
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
                        const ratio =
                          (probeVideo.videoWidth || 16) /
                          Math.max(1, probeVideo.videoHeight || 9);
                        const w = Math.min(probeVideo.videoWidth || maxW, maxW);
                        const h = w / ratio;
                        onAddElement({
                          type: "video",
                          x: 100,
                          y: 100,
                          width: w,
                          height: h,
                          src: upload.src,
                          duration: Math.round(probeVideo.duration || 0),
                        });
                      },
                      { once: true }
                    );
                    return;
                  }

                  const img = new window.Image();
                  img.onload = () => {
                    const maxW = 500;
                    const ratio = img.width / img.height;
                    const w = Math.min(img.width, maxW);
                    const h = w / ratio;
                    onAddElement({
                      type: "image",
                      x: 100,
                      y: 100,
                      width: w,
                      height: h,
                      src: upload.src,
                    });
                  };
                  img.src = upload.src;
                }}
              >
                {upload.kind === "video" ? (
                  <video
                    src={upload.src}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={upload.src}
                    alt=""
                    className="h-full w-full object-cover"
                  />
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
    "#FFFFFF",
    "#F8F8F8",
    "#EDEDED",
    "#D9D9D9",
    "#BDBDBD",
    "#8D99AE",
    "#4F5D75",
    "#2D3142",
    "#000000",
    "#F94144",
    "#F3722C",
    "#F9C74F",
    "#90BE6D",
    "#43AA8B",
    "#4D96FF",
    "#577590",
    "#9B5DE5",
    "#F15BB5",
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
      <SegmentedTabs
        tabs={["colors", "gradients", "patterns"]}
        active={tab}
        onChange={setTab}
      />

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
            <label className="mb-2 block text-[12px] font-medium text-[#5b6577]">
              Custom color
            </label>
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
                  if (/^#[0-9a-fA-F]{6}$/.test(e.target.value))
                    onBackgroundChange(e.target.value);
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
          <div className="text-[13px] text-[#6b7280]">
            Pattern backgrounds coming soon
          </div>
        </PanelCard>
      )}
    </div>
  );
};

/* ---------- draw ---------- */

const DrawPanel: React.FC<{
  onAddElement: (el: Omit<CanvasElement, "id">) => void;
}> = ({ onAddElement }) => {
  const shapes = [
    {
      label: "Rectangle",
      icon: Square,
      shapeType: "rectangle" as const,
      w: 200,
      h: 150,
    },
    {
      label: "Circle",
      icon: Circle,
      shapeType: "circle" as const,
      w: 150,
      h: 150,
    },
    {
      label: "Triangle",
      icon: Triangle,
      shapeType: "triangle" as const,
      w: 180,
      h: 150,
    },
    { label: "Line", icon: Minus, shapeType: "line" as const, w: 300, h: 4 },
  ];

  const colors = [
    "#2f80ed",
    "#eb5757",
    "#f2c94c",
    "#27ae60",
    "#bb6bd9",
    "#111827",
  ];

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
                <span className="text-[12px] font-medium text-[#243b63]">
                  {shape.label}
                </span>
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
  {
    label: "Instagram Post",
    width: 1080,
    height: 1080,
    description: "1080 × 1080",
  },
  {
    label: "Instagram Story",
    width: 1080,
    height: 1920,
    description: "1080 × 1920",
  },
  {
    label: "Instagram Portrait",
    width: 1080,
    height: 1350,
    description: "1080 × 1350",
  },
  {
    label: "Flyer (US Letter)",
    width: 2550,
    height: 3300,
    description: "8.5 × 11in",
  },
  {
    label: "Facebook Post",
    width: 1200,
    height: 630,
    description: "1200 × 630",
  },
  {
    label: "Twitter/X Post",
    width: 1200,
    height: 675,
    description: "1200 × 675",
  },
  {
    label: "YouTube Thumbnail",
    width: 1280,
    height: 720,
    description: "1280 × 720",
  },
];

const VIDEO_SIZES: CanvasSizePreset[] = [
  {
    label: "Instagram Reel",
    width: 1080,
    height: 1920,
    description: "9:16 vertical",
  },
  {
    label: "YouTube Video",
    width: 1920,
    height: 1080,
    description: "16:9 landscape",
  },
  {
    label: "TikTok Video",
    width: 1080,
    height: 1920,
    description: "9:16 vertical",
  },
  {
    label: "Square Video",
    width: 1080,
    height: 1080,
    description: "1:1 square",
  },
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
      <SearchBar
        placeholder="Search sizes"
        value={search}
        onChange={setSearch}
      />

      <PanelCard className="overflow-hidden">
        <div className="divide-y divide-[#edf1f5]">
          {filtered.map((item) => (
            <button
              key={item.label}
              onClick={() => onCanvasSizeChange(item)}
              className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-[#f7fafc]"
            >
              <span className="text-[13px] font-medium text-[#243b63]">
                {item.label}
              </span>
              <span className="text-[12px] text-[#7c8798]">
                {item.description}
              </span>
            </button>
          ))}
        </div>
      </PanelCard>
    </div>
  );
};

/* ---------- ai ---------- */

const AIPanel: React.FC<{
  onAddElement: (el: Omit<CanvasElement, "id">) => void;
}> = ({ onAddElement }) => {
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
            <div className="text-[14px] font-semibold text-[#243b63]">
              AI Design Assistant
            </div>
            <div className="text-[13px] text-[#6b7280]">
              Describe what you want to create and let AI help.
            </div>
          </div>
        </div>
      </PanelCard>

      <SegmentedTabs
        tabs={["text", "image"]}
        active={mode}
        onChange={setMode}
      />

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

const QRCodePanel: React.FC<{
  onAddElement: (el: Omit<CanvasElement, "id">) => void;
}> = ({ onAddElement }) => {
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
        <label className="mb-2 block text-[12px] font-medium text-[#5b6577]">
          URL or text
        </label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="h-10 w-full rounded-xl border border-[#dfe3ea] bg-[#f8fafc] px-3 text-[13px] text-[#243b63] outline-none"
        />
      </PanelCard>

      <div className="grid grid-cols-2 gap-3">
        <PanelCard className="p-3">
          <label className="mb-2 block text-[12px] font-medium text-[#5b6577]">
            Foreground
          </label>
          <input
            type="color"
            value={fgColor}
            onChange={(e) => setFgColor(e.target.value)}
            className="h-10 w-full rounded-lg border border-[#dfe3ea]"
          />
        </PanelCard>

        <PanelCard className="p-3">
          <label className="mb-2 block text-[12px] font-medium text-[#5b6577]">
            Background
          </label>
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
        className="h-11 w-full rounded-xl bg-[#7650e3] text-sm font-semibold text-white transition"
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
        <div className="text-[14px] font-semibold text-[#2b2150]">
          Record yourself
        </div>
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
        Create a slideshow by adding multiple slides with transitions and
        timing.
      </div>
    </PanelCard>

    <button className="h-11 w-full rounded-xl bg-[#0d73aa] text-sm font-semibold text-white transition hover:bg-[#0b6798]">
      Add slide
    </button>
  </div>
);

/* ---------- table ---------- */

const TablePanel: React.FC<{
  onAddElement: (el: Omit<CanvasElement, "id">) => void;
}> = ({ onAddElement }) => {
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
            <label className="mb-1 block text-[12px] text-[#6b7280]">
              Rows
            </label>
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
            <label className="mb-1 block text-[12px] text-[#6b7280]">
              Columns
            </label>
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
