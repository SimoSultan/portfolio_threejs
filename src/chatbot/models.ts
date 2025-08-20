import type { ModelConfig } from "./chatbot";

// Available models - Ollama-based
export const AVAILABLE_MODELS: Record<string, ModelConfig> = {
  // Local fallback model - works without external dependencies
  "local-fallback": {
    name: "Local Fallback (No AI)",
    modelId: "local",
    maxLength: 100,
    temperature: 0.7,
  },
  // Ollama models - will be downloaded automatically
  "gemma3:1b": {
    name: "Gemma 3 (1B)",
    modelId: "gemma3:1b",
    maxLength: 512,
    temperature: 0.7,
  },
  "qwen3:1b": {
    name: "Qwen 3 (1B)",
    modelId: "qwen3:1b",
    maxLength: 512,
    temperature: 0.7,
  },
};

// Default model to use - start with local fallback until Ollama is set up
export const DEFAULT_MODEL = "local-fallback";

// Model metadata for UI display
export interface ModelMetadata {
  id: string;
  name: string;
  description: string;
  size: string;
  speed: "fast" | "medium" | "slow";
  quality: "basic" | "good" | "excellent";
}

export const MODEL_METADATA: Record<string, ModelMetadata> = {
  "local-fallback": {
    id: "local",
    name: "Local Fallback (No AI)",
    description: "Simple responses without external model loading",
    size: "0MB",
    speed: "fast",
    quality: "basic",
  },
  "gemma3:1b": {
    id: "gemma3:1b",
    name: "Gemma 3 (1B)",
    description: "Meta's Gemma 3 model, good balance of speed and quality",
    size: "~1GB",
    speed: "medium",
    quality: "good",
  },
  "qwen3:1b": {
    id: "qwen3:1b",
    name: "Qwen 3 (1B)",
    description: "Faster version of Qwen 3, good for quick responses",
    size: "~1GB",
    speed: "fast",
    quality: "good",
  },
};
