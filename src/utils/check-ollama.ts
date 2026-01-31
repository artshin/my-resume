/**
 * Ollama health check utility
 * Run with: pnpm check-ollama
 */

import { DEFAULT_OLLAMA_CONFIG } from '../types/index.js';

interface HealthCheckResult {
  available: boolean;
  modelLoaded: boolean;
  modelName?: string;
  error?: string;
}

async function checkOllama(): Promise<HealthCheckResult> {
  const baseUrl = process.env.OLLAMA_URL || DEFAULT_OLLAMA_CONFIG.baseUrl;
  const model = process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_CONFIG.model;

  console.log(`Checking Ollama at ${baseUrl}...`);
  console.log(`Required model: ${model}\n`);

  // Check if Ollama is running
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
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

    const data = (await response.json()) as { models?: { name: string }[] };
    const models = data.models || [];

    console.log(`✓ Ollama is running`);
    console.log(`  Available models: ${models.length}`);

    // Check if required model is available
    const modelBase = model.split(':')[0] ?? model;
    const hasModel = models.some(
      (m: { name: string }) => m.name === model || m.name.startsWith(modelBase)
    );

    if (hasModel) {
      console.log(`✓ Model "${model}" is available`);
      return {
        available: true,
        modelLoaded: true,
        modelName: model,
      };
    } else {
      console.log(`✗ Model "${model}" is NOT available`);
      console.log(`\n  To install it, run:`);
      console.log(`  ollama pull ${model}`);
      console.log(`\n  Available models:`);
      models.forEach((m: { name: string }) => {
        console.log(`    - ${m.name}`);
      });
      return {
        available: true,
        modelLoaded: false,
        error: `Model "${model}" not found`,
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('ECONNREFUSED') || message.includes('fetch failed')) {
      console.log(`✗ Ollama is not running`);
      console.log(`\n  To start Ollama, run:`);
      console.log(`  ollama serve`);
      console.log(`\n  Then pull the required model:`);
      console.log(`  ollama pull ${model}`);
    } else {
      console.log(`✗ Error connecting to Ollama: ${message}`);
    }

    return {
      available: false,
      modelLoaded: false,
      error: message,
    };
  }
}

// Run if executed directly
const result = await checkOllama();
process.exit(result.available && result.modelLoaded ? 0 : 1);
