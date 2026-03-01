#!/usr/bin/env node
import("../dist/cli/index.js").catch((error) => {
	process.stderr.write(`agent-eval-kit: ${error.message}\n`);
	process.exitCode = 1;
});
