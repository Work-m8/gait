import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export interface Config {
  defaultFormat?: 'conventional' | 'simple' | 'detailed';
  maxLength?: number;
  providers: LlmProvider[];
  defaultProvider: string;
}

interface BaseLlmProvider {
    type: string;
    model: string;
    name: string;
}

export interface OllamaLlmProvider extends BaseLlmProvider {
    type: 'OLLAMA'
    url: string;
}

export interface OpenAILlmProvider extends BaseLlmProvider {
    type: 'OPENAI'
    apiKey: string;
}

export type LlmProvider = OllamaLlmProvider | OpenAILlmProvider;

export class ConfigManager {
  private configPath: string;

  constructor() {
    // Store config in user's home directory
    this.configPath = path.join(os.homedir(), '.gait', 'config.json');
  }


  /**
   * Get configuration
   */
  async getConfig(): Promise<Config> {
    try {
      const configDir = path.dirname(this.configPath);
      
      // Check if config file exists
      try {
        await fs.access(this.configPath);
      } catch {
        const config: Config = {
            providers: [],
            defaultProvider: ''
        }
        // Create config directory and file if they don't exist
        await fs.mkdir(configDir, { recursive: true });
        await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
        return config;
      }

      const configContent = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(configContent);
    } catch (error) {
      console.warn('Failed to read config file, using defaults');
      return {
        providers: [],
        defaultProvider: ''
      };
    }
  }

  /**
   * Set configuration value
   */
  async setConfig<K extends keyof Config>(key: K, value: Config[K]): Promise<void> {
    const config = await this.getConfig();
    config[key] = value;
    
    // Ensure config directory exists
    const configDir = path.dirname(this.configPath);
    await fs.mkdir(configDir, { recursive: true });
    
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
  }

  /**
   * Get OpenAI API key from config or environment
   */
  async getLlmProviders(): Promise<LlmProvider[]> {
    const config = await this.getConfig();
    
    return config.providers;
  }

   /**
   * Get the default provider
   * Returns the configured default provider, or the first available provider if no default is set,
   * or null if no providers are configured
   */
   async getDefaultProvider(): Promise<LlmProvider | null> {
        const config = await this.getConfig();
    
        // No providers configured
        if (config.providers.length === 0) {
            return null;
        }
    
        // Look for explicitly set default provider
        if (config.defaultProvider) {
            const defaultProvider = config.providers.find(p => p.name === config.defaultProvider);
            if (defaultProvider) {
                return defaultProvider;
            }
        // Default provider name exists but provider not found - fall through to first available
        }
    
        // Return first available provider if no valid default is set
        return config.providers[0]!;
    }

  async addProvider(provider: LlmProvider): Promise<void> {
    const config = await this.getConfig();

    const providers = [
        ...config.providers,
        provider
    ];

    this.setConfig('providers', providers);
  }

  /**
   * Remove configuration
   */
  async removeConfig(key: keyof Config): Promise<void> {
    const config = await this.getConfig();
    delete config[key];
    
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
  }

  /**
   * Clear all configuration
   */
  async clearConfig(): Promise<void> {
    await fs.writeFile(this.configPath, JSON.stringify({}, null, 2));
  }

  /**
   * Get config file path for display
   */
  getConfigPath(): string {
    return this.configPath;
  }
}