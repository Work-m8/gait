import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { ConfigManager, LlmProvider, OllamaLlmProvider, OpenAILlmProvider } from '../../config/config.manager';
import { handleError } from '../../utils/error-handler';
import { GlobalOptions } from '../../types';

const configManager = new ConfigManager();

export const configCommand = new Command()
  .name('config')
  .description('Manage configuration settings')
  .addCommand(createShowCommand())
  .addCommand(createSetCommand())
  .addCommand(createAddProviderCommand())
  .addCommand(createListProvidersCommand())
  .addCommand(createRemoveProviderCommand())
  .addCommand(createSetDefaultCommand())
  .addCommand(createResetCommand());

// Show current configuration
function createShowCommand() {
  return new Command()
    .name('show')
    .description('Show current configuration')
    .option('--show-keys', 'Show masked API keys')
    .option('--path', 'Show config file path')
    .action(async (options: { showKeys?: boolean; path?: boolean }) => {
      try {
        const globalOpts = configCommand.parent?.opts() as GlobalOptions;
        const verbose = globalOpts?.verbose;

        if (options.path) {
          console.log(chalk.blue(`Config file: ${configManager.getConfigPath()}`));
          return;
        }

        const config = await configManager.getConfig();
        
        console.log(chalk.blue('🔧 Git AI Configuration\n'));
        
        console.log(chalk.cyan('📋 General Settings:'));
        console.log(chalk.cyan('─'.repeat(25)));
        console.log(chalk.blue(`Default Format: ${config.defaultFormat || 'conventional'}`));
        console.log(chalk.blue(`Max Length: ${config.maxLength || '50'}`));
        console.log(chalk.blue(`Default Provider: ${config.defaultProvider || 'None set'}`));
        
        console.log(chalk.cyan('\n🤖 LLM Providers:'));
        console.log(chalk.cyan('─'.repeat(20)));
        
        if (config.providers.length === 0) {
          console.log(chalk.yellow('   No providers configured'));
        } else {
          config.providers.forEach((provider, index) => {
            const isDefault = provider.name === config.defaultProvider;
            const defaultFlag = isDefault ? chalk.green(' [DEFAULT]') : '';
            
            console.log(chalk.blue(`${index + 1}. ${provider.name}${defaultFlag}`));
            console.log(chalk.gray(`   Type: ${provider.type}`));
            console.log(chalk.gray(`   Model: ${provider.model}`));
            
            if (provider.type === 'OPENAI' && options.showKeys) {
              const masked = provider.apiKey.slice(0, 10) + '...';
              console.log(chalk.gray(`   API Key: ${masked}`));
            } else if (provider.type === 'OLLAMA') {
              console.log(chalk.gray(`   URL: ${provider.url}`));
            }
          });
        }
        
        // Show environment variables for backward compatibility
        console.log(chalk.cyan('\n🌍 Environment Variables:'));
        console.log(chalk.cyan('─'.repeat(25)));

        if (verbose) {
          console.log(chalk.gray(`\nConfig file: ${configManager.getConfigPath()}`));
        }
    
        
      } catch (error) {
        handleError(error, undefined, true);
      }
    });
}

// Set configuration values
function createSetCommand() {
  return new Command()
    .name('set')
    .description('Set configuration values')
    .argument('<key>', 'Configuration key (defaultFormat, maxLength)')
    .argument('<value>', 'Configuration value')
    .action(async (key: string, value: string) => {
      try {
        const globalOpts = configCommand.parent?.opts() as GlobalOptions;
        
        switch (key) {
          case 'defaultFormat':
            if (!['conventional', 'simple', 'detailed'].includes(value)) {
              throw new Error('defaultFormat must be: conventional, simple, or detailed');
            }
            await configManager.setConfig('defaultFormat', value as any);
            console.log(chalk.green(`✅ Set default format to: ${value}`));
            break;
            
          case 'maxLength':
            const length = parseInt(value);
            if (isNaN(length) || length < 1 || length > 200) {
              throw new Error('maxLength must be a number between 1 and 200');
            }
            await configManager.setConfig('maxLength', length);
            console.log(chalk.green(`✅ Set max length to: ${length}`));
            break;
            
          default:
            console.log(chalk.red(`❌ Unknown configuration key: ${key}`));
            console.log(chalk.blue('Available keys: defaultFormat, maxLength'));
            process.exit(1);
        }
        
      } catch (error) {
        handleError(error, undefined, true);
      }
    });
}

// Add LLM provider
function createAddProviderCommand() {
  return new Command()
    .name('add-provider')
    .alias('add')
    .description('Add a new LLM provider')
    .option('--interactive', 'Interactive mode (default)', true)
    .option('--name <name>', 'Provider name')
    .option('--type <type>', 'Provider type (OPENAI, OLLAMA)')
    .option('--model <model>', 'Model name')
    .option('--api-key <key>', 'API key (for OpenAI)')
    .option('--url <url>', 'Server URL (for Ollama)')
    .action(async (options: {
      interactive?: boolean;
      name?: string;
      type?: string;
      model?: string;
      apiKey?: string;
      url?: string;
    }) => {
      try {
        const globalOpts = configCommand.parent?.opts() as GlobalOptions;
        
        let provider: LlmProvider;
        
        if (options.interactive || !options.name) {
          // Interactive mode
          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'name',
              message: 'Provider name:',
              default: options.name!,
              validate: (input: string) => input.trim().length > 0 || 'Name is required'
            },
            {
                type: 'list',
                name: 'type',
                message: 'Provider type:',
                choices: [
                  { name: 'OpenAI (GPT-3.5, GPT-4)', value: 'OPENAI' },
                  { name: 'Ollama (Local)', value: 'OLLAMA' }
                ],
                default: options.type
              }
          ]);
          
          if (answers.type === 'OPENAI') {
            const openaiAnswers = await inquirer.prompt([
              {
                type: 'input',
                name: 'model',
                message: 'Model name:',
                default: options.model || 'gpt-3.5-turbo',
                validate: (input: string) => input.trim().length > 0 || 'Model is required'
              },
              {
                type: 'password',
                name: 'apiKey',
                message: 'OpenAI API Key:',
                mask: '*',
                default: options.apiKey,
                validate: (input: string) => input.trim().length > 0 || 'API key is required'
              }
            ]);
            
            provider = {
              type: 'OPENAI',
              name: answers.name,
              model: openaiAnswers.model,
              apiKey: openaiAnswers.apiKey
            } as OpenAILlmProvider;
            
          } else {
            const ollamaAnswers = await inquirer.prompt([
              {
                type: 'input',
                name: 'model',
                message: 'Model name:',
                default: options.model || 'llama2',
                validate: (input: string) => input.trim().length > 0 || 'Model is required'
              },
              {
                type: 'input',
                name: 'url',
                message: 'Ollama server URL:',
                default: options.url || 'http://localhost:11434',
                validate: (input: string) => {
                  try {
                    new URL(input);
                    return true;
                  } catch {
                    return 'Please enter a valid URL';
                  }
                }
              }
            ]);
            
            provider = {
              type: 'OLLAMA',
              name: answers.name,
              model: ollamaAnswers.model,
              url: ollamaAnswers.url
            } as OllamaLlmProvider;
          }
          
        } else {
          // Non-interactive mode
          if (!options.type || !options.model) {
            throw new Error('--type and --model are required in non-interactive mode');
          }
          
          if (options.type === 'OPENAI') {
            if (!options.apiKey) {
              throw new Error('--api-key is required for OpenAI providers');
            }
            provider = {
              type: 'OPENAI',
              name: options.name,
              model: options.model,
              apiKey: options.apiKey
            } as OpenAILlmProvider;
          } else if (options.type === 'OLLAMA') {
            provider = {
              type: 'OLLAMA',
              name: options.name,
              model: options.model,
              url: options.url || 'http://localhost:11434'
            } as OllamaLlmProvider;
          } else {
            throw new Error('Provider type must be OPENAI or OLLAMA');
          }
        }
        
        await configManager.addProvider(provider);
        console.log(chalk.green(`✅ Added provider: ${provider.name}`));
        
        // Ask if this should be the default provider
        const config = await configManager.getConfig();
        if (!config.defaultProvider) {
          const setDefault = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'setAsDefault',
              message: 'Set this as the default provider?',
              default: true
            }
          ]);
          
          if (setDefault.setAsDefault) {
            await configManager.setConfig('defaultProvider', provider.name);
            console.log(chalk.green(`✅ Set as default provider`));
          }
        }
        
      } catch (error) {
        handleError(error, undefined, true);
      }
    });
}

// List providers
function createListProvidersCommand() {
  return new Command()
    .name('list-providers')
    .alias('list')
    .description('List all configured providers')
    .action(async () => {
      try {
        const config = await configManager.getConfig();
        
        console.log(chalk.blue('🤖 Configured LLM Providers\n'));
        
        if (config.providers.length === 0) {
          console.log(chalk.yellow('No providers configured'));
          console.log(chalk.blue('\nUse: git-ai config add-provider'));
          return;
        }
        
        config.providers.forEach((provider, index) => {
          const isDefault = provider.name === config.defaultProvider;
          const defaultFlag = isDefault ? chalk.green(' [DEFAULT]') : '';
          
          console.log(chalk.cyan(`${index + 1}. ${provider.name}${defaultFlag}`));
          console.log(chalk.gray(`   Type: ${provider.type}`));
          console.log(chalk.gray(`   Model: ${provider.model}`));
          
          if (provider.type === 'OLLAMA') {
            console.log(chalk.gray(`   URL: ${provider.url}`));
          }
          
          if (index < config.providers.length - 1) {
            console.log('');
          }
        });
        
      } catch (error) {
        const globalOpts = configCommand.parent?.opts() as GlobalOptions;
        handleError(error, undefined, globalOpts?.verbose);
      }
    });
}

// Remove provider
function createRemoveProviderCommand() {
  return new Command()
    .name('remove-provider')
    .alias('remove')
    .description('Remove a provider')
    .argument('[name]', 'Provider name to remove')
    .action(async (name?: string) => {
      try {
        const globalOpts = configCommand.parent?.opts() as GlobalOptions;
        const config = await configManager.getConfig();
        
        if (config.providers.length === 0) {
          console.log(chalk.yellow('No providers configured'));
          return;
        }
        
        let providerToRemove: string;
        
        if (!name) {
          // Interactive selection
          const answers = await inquirer.prompt([
            {
              type: 'list',
              name: 'provider',
              message: 'Which provider to remove?',
              choices: config.providers.map(p => ({ name: `${p.name} (${p.type})`, value: p.name }))
            }
          ]);
          providerToRemove = answers.provider;
        } else {
          providerToRemove = name;
        }
        
        // Find and remove provider
        const updatedProviders = config.providers.filter(p => p.name !== providerToRemove);
        
        if (updatedProviders.length === config.providers.length) {
          console.log(chalk.red(`❌ Provider '${providerToRemove}' not found`));
          return;
        }
        
        await configManager.setConfig('providers', updatedProviders);
        
        // Reset default if we removed the default provider
        if (config.defaultProvider === providerToRemove) {
          await configManager.setConfig('defaultProvider', '');
          console.log(chalk.yellow('⚠️  Removed default provider'));
          
          if (updatedProviders.length > 0) {
            const setNew = await inquirer.prompt([
              {
                type: 'list',
                name: 'newDefault',
                message: 'Set a new default provider?',
                choices: [
                  ...updatedProviders.map(p => ({ name: `${p.name} (${p.type})`, value: p.name })),
                  { name: 'None', value: '' }
                ]
              }
            ]);
            
            if (setNew.newDefault) {
              await configManager.setConfig('defaultProvider', setNew.newDefault);
              console.log(chalk.green(`✅ Set new default: ${setNew.newDefault}`));
            }
          }
        }
        
        console.log(chalk.green(`✅ Removed provider: ${providerToRemove}`));
        
      } catch (error) {
        const globalOpts = configCommand.parent?.opts() as GlobalOptions;
        handleError(error, undefined, globalOpts?.verbose);
      }
    });
}

// Set default provider
function createSetDefaultCommand() {
  return new Command()
    .name('set-default')
    .description('Set default provider')
    .argument('[name]', 'Provider name')
    .action(async (name?: string) => {
      try {
        const globalOpts = configCommand.parent?.opts() as GlobalOptions;
        const config = await configManager.getConfig();
        
        if (config.providers.length === 0) {
          console.log(chalk.yellow('No providers configured'));
          console.log(chalk.blue('Use: git-ai config add-provider'));
          return;
        }
        
        let defaultProvider: string;
        
        if (!name) {
          const answers = await inquirer.prompt([
            {
              type: 'list',
              name: 'provider',
              message: 'Select default provider:',
              choices: config.providers.map(p => ({ 
                name: `${p.name} (${p.type} - ${p.model})`, 
                value: p.name 
              }))
            }
          ]);
          defaultProvider = answers.provider;
        } else {
          if (!config.providers.find(p => p.name === name)) {
            console.log(chalk.red(`❌ Provider '${name}' not found`));
            return;
          }
          defaultProvider = name;
        }
        
        await configManager.setConfig('defaultProvider', defaultProvider);
        console.log(chalk.green(`✅ Set default provider: ${defaultProvider}`));
        
      } catch (error) {
        const globalOpts = configCommand.parent?.opts() as GlobalOptions;
        handleError(error, undefined, globalOpts?.verbose);
      }
    });
}

// Reset configuration
function createResetCommand() {
  return new Command()
    .name('reset')
    .description('Reset configuration to defaults')
    .option('--confirm', 'Skip confirmation prompt')
    .action(async (options: { confirm?: boolean }) => {
      try {
        const globalOpts = configCommand.parent?.opts() as GlobalOptions;
        
        if (!options.confirm) {
          const answers = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'reset',
              message: 'This will reset all configuration. Continue?',
              default: false
            }
          ]);
          
          if (!answers.reset) {
            console.log(chalk.yellow('Reset cancelled'));
            return;
          }
        }
        
        await configManager.clearConfig();
        console.log(chalk.green('✅ Configuration reset'));
        console.log(chalk.blue('Use: git-ai config add-provider to get started'));
        
      } catch (error) {
        const globalOpts = configCommand.parent?.opts() as GlobalOptions;
        handleError(error, undefined, globalOpts?.verbose);
      }
    });
}