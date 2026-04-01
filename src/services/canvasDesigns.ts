import { API } from "./api";
import type {
  CanvasElement,
  CanvasSizePreset,
  EditorMode,
} from "@/components/editor/EditorShell";
import type {
  TemplateJson,
  TemplateRecord,
} from "@/components/editor/templateTypes";

const LOCAL_STORAGE_KEY = "canvas-designs.v1";

export interface CanvasDesignSnapshot {
  name: string;
  mode: EditorMode;
  canvasSize: CanvasSizePreset;
  canvasBackground: string;
  elements: CanvasElement[];
  thumbnailDataUrl?: string;
}

export interface CanvasDesignRecord extends TemplateRecord {
  json: TemplateJson;
}

const isBrowser = typeof window !== "undefined";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const createLocalId = () =>
  `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const getTimestampValue = (value?: string) => {
  if (!value) {
    return 0;
  }

  return new Date(value).getTime() || 0;
};

const getDesignTimestamp = (design: CanvasDesignRecord) =>
  design.updatedAt ?? design.json.savedAt ?? design.createdAt ?? "";

const sortDesigns = (designs: CanvasDesignRecord[]) =>
  [...designs].sort((left, right) => {
    const leftTime = new Date(getDesignTimestamp(left)).getTime() || 0;
    const rightTime = new Date(getDesignTimestamp(right)).getTime() || 0;
    return rightTime - leftTime;
  });

const normalizeDesignRecord = (value: unknown): CanvasDesignRecord | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === "string" ? value.id : null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const json = isRecord(value.json) ? (value.json as TemplateJson) : null;

  if (!id || !name || !json) {
    return null;
  }

  return {
    id,
    userId: typeof value.userId === "string" ? value.userId : undefined,
    dimension: typeof value.dimension === "string" ? value.dimension : undefined,
    name,
    json,
    isPublic: typeof value.isPublic === "boolean" ? value.isPublic : undefined,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : undefined,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : undefined,
  };
};

const unwrapRecords = (payload: unknown) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload)) {
    return [];
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  if (isRecord(payload.data)) {
    return [payload.data];
  }

  return [payload];
};

const mergeCanvasDimensions = (
  primary?: Partial<TemplateJson["canvasDimensions"]>,
  secondary?: Partial<TemplateJson["canvasDimensions"]>,
) => {
  const width = primary?.width ?? secondary?.width;
  const height = primary?.height ?? secondary?.height;

  if (width == null && height == null) {
    return undefined;
  }

  return {
    ...(secondary ?? {}),
    ...(primary ?? {}),
    width,
    height,
  };
};

const mergeTemplateJson = (
  primary?: TemplateJson | null,
  secondary?: TemplateJson | null,
): TemplateJson => ({
  ...(secondary ?? {}),
  ...(primary ?? {}),
  canvasDimensions: mergeCanvasDimensions(primary?.canvasDimensions, secondary?.canvasDimensions),
  elements:
    Array.isArray(primary?.elements) && primary.elements.length > 0
      ? primary.elements
      : Array.isArray(secondary?.elements)
      ? secondary.elements
      : undefined,
  lockedElementIds:
    Array.isArray(primary?.lockedElementIds) && primary.lockedElementIds.length > 0
      ? primary.lockedElementIds
      : Array.isArray(secondary?.lockedElementIds)
      ? secondary.lockedElementIds
      : undefined,
  thumbnailDataUrl: primary?.thumbnailDataUrl || secondary?.thumbnailDataUrl,
  canvasBackground: primary?.canvasBackground || secondary?.canvasBackground,
  name: primary?.name || secondary?.name,
  source: primary?.source || secondary?.source,
  savedAt: primary?.savedAt || secondary?.savedAt,
  version: primary?.version ?? secondary?.version,
  editorMode: primary?.editorMode ?? secondary?.editorMode,
  aspectRatio: primary?.aspectRatio || secondary?.aspectRatio,
});

const deriveDimensionFromCanvasDimensions = (
  canvasDimensions?: Partial<TemplateJson["canvasDimensions"]> | null,
  fallback?: string,
): string | undefined => {
  if (canvasDimensions?.width && canvasDimensions?.height) {
    return `${canvasDimensions.width}x${canvasDimensions.height}`;
  }
  return fallback;
};

const mergeCanvasDesignRecords = (
  primary: CanvasDesignRecord,
  secondary?: CanvasDesignRecord | null,
): CanvasDesignRecord => {
  if (!secondary) {
    // Even for standalone records, keep dimension in sync with canvasDimensions
    const dimension = deriveDimensionFromCanvasDimensions(
      primary.json.canvasDimensions,
      primary.dimension,
    );
    return { ...primary, dimension };
  }

  const primaryTimestamp = getTimestampValue(getDesignTimestamp(primary));
  const secondaryTimestamp = getTimestampValue(getDesignTimestamp(secondary));
  const preferred = primaryTimestamp >= secondaryTimestamp ? primary : secondary;
  const fallback = preferred === primary ? secondary : primary;

  const mergedJson = mergeTemplateJson(preferred.json, fallback.json);
  const dimension = deriveDimensionFromCanvasDimensions(
    mergedJson.canvasDimensions,
    preferred.dimension || fallback.dimension,
  );

  return {
    id: preferred.id || fallback.id,
    userId: preferred.userId ?? fallback.userId,
    dimension,
    name: preferred.name || fallback.name,
    json: mergedJson,
    isPublic: preferred.isPublic ?? fallback.isPublic,
    createdAt: preferred.createdAt ?? fallback.createdAt,
    updatedAt: preferred.updatedAt ?? fallback.updatedAt,
  };
};

const readLocalDesigns = (): CanvasDesignRecord[] => {
  if (!isBrowser) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return sortDesigns(
      parsed
        .map(normalizeDesignRecord)
        .filter((design): design is CanvasDesignRecord => Boolean(design)),
    );
  } catch {
    return [];
  }
};

const writeLocalDesigns = (designs: CanvasDesignRecord[]) => {
  if (!isBrowser) {
    return;
  }

  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sortDesigns(designs)));
};

const mergeDesignLists = (
  primary: CanvasDesignRecord[],
  secondary: CanvasDesignRecord[],
) => {
  const next = new Map<string, CanvasDesignRecord>();

  primary.forEach((design) => {
    next.set(design.id, design);
  });

  secondary.forEach((design) => {
    next.set(design.id, mergeCanvasDesignRecords(next.get(design.id) ?? design, next.get(design.id) ? design : null));
  });

  return sortDesigns(Array.from(next.values()));
};

const upsertLocalDesign = (design: CanvasDesignRecord) => {
  const next = mergeDesignLists([design], readLocalDesigns().filter((item) => item.id !== design.id));
  writeLocalDesigns(next);
  return design;
};

const removeLocalDesign = (id: string) => {
  writeLocalDesigns(readLocalDesigns().filter((design) => design.id !== id));
};

const greatestCommonDivisor = (left: number, right: number): number => {
  if (!right) {
    return left;
  }

  return greatestCommonDivisor(right, left % right);
};

const buildAspectRatio = (width: number, height: number) => {
  const divisor = greatestCommonDivisor(width, height) || 1;
  return `${width / divisor}:${height / divisor}`;
};

const buildPersistPayload = (snapshot: CanvasDesignSnapshot) => {
  const savedAt = new Date().toISOString();
  const dimension = `${snapshot.canvasSize.width}x${snapshot.canvasSize.height}`;

  const json: TemplateJson = {
    name: snapshot.name,
    source: "canvas-editor",
    savedAt,
    version: 1,
    editorMode: snapshot.mode,
    elements: snapshot.elements as unknown as Array<Record<string, unknown>>,
    aspectRatio: buildAspectRatio(snapshot.canvasSize.width, snapshot.canvasSize.height),
    canvasDimensions: {
      width: snapshot.canvasSize.width,
      height: snapshot.canvasSize.height,
    },
    canvasBackground: snapshot.canvasBackground,
    thumbnailDataUrl: snapshot.thumbnailDataUrl,
  };

  return {
    name: snapshot.name,
    dimension,
    json,
    isPublic: false,
  };
};

const buildFallbackRecord = (
  snapshot: CanvasDesignSnapshot,
  id?: string,
  existing?: CanvasDesignRecord | null,
): CanvasDesignRecord => {
  const payload = buildPersistPayload(snapshot);
  const timestamp = payload.json.savedAt;

  return {
    id: id ?? existing?.id ?? createLocalId(),
    name: payload.name,
    dimension: payload.dimension,
    json: payload.json,
    isPublic: false,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
};

const getExistingLocalDesign = (id: string) =>
  readLocalDesigns().find((design) => design.id === id) ?? null;

export const listCanvasDesigns = async (): Promise<CanvasDesignRecord[]> => {
  const localDesigns = readLocalDesigns();

  try {
    const response = await API.get("/client/template");
    const remoteDesigns = unwrapRecords(response?.data)
      .map(normalizeDesignRecord)
      .filter((design): design is CanvasDesignRecord => Boolean(design));
    // Local-first: local records have authoritative canvasDimensions from our own saves;
    // remote fills in designs not yet in local storage.
    const merged = mergeDesignLists(localDesigns, remoteDesigns);

    writeLocalDesigns(merged);
    return merged;
  } catch {
    return localDesigns;
  }
};

export const createCanvasDesign = async (
  snapshot: CanvasDesignSnapshot,
): Promise<CanvasDesignRecord> => {
  const fallback = buildFallbackRecord(snapshot);

  try {
    const response = await API.saveTemplate(buildPersistPayload(snapshot));
    const savedResponse =
      unwrapRecords(response?.data)
        .map(normalizeDesignRecord)
        .filter((design): design is CanvasDesignRecord => Boolean(design))[0];
    // Use API response for ID and server-side metadata, but keep our canvas
    // dimensions authoritative — the API may return stale canvasDimensions.
    const merged = savedResponse ? mergeCanvasDesignRecords(savedResponse, fallback) : null;
    const saved: CanvasDesignRecord = merged
      ? { ...merged, dimension: fallback.dimension, json: { ...merged.json, canvasDimensions: fallback.json.canvasDimensions } }
      : fallback;

    upsertLocalDesign(saved);
    return saved;
  } catch {
    upsertLocalDesign(fallback);
    return fallback;
  }
};

export const updateCanvasDesign = async (
  id: string,
  snapshot: CanvasDesignSnapshot,
): Promise<CanvasDesignRecord> => {
  const existing = getExistingLocalDesign(id);
  const fallback = buildFallbackRecord(snapshot, id, existing);

  try {
    const response = await API.updateTemplate(id, buildPersistPayload(snapshot));
    const updatedResponse =
      unwrapRecords(response?.data)
        .map(normalizeDesignRecord)
        .filter((design): design is CanvasDesignRecord => Boolean(design))[0];
    // Keep our canvas dimensions authoritative; API response provides only metadata.
    const merged = updatedResponse ? mergeCanvasDesignRecords(updatedResponse, fallback) : null;
    const updated: CanvasDesignRecord = merged
      ? { ...merged, dimension: fallback.dimension, json: { ...merged.json, canvasDimensions: fallback.json.canvasDimensions } }
      : fallback;

    upsertLocalDesign(updated);
    return updated;
  } catch {
    upsertLocalDesign(fallback);
    return fallback;
  }
};

export const renameCanvasDesign = async (
  id: string,
  name: string,
): Promise<CanvasDesignRecord> => {
  const trimmedName = name.trim();
  const existing = getExistingLocalDesign(id);
  const timestamp = new Date().toISOString();
  const fallback: CanvasDesignRecord = {
    ...(existing ?? {
      id,
      dimension: undefined,
      json: {},
      name: trimmedName,
      isPublic: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    }),
    name: trimmedName,
    json: {
      ...(existing?.json ?? {}),
      name: trimmedName,
      savedAt: timestamp,
    },
    updatedAt: timestamp,
  };

  try {
    const response = await API.updateTemplate(id, {
      name: trimmedName,
      json: fallback.json,
    });
    const updatedResponse =
      unwrapRecords(response?.data)
        .map(normalizeDesignRecord)
        .filter((design): design is CanvasDesignRecord => Boolean(design))[0];
    const updated = updatedResponse
      ? mergeCanvasDesignRecords(updatedResponse, fallback)
      : fallback;

    upsertLocalDesign(updated);
    return updated;
  } catch {
    upsertLocalDesign(fallback);
    return fallback;
  }
};

export const deleteCanvasDesign = async (id: string) => {
  try {
    await API.deleteTemplate(id);
  } catch {
    // Local removal keeps CRUD usable even without the API.
  }

  removeLocalDesign(id);
};