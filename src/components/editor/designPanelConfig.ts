import type { CanvasSizePreset, EditorMode } from "./EditorShell";

export const IMAGE_SIZE_PRESETS: CanvasSizePreset[] = [
  { label: "Instagram Post", width: 1080, height: 1080, description: "1080 x 1080" },
  { label: "Instagram Story", width: 1080, height: 1920, description: "1080 x 1920" },
  { label: "Instagram Portrait", width: 1080, height: 1350, description: "1080 x 1350" },
  { label: "Flyer (US Letter)", width: 2550, height: 3300, description: "8.5in x 11in" },
  { label: "Facebook Post", width: 1200, height: 630, description: "1200 x 630" },
  { label: "Twitter/X Post", width: 1200, height: 675, description: "1200 x 675" },
  { label: "YouTube Thumbnail", width: 1280, height: 720, description: "1280 x 720" },
];

export const VIDEO_SIZE_PRESETS: CanvasSizePreset[] = [
  { label: "Instagram Reel", width: 1080, height: 1920, description: "9:16 vertical" },
  { label: "YouTube Video", width: 1920, height: 1080, description: "16:9 landscape" },
  { label: "TikTok Video", width: 1080, height: 1920, description: "9:16 vertical" },
  { label: "Square Video", width: 1080, height: 1080, description: "1:1 square" },
];

export const DESIGN_STYLE_SWATCHES = [
  "#8C5523",
  "#A8611B",
  "#FCBB7E",
  "#F5E3CC",
  "#7A4A11",
] as const;

export const DESIGN_STYLE_FILTERS = ["Floral", "Winter", "Summer"] as const;

export const DESIGN_STYLE_RECENTS = [
  ["#D97A1E", "#D9932B", "#E8C978", "#F5EFD6", "#7A4A11"],
] as const;

export const DESIGN_STYLE_LIBRARY = [
  ["#E33434", "#FF8659", "#F09AA1", "#F4C79B", "#4C214F"],
  ["#5864C5", "#A52EB8", "#BAC0DF", "#D1B5D9", "#4E295A"],
  ["#FFD577", "#517BC0", "#EFE0B9", "#B9C4D9", "#47437A"],
  ["#6E6AB0", "#E68F8A", "#D8D6F6", "#F4B5B7", "#705985"],
  ["#E286A7", "#A56CAD", "#F7B8B8", "#D7B5DA", "#6A4C74"],
  ["#D9704D", "#8C4A2D", "#FFA16F", "#BFB8BC", "#8B2818"],
  ["#F19B54", "#C98AA5", "#E9BE99", "#CDAFC3", "#8A5638"],
  ["#FF8A00", "#953C8F", "#F8B24A", "#B78BB2", "#4F3B87"],
  ["#FF7F87", "#FFC487", "#B8D7F0", "#C6BEE1", "#5B5A86"],
] as const;

export const DESIGN_HISTORY_COLORS = [
  "#8C5523",
  "#A8611B",
  "#FCBB7E",
] as const;

export const DESIGN_DEFAULT_PRESET_COLORS = [
  "#000000",
  "#5A5A5E",
  "#A9ABB0",
  "#D3D6DC",
  "#FFFFFF",
  "#A07D71",
  "#F04D4D",
  "#FF9258",
  "#F9BB58",
  "#F9D85D",
  "#57D1A4",
  "#12B76A",
  "#57D7D2",
  "#41A8E7",
  "#4B67E8",
  "#1E5AB8",
  "#7B56E8",
  "#C56BE9",
  "#E85AB8",
] as const;

export const DEFAULT_LINEAR_GRADIENT = "linear-gradient(135deg, #FCBB7E 0%, #8C5523 100%)";
export const DEFAULT_RADIAL_GRADIENT = "radial-gradient(circle at center, #FCBB7E 0%, #8C5523 100%)";

export function getCanvasSizePresets(mode: EditorMode): CanvasSizePreset[] {
  return mode === "video" ? VIDEO_SIZE_PRESETS : IMAGE_SIZE_PRESETS;
}
