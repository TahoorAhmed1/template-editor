export interface TemplateCanvasDimensions {
  width: number;
  height: number;
}

export interface TemplateViewportScroll {
  left: number;
  top: number;
}

export interface TemplateViewportPoint {
  x: number;
  y: number;
}

export interface TemplateViewportState {
  zoom?: number;
  desktopScroll?: TemplateViewportScroll;
  mobilePan?: TemplateViewportPoint;
}

export interface TemplateCanvasPreset {
  label: string;
  description?: string;
}

export interface TemplateJson {
  name?: string;
  source?: string;
  savedAt?: string;
  version?: number;
  editorMode?: "image" | "video";
  elements?: Array<Record<string, unknown>>;
  aspectRatio?: string;
  canvasDimensions?: Partial<TemplateCanvasDimensions>;
  canvasPreset?: TemplateCanvasPreset;
  lockedElementIds?: string[];
  thumbnailDataUrl?: string;
  canvasBackground?: string;
  viewportState?: TemplateViewportState;
}

export interface TemplateRecord {
  id: string;
  userId?: string;
  dimension?: string;
  name: string;
  json: TemplateJson;
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TemplateApplyPayload {
  name: string;
  dimension?: string;
  json: TemplateJson;
}