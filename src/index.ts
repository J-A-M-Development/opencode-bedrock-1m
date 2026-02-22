import type { Plugin } from "@opencode-ai/plugin"

const CONTEXT_1M_BETA = "context-1m-2025-08-07"

/**
 * Models that support the 1M context window beta header.
 * Matched against the model ID using substring search.
 */
const SUPPORTED_MODELS = [
  "opus-4-6",
  "opus-4.6",
  "sonnet-4-6",
  "sonnet-4.6",
  "sonnet-4-5",
  "sonnet-4.5",
  "sonnet-4-20250514",
]

export const BedrockContextPlugin: Plugin = async ({ client }) => {
  return {
    /**
     * Inject the 1M context beta header for supported Claude models on Bedrock.
     */
    "chat.params": async (input, output) => {
      if (input.model.providerID !== "amazon-bedrock") return
      if (!input.model.id.includes("claude")) return
      if (!SUPPORTED_MODELS.some(m => input.model.id.includes(m))) return

      const existing = output.options.anthropicBeta ?? []
      if (existing.includes(CONTEXT_1M_BETA)) return

      output.options.anthropicBeta = [...existing, CONTEXT_1M_BETA]

      await client.app.log({
        body: {
          service: "opencode-bedrock-1m",
          level: "info",
          message: `1M context beta header injected for model: ${input.model.id}`,
        },
      })
    },
  }
}

export const plugin = BedrockContextPlugin
