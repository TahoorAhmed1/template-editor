export interface TemplateCanvasDimensions {
  width: number;
  height: number;
}

export interface TemplateJson {
  name?: string;
  source?: string;
  savedAt?: string;
  version?: number;
  elements?: Array<Record<string, unknown>>;
  aspectRatio?: string;
  canvasDimensions?: Partial<TemplateCanvasDimensions>;
  lockedElementIds?: string[];
  thumbnailDataUrl?: string;
  canvasBackground?: string;
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