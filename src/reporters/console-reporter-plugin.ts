import { writeFile } from "node:fs/promises";
import { formatConsoleReport } from "./console.js";
import type { ReporterPlugin } from "./types.js";

export const consoleReporterPlugin: ReporterPlugin = {
	name: "console",
	report: async (run, options) => {
		const report = formatConsoleReport(run, {
			color: options.color,
			verbose: options.verbose,
		});
		if (options.output) {
			await writeFile(options.output, report, "utf-8");
			return undefined;
		}
		return report;
	},
};
