import React from "react";
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Save,
  Share2,
  Download,
  Send,
  HelpCircle,
  MoreHorizontal,
  Menu,
} from "lucide-react";
import type { EditorMode } from "./EditorShell";

interface TopBarProps {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isMobile: boolean;
  mode: EditorMode;
  onBack: () => void;
  onDownload?: () => void;
  onResize?: () => void;
  onAI?: () => void;
  onMobileMenu?: () => void;
  onSave?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ undo, redo, canUndo, canRedo, isMobile, mode, onBack, onDownload, onResize, onAI, onMobileMenu, onSave }) => {
  if (isMobile) {
    return (
      <header className="flex h-14 items-center justify-between px-3 bg-[#7650e3] shrink-0 z-20">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="hidden rounded-md p-2 text-primary-foreground hover:bg-[#7650e3]-foreground/10 transition-colors">
            <ArrowLeft size={18} strokeWidth={1.5} className="text-primary-foreground" />
          </button>
          <button
            onClick={onMobileMenu}
            className="rounded-md p-2 text-primary-foreground hover:bg-[#7650e3]-foreground/10 transition-colors"
            aria-label="Open mobile tools"
          >
            <Menu size={18} strokeWidth={1.5} className="text-primary-foreground" />
          </button>
          <span className="text-sm font-semibold text-primary-foreground">
            {mode === "video" ? "Video Editor" : "Editor"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="rounded-md p-2 hover:bg-[#7650e3]-foreground/10 transition-colors disabled:opacity-30"
          >
            <Undo2 size={16} strokeWidth={1.5} className="text-primary-foreground/80" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="rounded-md p-2 hover:bg-[#7650e3]-foreground/10 transition-colors disabled:opacity-30"
          >
            <Redo2 size={16} strokeWidth={1.5} className="text-primary-foreground/80" />
          </button>
          <button
            onClick={onSave}
            className="rounded-md p-2 hover:bg-[#7650e3]-foreground/10 transition-colors"
            aria-label="Open saved canvas designs"
          >
            <Save size={16} strokeWidth={1.5} className="text-primary-foreground/80" />
          </button>
   
          <button className="rounded-md p-2 hover:bg-[#7650e3]-foreground/10 transition-colors">
            <MoreHorizontal size={18} strokeWidth={1.5} className="text-primary-foreground/80" />
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="h-[52px] flex items-center justify-between px-4 bg-[#7650e3] shrink-0 z-20">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="hidden p-2 rounded-md hover:bg-[#7650e3]-foreground/10 transition-colors duration-100">
          <ArrowLeft size={18} strokeWidth={1.5} className="text-primary-foreground" />
        </button>

        <div className="hidden h-5 w-px bg-[#7650e3]-foreground/20 mx-1" />

        <button className="hidden text-[13px] font-medium text-primary-foreground/90 hover:bg-[#7650e3]-foreground/10 px-3 py-1.5 rounded-md transition-colors duration-100">
          File
        </button>
        {/* <button className="text-[13px] font-medium text-primary-foreground/90 hover:bg-[#7650e3]-foreground/10 px-3 py-1.5 rounded-md transition-colors duration-100" onClick={onDownload}>
          Download
        </button> */}
        <button className="text-[13px] font-medium text-primary-foreground/90 hover:bg-[#7650e3]-foreground/10 px-3 py-1.5 rounded-md transition-colors duration-100" onClick={onResize}>
          Resize
        </button>
        <button className="hidden text-[13px] font-medium text-primary-foreground/90 hover:bg-[#7650e3]-foreground/10 px-3 py-1.5 rounded-md transition-colors duration-100" onClick={onAI}>
          AI Writer
        </button>

        <div className="h-5 w-px bg-[#7650e3]-foreground/20 mx-1" />

        <button
          onClick={undo}
          disabled={!canUndo}
          className="p-2 rounded-md hover:bg-[#7650e3]-foreground/10 transition-colors duration-100 disabled:opacity-30"
        >
          <Undo2 size={18} strokeWidth={1.5} className="text-primary-foreground/70" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="p-2 rounded-md hover:bg-[#7650e3]-foreground/10 transition-colors duration-100 disabled:opacity-30"
        >
          <Redo2 size={18} strokeWidth={1.5} className="text-primary-foreground/70" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {/* <button className="p-2 rounded-md hover:bg-[#7650e3]-foreground/10 transition-colors duration-100">
          <HelpCircle size={18} strokeWidth={1.5} className="text-primary-foreground/70" />
        </button> */}


        <button
          onClick={onSave}
          className="inline-flex items-center gap-1.5 border border-[#7650e3]-foreground/20 hover:bg-[#7650e3]-foreground/10 text-primary-foreground text-[13px] font-medium px-4 py-2 rounded-md transition-colors duration-100"
        >
          <Save size={15} strokeWidth={1.5} />
          Save
        </button>

        {/* <button className="inline-flex items-center gap-1.5 border border-[#7650e3]-foreground/20 hover:bg-[#7650e3]-foreground/10 text-primary-foreground text-[13px] font-medium px-4 py-2 rounded-md transition-colors duration-100">
          <Share2 size={15} strokeWidth={1.5} />
          Share
        </button> */}


      </div>
    </header>
  );
};
