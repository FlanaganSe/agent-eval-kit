import type { GraderFn, Run } from "../config/types.js";

/**
 * Plugin interface — stub for Phase 5.
 * Plugins are plain objects, no inheritance.
 */
export interface EvalPlugin {
	readonly name: string;
	readonly graders?: Record<string, GraderFn>;
	readonly beforeRun?: (context: { readonly suiteId: string }) => Promise<void>;
	readonly afterRun?: (run: Run) => Promise<void>;
}
