import type { CanvasElement } from "./EditorShell";

export const shouldUseDomEffectOverlay = (element: CanvasElement) => {
  if (element.type !== "text" && element.type !== "image") return false;

  const effect = element.effectProps;

  if (element.type === "text" && element.textBackgroundColor) {
    return true;
  }

  if (element.type === "image") {
    const hasImageAdjustments =
      (element.brightness ?? 50) !== 50 ||
      (element.contrast ?? 50) !== 50 ||
      (element.vibrance ?? 50) !== 50 ||
      (element.saturation ?? 50) !== 50 ||
      (element.blur ?? 0) > 0 ||
      (element.invert ?? 0) > 0 ||
      Boolean(element.blackAndWhite) ||
      Boolean(element.sepiaEnabled) ||
      Boolean(element.removeColorEnabled) ||
      Boolean(element.tintEnabled) ||
      Boolean(element.gammaEnabled) ||
      Boolean(element.roundnessEnabled) ||
      (element.borderRadius ?? 0) > 0 ||
      (element.borderWidth ?? 0) > 0 ||
      (element.maskShape && element.maskShape !== "none");

    if (hasImageAdjustments) {
      return true;
    }
  }

  if (!effect) return false;

  return (
    effect.preset !== "none" ||
    effect.blendMode !== "normal" ||
    effect.strokeWidth > 0
  );
};