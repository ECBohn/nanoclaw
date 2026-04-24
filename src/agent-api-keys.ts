/**
 * Agent API Keys Module
 *
 * Loads per-agent API keys from an external config file stored OUTSIDE the
 * project root (~/.config/nanoclaw/agent-api-keys.json). This prevents
 * container agents from reading or modifying the key configuration.
 *
 * Keys are injected as YELD_API_KEY environment variables into containers
 * at spawn time by container-runner.ts.
 */
import fs from 'fs';
import { AGENT_API_KEYS_PATH } from './config.js';
import { logger } from './logger.js';

interface AgentApiKeysConfig {
  keys: Record<string, string>; // agentIdentifier → API key
}

let cached: AgentApiKeysConfig | null = null;
let loadError: string | null = null;

export function loadAgentApiKeys(): AgentApiKeysConfig | null {
  if (cached !== null) return cached;
  if (loadError !== null) return null;

  try {
    if (!fs.existsSync(AGENT_API_KEYS_PATH)) {
      // Not cached as error — file may be created later
      logger.debug(
        { path: AGENT_API_KEYS_PATH },
        'Agent API keys config not found — no YELD_API_KEY will be injected',
      );
      return null;
    }

    const content = fs.readFileSync(AGENT_API_KEYS_PATH, 'utf-8');
    const config = JSON.parse(content) as AgentApiKeysConfig;

    if (!config.keys || typeof config.keys !== 'object') {
      throw new Error(
        '"keys" must be an object mapping agent identifiers to API keys',
      );
    }

    cached = config;
    logger.info(
      {
        path: AGENT_API_KEYS_PATH,
        agentCount: Object.keys(config.keys).length,
      },
      'Agent API keys loaded',
    );
    return cached;
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
    logger.error(
      { path: AGENT_API_KEYS_PATH, error: loadError },
      'Failed to load agent API keys',
    );
    return null;
  }
}

export function getAgentApiKey(agentIdentifier: string): string | null {
  const config = loadAgentApiKeys();
  if (!config) return null;
  return config.keys[agentIdentifier] ?? null;
}
