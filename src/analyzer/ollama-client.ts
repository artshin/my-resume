/**
 * Ollama API client for LLM-based job description analysis
 */

import type {
  OllamaConfig,
  OllamaGenerateRequest,
  OllamaGenerateResponse,
  OllamaTagsResponse,
} from '../types/index.js';
import { DEFAULT_OLLAMA_CONFIG } from '../types/index.js';

export interface OllamaClientOptions {
  baseUrl?: string;
  model?: string;
  timeout?: number;
}

export interface HealthCheckResult {
  available: boolean;
  modelLoaded: boolean;
  modelName?: string;
  error?: string;
}

/**
 * Ollama API client wrapper
 */
export class OllamaClient {
  private config: OllamaConfig;

  constructor(options: OllamaClientOptions = {}) {
    this.config = {
      ...DEFAULT_OLLAMA_CONFIG,
      baseUrl: options.baseUrl ?? process.env.OLLAMA_URL ?? DEFAULT_OLLAMA_CONFIG.baseUrl,
      model: options.model ?? process.env.OLLAMA_MODEL ?? DEFAULT_OLLAMA_CONFIG.model,
      timeout: options.timeout ?? DEFAULT_OLLAMA_CONFIG.timeout,
    };
  }

  /**
   * Check if Ollama is available and the required model is loaded
   */
  async healthCheck(): Promise<HealthCheckResult> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return {
          available: false,
          modelLoaded: false,
          error: `Ollama returned status ${response.status}`,
        };
      }

      const data = (await response.json()) as OllamaTagsResponse;
      const models = data.models || [];
      const modelBase = this.config.model.split(':')[0] ?? this.config.model;
      const hasModel = models.some(
        (m) => m.name === this.config.model || m.name.startsWith(modelBase)
      );

      return {
        available: true,
        modelLoaded: hasModel,
        modelName: hasModel ? this.config.model : undefined,
        error: hasModel ? undefined : `Model "${this.config.model}" not found`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        available: false,
        modelLoaded: false,
        error: message,
      };
    }
  }

  /**
   * Generate a response from Ollama
   */
  async generate(prompt: string, options?: Partial<OllamaGenerateRequest>): Promise<string> {
    const request: OllamaGenerateRequest = {
      model: this.config.model,
      prompt,
      stream: false,
      format: 'json',
      options: {
        ...this.config.defaultOptions,
        ...options?.options,
      },
      ...options,
    };

    const response = await fetch(`${this.config.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama request failed: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as OllamaGenerateResponse;
    return data.response;
  }

  /**
   * Generate with retry logic
   */
  async generateWithRetry(
    prompt: string,
    options?: Partial<OllamaGenerateRequest>,
    maxRetries = 2
  ): Promise<string> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.generate(prompt, options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on certain errors
        if (lastError.message.includes('not found') || lastError.message.includes('401')) {
          throw lastError;
        }

        if (attempt < maxRetries) {
          // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
      }
    }

    throw lastError ?? new Error('Generate failed after retries');
  }

  get modelName(): string {
    return this.config.model;
  }

  get baseUrl(): string {
    return this.config.baseUrl;
  }
}

/**
 * Create a singleton client instance
 */
let defaultClient: OllamaClient | undefined;

export function getOllamaClient(options?: OllamaClientOptions): OllamaClient {
  if (!defaultClient || options) {
    defaultClient = new OllamaClient(options);
  }
  return defaultClient;
}
