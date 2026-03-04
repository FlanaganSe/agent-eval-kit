import type { Run, Trial } from "../config/types.js";
import type { AfterTrialContext, BeforeRunContext, EvalPlugin } from "./types.js";

export interface HookDispatcher {
	readonly beforeRun: (context: BeforeRunContext) => Promise<void>;
	readonly afterTrial: (trial: Trial, context: AfterTrialContext) => Promise<void>;
	readonly afterRun: (run: Run) => Promise<void>;
}

/**
 * Creates a hook dispatcher from registered plugins.
 * Hooks execute sequentially in plugin registration order.
 * afterTrial and afterRun errors are logged and swallowed (non-breaking).
 * beforeRun errors propagate (breaking).
 */
export function createHookDispatcher(
	plugins: readonly EvalPlugin[],
	logger?: { readonly warn: (msg: string) => void },
): HookDispatcher {
	const beforeRunHooks = plugins.flatMap((p) =>
		p.hooks?.beforeRun ? [{ name: p.name, hook: p.hooks.beforeRun }] : [],
	);

	const afterTrialHooks = plugins.flatMap((p) =>
		p.hooks?.afterTrial ? [{ name: p.name, hook: p.hooks.afterTrial }] : [],
	);

	const afterRunHooks = plugins.flatMap((p) =>
		p.hooks?.afterRun ? [{ name: p.name, hook: p.hooks.afterRun }] : [],
	);

	return {
		async beforeRun(context) {
			for (const { hook } of beforeRunHooks) {
				await hook(context);
			}
		},

		async afterTrial(trial, context) {
			for (const { name, hook } of afterTrialHooks) {
				try {
					await hook(trial, context);
				} catch (error) {
					logger?.warn(
						`Plugin '${name}' afterTrial hook failed: ${error instanceof Error ? error.message : String(error)}`,
					);
				}
			}
		},

		async afterRun(run) {
			for (const { name, hook } of afterRunHooks) {
				try {
					await hook(run);
				} catch (error) {
					logger?.warn(
						`Plugin '${name}' afterRun hook failed: ${error instanceof Error ? error.message : String(error)}`,
					);
				}
			}
		},
	};
}
