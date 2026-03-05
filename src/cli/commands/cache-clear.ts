import { readdir, rm, stat } from "node:fs/promises";
import { confirm } from "@clack/prompts";
import { defineCommand } from "citty";
import { clearFixtures } from "../../fixtures/fixture-store.js";
import { clearJudgeCache } from "../../graders/llm/judge-disk-cache.js";
import { createLogger } from "../logger.js";
import { resolveFixtureDir } from "../resolve-fixture-dir.js";
import { globalArgs } from "../shared-args.js";

/**
 * Prompts for confirmation in TTY, requires --yes in non-TTY (CI).
 * Returns true if the action should proceed.
 */
async function requireConfirmation(message: string, yes: boolean): Promise<boolean> {
	if (yes) return true;
	if (process.stdout.isTTY) {
		return (await confirm({ message })) === true;
	}
	throw new Error("Destructive operation requires --yes flag in non-interactive environments.");
}

// biome-ignore lint/style/noDefaultExport: citty subcommands require default exports
export default defineCommand({
	meta: { name: "clear", description: "Clear fixture or judge cache" },
	args: {
		...globalArgs,
		suite: {
			type: "string" as const,
			description: "Clear fixtures for specific suite only",
		},
		judge: {
			type: "boolean" as const,
			description: "Clear judge cache only",
			default: false,
		},
		all: {
			type: "boolean" as const,
			description: "Clear all caches (fixtures + judge)",
			default: false,
		},
		yes: {
			type: "boolean" as const,
			alias: "y",
			description: "Skip confirmation prompt",
			default: false,
		},
	},
	async run({ args }) {
		const logger = createLogger(args);

		// Judge-only mode — no confirmation needed, no fixture impact
		if (args.judge && !args.all) {
			const count = await clearJudgeCache();
			logger.info(
				count > 0 ? `Cleared ${count} judge cache entries.` : "No judge cache entries found.",
			);
			return;
		}

		// --all: confirm BEFORE deleting anything (judge + fixtures are atomic)
		if (args.all) {
			if (!(await requireConfirmation("Delete all caches (judge cache + fixtures)?", args.yes))) {
				logger.info("Cancelled.");
				return;
			}

			const judgeCount = await clearJudgeCache();
			logger.info(
				judgeCount > 0
					? `Cleared ${judgeCount} judge cache entries.`
					: "No judge cache entries found.",
			);
		}

		// Safety: loadConfig (called inside resolveFixtureDir) already validates
		// that fixtureDir stays within the project root via assertSafeFixtureDir.
		const fixtureDir = await resolveFixtureDir(args.config);

		const exists = await stat(fixtureDir).catch(() => null);
		if (!exists) {
			logger.info("No fixture directory found. Nothing to clear.");
			return;
		}

		if (args.suite) {
			const count = await clearFixtures(args.suite, { baseDir: fixtureDir });
			logger.info(
				count > 0
					? `Cleared ${count} fixtures for suite '${args.suite}'.`
					: `No fixtures found for suite '${args.suite}'.`,
			);
		} else {
			// Clearing ALL fixtures — require confirmation unless already confirmed via --all
			if (
				!args.all &&
				!(await requireConfirmation(`Delete all fixtures in ${fixtureDir}?`, args.yes))
			) {
				logger.info("Cancelled.");
				return;
			}

			const entries = await readdir(fixtureDir);
			await rm(fixtureDir, { recursive: true });
			logger.info(`Cleared fixture directory (${entries.length} entries removed).`);
		}
	},
});
