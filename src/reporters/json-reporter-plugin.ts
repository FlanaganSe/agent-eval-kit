import { writeFile } from "node:fs/promises";
import { formatJsonReport } from "./json.js";
import type { ReporterPlugin } from "./types.js";

export const jsonReporterPlugin: ReporterPlugin = {
	name: "json",
	report: async (run, options) => {
		const json = formatJsonReport(run);
		if (options.output) {
			await writeFile(options.output, json, "utf-8");
			return undefined;
		}
		return json;
	},
};
