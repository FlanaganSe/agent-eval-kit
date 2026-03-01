import { defineCommand } from "citty";

// biome-ignore lint/style/noDefaultExport: citty subcommands require default exports
export default defineCommand({
	meta: { name: "mcp", description: "Start MCP server for AI assistant integration" },
	async run() {
		// Dynamic import to keep MCP SDK out of the main import path
		const { startMcpServer } = await import("../../mcp/server.js");
		await startMcpServer();
	},
});
