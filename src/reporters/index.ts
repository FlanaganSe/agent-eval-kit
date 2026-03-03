// Format functions
export {
	type ConsoleReportOptions,
	formatConsoleReport,
	formatMarkdownSummary,
} from "./console.js";
export { formatJsonReport } from "./json.js";
export { formatJunitXml } from "./junit.js";
export { formatMarkdownReport } from "./markdown.js";
// Progress
export { createProgressPlugin, type ProgressPluginOptions } from "./progress-plugin.js";
// Registry
export { resolveReporter } from "./registry.js";
// Types
export type { ReporterOptions, ReporterPlugin } from "./types.js";
