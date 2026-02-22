# opencode-bedrock-1m

OpenCode plugin that unlocks the **1M token context window** for Claude models on AWS Bedrock, with quota error reporting.

## Problem

Claude Opus 4.6 and Sonnet 4.6/4.5 support a 1M token context window, but AWS Bedrock requires the beta header `context-1m-2025-08-07` to unlock it. Without this header, the API enforces a hard **200K input token limit**.

OpenCode currently sends this header only for `claude-sonnet-*` models. This plugin fixes the issue for all supported models and also surfaces Bedrock quota errors directly in the UI.

## Features

- Injects `anthropic-beta: context-1m-2025-08-07` for all supported Claude models on Bedrock
- Works across all inference profiles: `eu.*`, `us.*`, `global.*`
- Shows a toast notification when Bedrock quota errors occur (`Too many tokens per day`, `Too many requests`)

## Supported models

- `claude-opus-4-6` (all variants)
- `claude-sonnet-4-6` (all variants)
- `claude-sonnet-4-5` (all variants)
- `claude-sonnet-4` / `claude-sonnet-4-20250514`

## Installation

Add to your `opencode.json`:

```json
{
  "plugin": ["opencode-bedrock-1m"]
}
```

## Context limits override (recommended)

Since OpenCode may still display the wrong context limit in the UI, add these overrides to your `opencode.json`:

```json
{
  "provider": {
    "amazon-bedrock": {
      "models": {
        "eu.anthropic.claude-sonnet-4-6": { "limit": { "context": 1000000, "output": 64000 } },
        "global.anthropic.claude-sonnet-4-6": { "limit": { "context": 1000000, "output": 64000 } },
        "us.anthropic.claude-sonnet-4-6": { "limit": { "context": 1000000, "output": 64000 } },
        "eu.anthropic.claude-sonnet-4-5-20250929-v1:0": { "limit": { "context": 1000000, "output": 64000 } },
        "global.anthropic.claude-sonnet-4-5-20250929-v1:0": { "limit": { "context": 1000000, "output": 64000 } },
        "us.anthropic.claude-sonnet-4-5-20250929-v1:0": { "limit": { "context": 1000000, "output": 64000 } }
      }
    }
  }
}
```

## License

MIT
