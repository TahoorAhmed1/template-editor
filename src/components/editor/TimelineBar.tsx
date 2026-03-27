import React, { useRef, useCallback, useEffect } from "react";
import { Play, Pause, Pencil, Music, SkipBack, SkipForward, Volume2 } from "lucide-react";
import type { CanvasElement } from "./EditorShell";

interface TimelineBarProps {
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  onTimeChange: (time: number) => void;
  onPlayPause: () => void;
  onDurationChange: (duration: number) => void;
  elements: CanvasElement[];
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export const TimelineBar: React.FC<TimelineBarProps> = ({
  duration,
  currentTime,
  isPlaying,
  onTimeChange,
  onPlayPause,
  onDurationChange,
  elements,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<number | null>(null);

  // Auto-advance when playing
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = window.setInterval(() => {
        onTimeChange(currentTime + 0.1 >= duration ? 0 : currentTime + 0.1);
      }, 100);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, currentTime, duration, onTimeChange]);

  const handleTrackClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onTimeChange(pct * duration);
  }, [duration, onTimeChange]);

  const handleTrackDrag = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    handleTrackClick(e);
  }, [handleTrackClick]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-editor-toolbar border-t border-editor-toolbar-border shrink-0 hidden md:block">
      {/* Controls row */}
      <div className="h-11 flex items-center px-4 gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onTimeChange(0)}
            className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            title="Start"
          >
            <SkipBack size={14} strokeWidth={1.5} />
          </button>
          <button
            onClick={onPlayPause}
            className="p-1.5 rounded hover:bg-accent transition-colors text-foreground"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={16} strokeWidth={1.5} /> : <Play size={16} strokeWidth={1.5} />}
          </button>
          <button
            onClick={() => onTimeChange(duration)}
            className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            title="End"
          >
            <SkipForward size={14} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex items-center gap-2 text-[12px] text-muted-foreground tabular-nums">
          <span>{formatTime(currentTime)}</span>
          <span>/</span>
          <span>{formatTime(duration)}</span>
        </div>

        <div className="h-5 w-px bg-editor-toolbar-border" />

        <button className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-accent">
          <Pencil size={13} strokeWidth={1.5} />
          Edit timeline
        </button>

        <button className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground" title="Music">
          <Music size={14} strokeWidth={1.5} />
        </button>

        <button className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground" title="Volume">
          <Volume2 size={14} strokeWidth={1.5} />
        </button>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">Duration</span>
          <select
            value={duration}
            onChange={(e) => onDurationChange(Number(e.target.value))}
            className="h-7 px-2 text-[11px] bg-accent/50 border border-editor-toolbar-border rounded text-foreground focus:outline-none"
          >
            <option value={5}>5s</option>
            <option value={10}>10s</option>
            <option value={15}>15s</option>
            <option value={30}>30s</option>
            <option value={60}>60s</option>
            <option value={90}>90s</option>
          </select>
        </div>
      </div>

      {/* Timeline scrubber */}
      <div
        ref={trackRef}
        className="h-6 mx-4 mb-2 relative cursor-pointer group"
        onClick={handleTrackClick}
        onMouseMove={handleTrackDrag}
      >
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-[#7650e3] rounded-full transition-[width] duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Playhead */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#7650e3] border-2 border-[#7650e3]-foreground shadow-md transition-[left] duration-75"
          style={{ left: `calc(${progress}% - 6px)` }}
        />
        {/* Tick marks */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-0">
          {Array.from({ length: Math.min(duration + 1, 31) }).map((_, i) => (
            <div key={i} className="w-px h-1.5 bg-muted-foreground/20" />
          ))}
        </div>
      </div>
    </div>
  );
};
