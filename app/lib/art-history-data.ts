import { ART_HISTORY_PART_ONE } from "./art-history-part-one";
import { ART_HISTORY_PART_TWO } from "./art-history-part-two";

export type { ArtHistoryEntry, ArtSource } from "./art-history-shared";

export const ART_HISTORY = [
  ...ART_HISTORY_PART_ONE,
  ...ART_HISTORY_PART_TWO,
];

export function getArtHistoryEntry(slug: string) {
  return ART_HISTORY.find((entry) => entry.slug === slug);
}
