// Environment configuration for Ollama server
export interface OllamaConfig {
  environment: "local" | "remote";
  localUrl: string;
  remoteUrl: string;
  apiKey?: string;
}

// Load environment variables
const loadConfig = (): OllamaConfig => {
  // Default values
  const config: OllamaConfig = {
    environment: "local",
    localUrl: "http://localhost:11434",
    remoteUrl: "https://portfolio-server-neon-five.vercel.app", // fallback to local server
  };

  // Load from environment variables if available
  if (typeof process !== "undefined" && process.env) {
    config.environment =
      (process.env.OLLAMA_ENVIRONMENT as "local" | "remote") || "local";
    config.localUrl = process.env.OLLAMA_LOCAL_URL || "http://localhost:11434";
    config.remoteUrl = process.env.OLLAMA_REMOTE_URL || "http://localhost:8000";
    config.apiKey = process.env.OLLAMA_API_KEY;
  }

  // For browser environment, try to load from window.__ENV__ or similar
  if (typeof window !== "undefined") {
    // You can set this in your HTML or inject it from your build process
    const windowConfig = (window as any).__ENV__;
    if (windowConfig) {
      config.environment =
        windowConfig.OLLAMA_ENVIRONMENT || config.environment;
      config.localUrl = windowConfig.OLLAMA_LOCAL_URL || config.localUrl;
      config.remoteUrl = windowConfig.OLLAMA_REMOTE_URL || config.remoteUrl;
      config.apiKey = windowConfig.OLLAMA_API_KEY;
    }
  }

  console.log("Ollama config:", config);

  return config;
};

// Get the current Ollama server URL based on environment
export const getOllamaUrl = (): string => {
  const config = loadConfig();
  return config.environment === "remote" ? config.remoteUrl : config.localUrl;
};

// Get the current environment
export const getOllamaEnvironment = (): "local" | "remote" => {
  const config = loadConfig();
  return config.environment;
};

// Get API key if available
export const getOllamaApiKey = (): string | undefined => {
  const config = loadConfig();
  return config.apiKey;
};

// Export the full config for debugging
export const getOllamaConfig = (): OllamaConfig => {
  return loadConfig();
};
