import type { ModelConfig } from "./chatbot";

// Available models - Ollama-based
export const AVAILABLE_MODELS: Record<string, ModelConfig> = {
  // Ollama models - will be downloaded automatically
  "gemma3:1b": {
    name: "Gemma 3 (1B)",
    modelId: "gemma3:1b",
    maxLength: 512,
    temperature: 0.7,
  },
};

// Default model to use - start with gemma3:1b
export const DEFAULT_MODEL = "gemma3:1b";

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
  "gemma3:1b": {
    id: "gemma3:1b",
    name: "Gemma 3 (1B)",
    description: "Meta's Gemma 3 model, good balance of speed and quality",
    size: "~1GB",
    speed: "medium",
    quality: "good",
  },
};
