import type { RunMode } from "./types.js";

/** Canonical list of valid run modes. Single source of truth. */
export const VALID_MODES: readonly RunMode[] = ["live", "replay", "judge-only"] as const;
