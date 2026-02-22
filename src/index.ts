import type { Plugin } from "@opencode-ai/plugin"

const CONTEXT_1M_BETA = "context-1m-2025-08-07"

/**
 * Models that support the 1M context window beta header.
 * Matched against the model ID using substring search.
 */
const DEFAULT_SUPPORTED_MODELS = [
  "opus-4-6",
  "opus-4.6",
  "sonnet-4-6",
  "sonnet-4.6",
  "sonnet-4-5",
  "sonnet-4.5",
  "sonnet-4-20250514",
]

/**
 * User-facing messages for quota errors.
 */
const QUOTA_MESSAGES: Record<string, string> = {
  "Too many tokens per day":
    "Bedrock daily token quota exhausted for this model. Switch to another region (EU/Global/US) or wait for the reset at midnight UTC.",
  "Too many requests":
    "Bedrock RPM quota exceeded. Wait a moment before retrying.",
}

export const BedrockContextPlugin: Plugin = async ({ client }) => {
  const notified = new Set<string>()

  return {
    /**
     * Inject the 1M context beta header for supported Claude models on Bedrock.
     */
    "chat.params": async (input, output) => {
      if (input.model.providerID !== "amazon-bedrock") return
      if (!input.model.id.includes("claude")) return
      if (!DEFAULT_SUPPORTED_MODELS.some(m => input.model.id.includes(m))) return

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

    /**
     * Intercept session.error events to detect Bedrock quota errors and surface them as toasts.
     */
    event: async ({ event }) => {
      const e = event as any
      if (e?.type !== "session.error") return

      const message: string = e?.properties?.error ?? e?.error ?? ""
      if (!message) return

      for (const [pattern, userMessage] of Object.entries(QUOTA_MESSAGES)) {
        if (!message.includes(pattern)) continue
        if (notified.has(pattern)) break
        notified.add(pattern)

        setTimeout(() => notified.delete(pattern), 60_000)

        await client.app.log({
          body: {
            service: "opencode-bedrock-1m",
            level: "warn",
            message: `Bedrock quota error: ${message}`,
          },
        })

        await client.event.publish({
          body: {
            type: "tui.toast.show",
            properties: {
              message: `Bedrock: ${userMessage}`,
              level: "error",
            },
          },
        })

        break
      }
    },
  }
}

export const plugin = BedrockContextPlugin
