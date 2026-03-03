import { defineCommand } from "citty";
import { ConfigError } from "../errors.js";
import { globalArgs } from "../shared-args.js";
import { executeRun } from "./run.js";

// biome-ignore lint/style/noDefaultExport: citty subcommands require default exports
export default defineCommand({
	meta: {
		name: "record",
		description: "Record fixtures (alias for: run --mode=live --record)",
	},
	args: {
		...globalArgs,
		suiteName: {
			type: "positional" as const,
			description: "Suite name to record",
			required: false,
		},
		suite: {
			type: "string" as const,
			alias: "s",
			description: "Record specific suite(s) by name",
		},
		concurrency: {
			type: "string" as const,
			description: "Max concurrent cases",
		},
		"rate-limit": {
			type: "string" as const,
			description: "Max requests per minute",
		},
	},
	async run({ args }) {
		if (args.suiteName && args.suite) {
			throw new ConfigError(
				`Ambiguous suite: positional "${args.suiteName}" and --suite="${args.suite}". Use one or the other.`,
			);
		}
		await executeRun({
			...args,
			suite: (args.suiteName as string | undefined) ?? args.suite,
			mode: "live",
			record: true,
		});
	},
});
