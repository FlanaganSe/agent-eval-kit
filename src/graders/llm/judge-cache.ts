import { createHash } from "node:crypto";
import type {
	JudgeCallFn,
	JudgeCallOptions,
	JudgeMessage,
	JudgeResponse,
} from "../../config/types.js";

/** Options for the in-memory judge cache. */
export interface JudgeCacheOptions {
	/** Maximum cache entries. Evicts oldest entry when exceeded. @default 1000 */
	readonly maxEntries?: number | undefined;
}

/**
 * Wraps a JudgeCallFn with in-memory memoization.
 *
 * Cache key: SHA-256 of (messages + model + maxTokens).
 * Only caches calls with temperature 0 (or undefined, which defaults to 0).
 * Non-zero temperature calls pass through uncached (non-deterministic).
 *
 * @example
 * ```ts
 * import { createCachingJudge, defineConfig } from "agent-eval-kit";
 *
 * const cachedJudge = createCachingJudge(myJudgeCall);
 * defineConfig({ judge: { call: cachedJudge } });
 * ```
 */
export function createCachingJudge(judge: JudgeCallFn, options?: JudgeCacheOptions): JudgeCallFn {
	const maxEntries = options?.maxEntries ?? 1000;
	const cache = new Map<string, JudgeResponse>();
	const insertOrder: string[] = [];

	return async (
		messages: readonly JudgeMessage[],
		callOptions?: JudgeCallOptions,
	): Promise<JudgeResponse> => {
		// Only cache deterministic calls (temperature 0 or undefined)
		const temperature = callOptions?.temperature ?? 0;
		if (temperature !== 0) {
			return judge(messages, callOptions);
		}

		const key = computeCacheKey(messages, callOptions);
		const cached = cache.get(key);
		if (cached) {
			return cached;
		}

		const response = await judge(messages, callOptions);

		// Evict oldest if at capacity
		if (cache.size >= maxEntries) {
			const oldest = insertOrder.shift();
			if (oldest) cache.delete(oldest);
		}

		cache.set(key, response);
		insertOrder.push(key);

		return response;
	};
}

/** Computes a SHA-256 cache key from judge messages, model, and maxTokens. Temperature is excluded since only temperature-0 calls are cached. */
export function computeCacheKey(
	messages: readonly JudgeMessage[],
	options?: JudgeCallOptions,
): string {
	const payload = JSON.stringify({
		messages: messages.map((m) => ({ role: m.role, content: m.content })),
		model: options?.model,
		maxTokens: options?.maxTokens,
	});
	return createHash("sha256").update(payload).digest("hex");
}
