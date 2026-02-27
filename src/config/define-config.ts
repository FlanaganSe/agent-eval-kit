import type { EvalConfig } from "./types.js";

/**
 * Identity function that provides type inference for eval config files.
 * Use in `eval.config.ts`: `export default defineConfig({ ... })`
 */
export function defineConfig(config: EvalConfig): EvalConfig {
	return config;
}
