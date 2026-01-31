/**
 * Ollama API types
 */

/**
 * Ollama generate request
 */
export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: OllamaOptions;
  system?: string;
  template?: string;
  context?: number[];
  raw?: boolean;
  format?: 'json';
}

/**
 * Ollama model options
 */
export interface OllamaOptions {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  num_predict?: number;
  stop?: string[];
  seed?: number;
  num_ctx?: number;
  repeat_penalty?: number;
}

/**
 * Ollama generate response (non-streaming)
 */
export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

/**
 * Ollama API error
 */
export interface OllamaError {
  error: string;
}

/**
 * Ollama model info from /api/tags
 */
export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
}

/**
 * Response from /api/tags endpoint
 */
export interface OllamaTagsResponse {
  models: OllamaModel[];
}

/**
 * Ollama client configuration
 */
export interface OllamaConfig {
  baseUrl: string;
  model: string;
  timeout: number;
  defaultOptions: OllamaOptions;
}

export const DEFAULT_OLLAMA_CONFIG: OllamaConfig = {
  baseUrl: 'http://localhost:11434',
  model: 'qwen2.5:32b',
  timeout: 120000, // 2 minutes for large model
  defaultOptions: {
    temperature: 0.1,
    top_p: 0.9,
    num_predict: 2048,
  },
};
