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
     * Intercept message updates to detect Bedrock quota errors and surface them as toasts.
     * session.error is not triggered for retryable errors — message.updated is more reliable.
     */
    "message.updated": async ({ message }) => {
      if (!message) return

      const parts = (message as any).parts ?? []
      for (const part of parts) {
        const text: string = part?.text ?? part?.error ?? ""
        if (!text) continue

        for (const [pattern, userMessage] of Object.entries(QUOTA_MESSAGES)) {
          if (!text.includes(pattern)) continue

          const key = `${message.id}:${pattern}`
          if (notified.has(key)) break
          notified.add(key)

          await client.app.log({
            body: {
              service: "opencode-bedrock-1m",
              level: "warn",
              message: `Bedrock quota error: ${text}`,
            },
          })

          await client.event.publish({
            body: {
              type: "tui.toast.show",
              properties: {
                message: `Bedrock quota: ${userMessage}`,
                level: "error",
              },
            },
          })

          break
        }
      }
    },
  }
}

export const plugin = BedrockContextPlugin
