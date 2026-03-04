/** Token bucket rate limiter for throttling target calls. */
export interface RateLimiter {
	/** Acquire a token. Resolves when a request slot is available. Supports AbortSignal for cancellation. */
	readonly acquire: (signal?: AbortSignal) => Promise<void>;
	/** Release resources (clear timers, reject pending acquisitions). */
	readonly dispose: () => void;
}

/** Options for creating a token bucket rate limiter. */
export interface TokenBucketOptions {
	/** Maximum number of target calls allowed per minute. */
	readonly maxRequestsPerMinute: number;
}

/** Creates a token bucket rate limiter that spaces target calls at fixed intervals. Queued acquisitions are processed FIFO. Call `dispose()` to clear timers and reject pending acquisitions. */
export function createTokenBucketLimiter(options: TokenBucketOptions): RateLimiter {
	const intervalMs = 60_000 / options.maxRequestsPerMinute;
	let lastRelease = 0;
	const queue: Array<{
		readonly resolve: () => void;
		readonly reject: (err: Error) => void;
	}> = [];
	let timer: ReturnType<typeof setInterval> | undefined;

	function processQueue(): void {
		const now = Date.now();
		if (queue.length === 0) return;
		if (now - lastRelease < intervalMs) return;

		const next = queue.shift();
		if (next) {
			lastRelease = now;
			next.resolve();
		}
	}

	timer = setInterval(processQueue, Math.max(10, intervalMs / 2));

	return {
		acquire(signal?: AbortSignal): Promise<void> {
			if (signal?.aborted) {
				return Promise.reject(new Error("Rate limiter acquire aborted"));
			}

			const now = Date.now();
			if (now - lastRelease >= intervalMs && queue.length === 0) {
				lastRelease = now;
				return Promise.resolve();
			}

			return new Promise<void>((resolve, reject) => {
				let onAbort: (() => void) | undefined;

				const wrappedResolve = (): void => {
					if (signal && onAbort) signal.removeEventListener("abort", onAbort);
					resolve();
				};
				const wrappedReject = (err: Error): void => {
					if (signal && onAbort) signal.removeEventListener("abort", onAbort);
					reject(err);
				};

				const entry = { resolve: wrappedResolve, reject: wrappedReject };

				if (signal) {
					onAbort = (): void => {
						const idx = queue.indexOf(entry);
						if (idx !== -1) {
							queue.splice(idx, 1);
							wrappedReject(new Error("Rate limiter acquire aborted"));
						}
					};
					signal.addEventListener("abort", onAbort, { once: true });
				}

				queue.push(entry);
			});
		},

		dispose(): void {
			if (timer !== undefined) {
				clearInterval(timer);
				timer = undefined;
			}
			for (const entry of queue) {
				entry.reject(new Error("Rate limiter disposed"));
			}
			queue.length = 0;
		},
	};
}
