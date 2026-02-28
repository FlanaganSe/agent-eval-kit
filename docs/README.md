# agent-evals docs

Documentation site for [agent-evals](https://github.com/FlanaganSe/agent-evals), built with [Astro Starlight](https://starlight.astro.build/).

## Development

```bash
pnpm install
pnpm dev        # Start dev server
pnpm build      # Production build
pnpm preview    # Preview production build
```

## Structure

Content lives in `src/content/docs/` as `.mdx` files:

```
src/content/docs/
├── index.mdx                   # Landing page
├── getting-started/
│   ├── installation.mdx
│   ├── quick-start.mdx
│   └── concepts.mdx
├── guides/
│   ├── record-replay.mdx
│   ├── graders.mdx
│   ├── llm-judge.mdx
│   ├── ci-integration.mdx
│   ├── watch-mode.mdx
│   └── plugins.mdx
├── reference/
│   ├── cli.mdx
│   ├── config.mdx
│   ├── graders-api.mdx
│   ├── reporters.mdx
│   └── plugin-api.mdx
└── advanced/
    ├── mcp-server.mdx
    ├── custom-graders.mdx
    └── statistics.mdx
```

Sidebar order and labels are configured in `astro.config.mjs`.
