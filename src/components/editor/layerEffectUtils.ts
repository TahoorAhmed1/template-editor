import type { CanvasElement } from "./EditorShell";

export const shouldUseDomEffectOverlay = (element: CanvasElement) => {
  if (element.type !== "text" && element.type !== "image") return false;

  if (element.type === "text") {
    const effect = element.effectProps;
    const hasTextShadow =
      effect?.preset === "drop-shadow" ||
      effect?.preset === "neon-glow" ||
      effect?.preset === "pulse" ||
      (effect?.shadowBlur ?? 0) > 0 ||
      Math.abs(effect?.shadowOffsetX ?? 0) > 0 ||
      Math.abs(effect?.shadowOffsetY ?? 0) > 0 ||
      (effect?.shadowOpacity ?? 0) > 0;
    const hasTextStroke = (effect?.strokeWidth ?? 0) > 0;

    return Boolean(element.textBackgroundColor || hasTextShadow || hasTextStroke);
  }

  const effect = element.effectProps;

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