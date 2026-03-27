import React, { useState, useRef } from "react";
import { EditorShell } from "@/components/editor/EditorShell";
import type { EditorMode, CanvasSizePreset } from "@/components/editor/EditorShell";
import {
  Image,
  Film,
  ArrowRight,
  Upload,
  Sparkles,
  SlidersHorizontal,
  Search,
  Instagram,
  Facebook,
  Youtube,
  Twitter,
  Printer,
  FileText,
  Monitor,
  Megaphone,
  UtensilsCrossed,
  LayoutGrid,
  ChevronRight,
} from "lucide-react";import { ErrorBoundary } from "@/components/ErrorBoundary";
// ── Comprehensive Image Size Presets by Category ──

interface SizeCategory {
  name: string;
  presets: CanvasSizePreset[];
}

const SOCIAL_MEDIA: CanvasSizePreset[] = [
  { label: "Instagram Post", width: 1080, height: 1080, description: "1080 × 1080px" },
  { label: "Instagram Portrait", width: 1080, height: 1350, description: "1080 × 1350px" },
  { label: "Instagram Story", width: 1080, height: 1920, description: "1080 × 1920px" },
  { label: "Facebook Shared Image", width: 1200, height: 630, description: "1200 × 630px" },
  { label: "Facebook Cover Photo", width: 851, height: 315, description: "851 × 315px" },
  { label: "Facebook Event Cover", width: 1920, height: 1005, description: "1920 × 1005px" },
  { label: "Facebook Group Cover", width: 1640, height: 856, description: "1640 × 856px" },
  { label: "Facebook Story", width: 1080, height: 1920, description: "1080 × 1920px" },
  { label: "YouTube Thumbnail", width: 1280, height: 720, description: "1280 × 720px" },
  { label: "YouTube Channel Cover", width: 2560, height: 1440, description: "2560 × 1440px" },
  { label: "Twitter/X Post", width: 1200, height: 675, description: "1200 × 675px" },
  { label: "Twitter/X Banner", width: 1500, height: 500, description: "1500 × 500px" },
  { label: "LinkedIn Background", width: 1400, height: 425, description: "1400 × 425px" },
  { label: "LinkedIn Banner", width: 646, height: 220, description: "646 × 220px" },
  { label: "Pinterest Graphic", width: 735, height: 1102, description: "735 × 1102px" },
  { label: "WhatsApp Status", width: 1080, height: 1920, description: "1080 × 1920px" },
  { label: "Snapchat Geofilter", width: 1080, height: 2340, description: "1080 × 2340px" },
  { label: "Twitch Profile Banner", width: 1200, height: 480, description: "1200 × 480px" },
  { label: "Twitch Overlay", width: 1920, height: 1080, description: "1920 × 1080px" },
];

const MARKETING: CanvasSizePreset[] = [
  { label: "Flyer (US Letter)", width: 2550, height: 3300, description: "8.5 × 11in" },
  { label: "Flyer (Landscape)", width: 3300, height: 2550, description: "11 × 8.5in" },
  { label: "Poster (24×36)", width: 2400, height: 3600, description: "24 × 36in" },
  { label: "Poster (36×24)", width: 3600, height: 2400, description: "36 × 24in" },
  { label: "Business Card", width: 1050, height: 600, description: "3.5 × 2in" },
  { label: "Business Card (Vertical)", width: 600, height: 1050, description: "2 × 3.5in" },
  { label: "Postcard", width: 1748, height: 1240, description: "14.8 × 10.5cm" },
  { label: "Rack Card", width: 1200, height: 2700, description: "4 × 9in" },
  { label: "Banner 4×6ft", width: 1200, height: 1800, description: "4 × 6ft" },
  { label: "Banner 2×6ft", width: 600, height: 1800, description: "2 × 6ft" },
  { label: "Roll Up Banner", width: 900, height: 1800, description: "3 × 6ft" },
  { label: "Yard Sign", width: 2400, height: 1800, description: "24 × 18in" },
  { label: "Door Hanger", width: 1275, height: 3300, description: "4.25 × 11in" },
  { label: "Label", width: 1800, height: 1200, description: "6 × 4in" },
  { label: "Flag", width: 1800, height: 1200, description: "18 × 12in" },
  { label: "Envelope", width: 2850, height: 1237, description: "9.5 × 4.125in" },
];

const MENUS: CanvasSizePreset[] = [
  { label: "Half Page Wide", width: 1650, height: 2550, description: "5.5 × 8.5in" },
  { label: "Menu Poster", width: 2200, height: 2800, description: "22 × 28in" },
  { label: "Half Page Letter", width: 1275, height: 3300, description: "4.25 × 11in" },
  { label: "Half Page Legal", width: 1275, height: 4200, description: "4.25 × 14in" },
  { label: "Tabloid Menu", width: 3300, height: 5100, description: "11 × 17in" },
];

const DOCUMENTS: CanvasSizePreset[] = [
  { label: "A4 Portrait", width: 2480, height: 3508, description: "21 × 29.7cm" },
  { label: "A4 Landscape", width: 3508, height: 2480, description: "29.7 × 21cm" },
  { label: "A3 Portrait", width: 3508, height: 4961, description: "29.7 × 42cm" },
  { label: "A5 Portrait", width: 1748, height: 2480, description: "14.8 × 21cm" },
  { label: "A6 Portrait", width: 1240, height: 1748, description: "10.5 × 14.8cm" },
  { label: "US Legal", width: 2550, height: 4200, description: "8.5 × 14in" },
  { label: "Tabloid", width: 3300, height: 5100, description: "11 × 17in" },
  { label: "Presentation (16:9)", width: 1920, height: 1080, description: "1920 × 1080px" },
  { label: "Presentation (4:3)", width: 1024, height: 768, description: "1024 × 768px" },
  { label: "Kindle/Book Cover", width: 1600, height: 2560, description: "1600 × 2560px" },
];

const DIGITAL: CanvasSizePreset[] = [
  { label: "Digital Display (16:9)", width: 1920, height: 1080, description: "1920 × 1080px" },
  { label: "Digital Display (9:16)", width: 1080, height: 1920, description: "1080 × 1920px" },
  { label: "Album Cover", width: 1600, height: 1600, description: "1600 × 1600px" },
  { label: "Logo", width: 600, height: 600, description: "600 × 600px" },
  { label: "Square (1:1)", width: 1080, height: 1080, description: "1080 × 1080px" },
  { label: "Blog Header", width: 700, height: 400, description: "700 × 400px" },
  { label: "Email Header", width: 600, height: 200, description: "600 × 200px" },
  { label: "Wattpad Cover", width: 512, height: 800, description: "512 × 800px" },
  { label: "Google Classroom Banner", width: 1000, height: 250, description: "1000 × 250px" },
];

const ONLINE_ADS: CanvasSizePreset[] = [
  { label: "Facebook Ad", width: 1200, height: 628, description: "1200 × 628px" },
  { label: "Medium Rectangle", width: 300, height: 250, description: "300 × 250px" },
  { label: "Large Rectangle", width: 336, height: 280, description: "336 × 280px" },
  { label: "Wide Skyscraper", width: 160, height: 600, description: "160 × 600px" },
  { label: "Leaderboard", width: 728, height: 90, description: "728 × 90px" },
  { label: "Etsy Banner", width: 760, height: 100, description: "760 × 100px" },
  { label: "Eventbrite Banner", width: 2160, height: 1080, description: "2160 × 1080px" },
  { label: "Soundcloud Banner", width: 2480, height: 520, description: "2480 × 520px" },
];

const VIDEO_PRESETS: CanvasSizePreset[] = [
  { label: "Instagram Reel", width: 1080, height: 1920, description: "9:16 vertical" },
  { label: "YouTube Video", width: 1920, height: 1080, description: "16:9 landscape" },
  { label: "TikTok Video", width: 1080, height: 1920, description: "9:16 vertical" },
  { label: "YouTube Short", width: 1080, height: 1920, description: "9:16 vertical" },
  { label: "Facebook Story", width: 1080, height: 1920, description: "9:16 vertical" },
  { label: "Square Video", width: 1080, height: 1080, description: "1:1 square" },
  { label: "Twitter/X Video", width: 1200, height: 675, description: "16:9 landscape" },
];

const IMAGE_CATEGORIES: SizeCategory[] = [
  { name: "Social Media", presets: SOCIAL_MEDIA },
  { name: "Marketing", presets: MARKETING },
  { name: "Menus", presets: MENUS },
  { name: "Documents", presets: DOCUMENTS },
  { name: "Digital", presets: DIGITAL },
  { name: "Online Ads", presets: ONLINE_ADS },
];

const POPULAR_PRESETS: CanvasSizePreset[] = [
  { label: "Flyer (US Letter)", width: 2550, height: 3300, description: "8.5 × 11in" },
  { label: "Poster (24×36)", width: 2400, height: 3600, description: "24 × 36in" },
  { label: "Instagram Post", width: 1080, height: 1080, description: "1080 × 1080px" },
  { label: "Album Cover", width: 1600, height: 1600, description: "1600 × 1600px" },
  { label: "Logo", width: 600, height: 600, description: "600 × 600px" },
  { label: "Business Card", width: 1050, height: 600, description: "3.5 × 2in" },
];

const CATEGORY_TABS = ["Popular", "Social Media", "Marketing", "Menus", "Documents", "Digital", "Videos", "Online Ads"];

const Index = () => {
  const [editorState, setEditorState] = useState<{
    mode: EditorMode;
    preset: CanvasSizePreset;
  } | null>(null);
  const [activeTab, setActiveTab] = useState("Popular");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCustomDimensions, setShowCustomDimensions] = useState(false);
  const [customW, setCustomW] = useState(1080);
  const [customH, setCustomH] = useState(1080);
  const fileRef = useRef<HTMLInputElement>(null);

  if (editorState) {
    return (
      <ErrorBoundary>
        <EditorShell
          mode={editorState.mode}
          initialSize={editorState.preset}
          onBack={() => setEditorState(null)}
        />
      </ErrorBoundary>
    );
  }

  const handleCustomCreate = () => {
    if (customW >= 50 && customH >= 50) {
      setEditorState({
        mode: "image",
        preset: { label: "Custom", width: customW, height: customH, description: `${customW} × ${customH}px` },
      });
    }
  };

  const handleUpload = () => {
    fileRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      setEditorState({
        mode: "image",
        preset: { label: file.name, width: img.width, height: img.height, description: `${img.width} × ${img.height}px` },
      });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const getPresetsForTab = (): CanvasSizePreset[] => {
    if (activeTab === "Popular") return POPULAR_PRESETS;
    if (activeTab === "Videos") return VIDEO_PRESETS;
    const cat = IMAGE_CATEGORIES.find((c) => c.name === activeTab);
    return cat ? cat.presets : [];
  };

  const allPresets = getPresetsForTab();
  const filteredPresets = searchQuery
    ? allPresets.filter((p) => p.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : allPresets;

  const isVideo = activeTab === "Videos";

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

      {/* Header */}
      <div className="bg-[#7650e3] text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 text-center">
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight mb-2">
            Start from a blank design
          </h1>
          <p className="text-primary-foreground/80 text-sm md:text-base">
            Get started with a design size or upload your own media.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-3xl mx-auto px-4 -mt-5">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search for a size or design template"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-4 text-sm bg-background border border-border rounded-xl shadow-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-2 border-b border-border">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSearchQuery(""); }}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? "text-primary border-b-2 border-[#7650e3] bg-[#7650e3]/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Actions (only on Popular tab) */}
      {activeTab === "Popular" && !searchQuery && (
        <div className="max-w-7xl mx-auto px-4 mt-6">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            {/* Upload */}
            <button
              onClick={handleUpload}
              className="flex flex-col items-center gap-2 min-w-[100px] group"
            >
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-accent border-2 border-dashed border-border group-hover:border-[#7650e3]/50 flex items-center justify-center transition-colors">
                <Upload size={24} className="text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="text-xs font-medium text-foreground">Upload</span>
            </button>

            {/* Create with AI */}
            <button className="flex flex-col items-center gap-2 min-w-[100px] group">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-violet-100 to-blue-100 border-2 border-dashed border-violet-200 group-hover:border-violet-400 flex items-center justify-center transition-colors">
                <Sparkles size={24} className="text-violet-500" />
              </div>
              <span className="text-xs font-medium text-[#7650e3]">Create with AI</span>
            </button>

            {/* Custom Dimensions */}
            <button
              onClick={() => setShowCustomDimensions(true)}
              className="flex flex-col items-center gap-2 min-w-[100px] group"
            >
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-accent border-2 border-dashed border-border group-hover:border-[#7650e3]/50 flex items-center justify-center transition-colors">
                <SlidersHorizontal size={24} className="text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="text-xs font-medium text-foreground">Custom Dimensions</span>
            </button>

            {/* Quick popular presets as cards */}
            {POPULAR_PRESETS.slice(0, 6).map((preset) => (
              <button
                key={preset.label}
                onClick={() => setEditorState({ mode: "image", preset })}
                className="flex flex-col items-center gap-2 min-w-[100px] group"
              >
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-accent/50 border border-border group-hover:border-[#7650e3]/50 flex items-center justify-center transition-colors overflow-hidden">
                  <div
                    className="bg-muted border border-border rounded-sm"
                    style={{
                      width: preset.width > preset.height ? 48 : Math.round(48 * (preset.width / preset.height)),
                      height: preset.height > preset.width ? 48 : Math.round(48 * (preset.height / preset.width)),
                    }}
                  />
                </div>
                <div className="text-center">
                  <span className="text-xs font-medium text-foreground block leading-tight">{preset.label}</span>
                  <span className="text-[10px] text-muted-foreground">{preset.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom Dimensions Modal */}
      {showCustomDimensions && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowCustomDimensions(false)}>
          <div className="bg-background rounded-2xl shadow-xl border border-border p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-4">Custom Dimensions</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Width (px)</label>
                  <input
                    type="number"
                    value={customW}
                    onChange={(e) => setCustomW(Number(e.target.value))}
                    className="w-full h-10 px-3 text-sm bg-accent/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <span className="text-muted-foreground mt-5">×</span>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Height (px)</label>
                  <input
                    type="number"
                    value={customH}
                    onChange={(e) => setCustomH(Number(e.target.value))}
                    className="w-full h-10 px-3 text-sm bg-accent/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <button
                onClick={handleCustomCreate}
                className="w-full h-10 bg-[#7650e3] text-primary-foreground text-sm font-semibold rounded-lg hover:bg-[#7650e3]/90 transition-colors"
              >
                Create Design
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Sections */}
      <div className="max-w-7xl mx-auto px-4 mt-6 pb-12">
        {searchQuery ? (
          /* Search Results */
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              {filteredPresets.length} result{filteredPresets.length !== 1 ? "s" : ""} for "{searchQuery}"
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {filteredPresets.map((preset) => (
                <PresetCard
                  key={preset.label}
                  preset={preset}
                  onClick={() => setEditorState({ mode: isVideo ? "video" : "image", preset })}
                />
              ))}
            </div>
          </div>
        ) : activeTab === "Popular" ? (
          /* Popular tab: show categorized sections */
          <div className="space-y-8 mt-4">
            {IMAGE_CATEGORIES.map((category) => (
              <div key={category.name}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-foreground">{category.name}</h3>
                  <button
                    onClick={() => setActiveTab(category.name)}
                    className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1"
                  >
                    View all <ChevronRight size={14} />
                  </button>
                </div>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                  {category.presets.slice(0, 8).map((preset) => (
                    <PresetCard
                      key={preset.label}
                      preset={preset}
                      onClick={() => setEditorState({ mode: "image", preset })}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === "Videos" ? (
          /* Videos tab */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-4">
            {filteredPresets.map((preset) => (
              <PresetCard
                key={preset.label}
                preset={preset}
                onClick={() => setEditorState({ mode: "video", preset })}
                isVideo
              />
            ))}
          </div>
        ) : (
          /* Category tab */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-4">
            {filteredPresets.map((preset) => (
              <PresetCard
                key={preset.label}
                preset={preset}
                onClick={() => setEditorState({ mode: "image", preset })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const PresetCard: React.FC<{
  preset: CanvasSizePreset;
  onClick: () => void;
  isVideo?: boolean;
}> = ({ preset, onClick, isVideo }) => {
  const maxDim = 64;
  const aspect = preset.width / preset.height;
  const thumbW = aspect >= 1 ? maxDim : Math.round(maxDim * aspect);
  const thumbH = aspect <= 1 ? maxDim : Math.round(maxDim / aspect);

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-3 min-w-[120px] rounded-xl border border-border hover:border-[#7650e3]/50 hover:shadow-md bg-background transition-all group"
    >
      <div className="w-20 h-20 flex items-center justify-center">
        <div
          className={`rounded-sm border transition-colors ${
            isVideo
              ? "bg-purple-50 border-purple-200 group-hover:border-purple-400"
              : "bg-muted border-border group-hover:border-[#7650e3]/40"
          }`}
          style={{ width: thumbW, height: thumbH }}
        >
          {isVideo && (
            <div className="w-full h-full flex items-center justify-center">
              <Film size={16} className="text-purple-400" />
            </div>
          )}
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-foreground leading-tight">{preset.label}</p>
        <p className="text-[10px] text-muted-foreground">{preset.description}</p>
      </div>
    </button>
  );
};

export default Index;
