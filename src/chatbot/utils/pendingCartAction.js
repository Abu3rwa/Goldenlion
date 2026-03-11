import { normalizeSearchText, toAsciiDigits } from "./parseCartIntent";

const YES_VALUES = ["yes", "y", "confirm", "ok", "okay", "sure", "نعم", "ايوه", "أي", "اكيد", "أكيد", "تمام", "موافق"];
const NO_VALUES = ["no", "n", "cancel", "stop", "never mind", "إلغاء", "الغاء", "لا", "خلاص", "وقف"];

export const isAffirmativeMessage = (value = "") => {
  const normalized = normalizeSearchText(value);
  return YES_VALUES.some((token) => normalized === normalizeSearchText(token));
};

export const isCancelMessage = (value = "") => {
  const normalized = normalizeSearchText(value);
  return NO_VALUES.some((token) => normalized === normalizeSearchText(token));
};

export const resolvePendingSelection = (value = "", candidates = []) => {
  const normalized = normalizeSearchText(value);
  const asNumber = Number.parseInt(toAsciiDigits(normalized), 10);
  if (Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= candidates.length) {
    return candidates[asNumber - 1] || null;
  }

  const exact = candidates.find((candidate) => {
    const candidateLabel = normalizeSearchText(candidate.displayName || candidate.name || "");
    return candidateLabel && candidateLabel === normalized;
  });
  if (exact) {
    return exact;
  }

  const partial = candidates.filter((candidate) => {
    const candidateLabel = normalizeSearchText(candidate.displayName || candidate.name || "");
    return candidateLabel && (candidateLabel.includes(normalized) || normalized.includes(candidateLabel));
  });

  return partial.length === 1 ? partial[0] : null;
};
