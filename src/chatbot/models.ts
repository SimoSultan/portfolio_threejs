import type { ModelConfig } from "./chatbot";

// Available models - easy to swap and add new ones
export const AVAILABLE_MODELS: Record<string, ModelConfig> = {
  "qwen-0.5b": {
    name: "Qwen2.5-0.5B-Instruct",
    url: "Xenova/Qwen2.5-0.5B-Instruct",
    maxLength: 512,
    temperature: 0.7,
  },
  "qwen-1.5b": {
    name: "Qwen2.5-1.5B-Instruct",
    url: "Xenova/Qwen2.5-1.5B-Instruct",
    maxLength: 512,
    temperature: 0.7,
  },
  "llama-1b": {
    name: "Llama-3.2-1B-Instruct",
    url: "Xenova/Llama-3.2-1B-Instruct",
    maxLength: 512,
    temperature: 0.7,
  },
};

// Default model to use
export const DEFAULT_MODEL = "qwen-0.5b";

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
  "qwen-0.5b": {
    id: "qwen-0.5b",
    name: "Qwen2.5-0.5B-Instruct",
    description: "Fast, lightweight model for quick responses",
    size: "~200MB",
    speed: "fast",
    quality: "basic",
  },
  "qwen-1.5b": {
    id: "qwen-1.5b",
    name: "Qwen2.5-1.5B-Instruct",
    description: "Balanced speed and quality",
    size: "~600MB",
    speed: "medium",
    quality: "good",
  },
  "llama-1b": {
    id: "llama-1b",
    name: "Llama-3.2-1B-Instruct",
    description: "Meta's lightweight instruction model",
    size: "~500MB",
    speed: "medium",
    quality: "good",
  },
};
