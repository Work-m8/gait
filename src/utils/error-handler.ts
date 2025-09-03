import chalk from 'chalk';
import { AIServiceError, GitError, GitAIError } from '../types';

/**
 * Centralized error handling for CLI commands
 */
export function handleError(error: unknown, spinner?: any, verbose?: boolean): never {
  if (spinner) {
    spinner.stop();
  }
  
  if (error instanceof AIServiceError) {
    console.error(chalk.red(`❌ AI Service Error (${error.provider}): ${error.message}`));
    
    // Specific AI error suggestions
    if (error.message.includes('API key')) {
      console.error(chalk.yellow('   💡 Set your API key: export OPENAI_API_KEY="your-key"'));
    } else if (error.message.includes('quota') || error.message.includes('billing')) {
      console.error(chalk.yellow('   💡 Check your API billing and usage limits'));
    } else if (error.message.includes('rate limit')) {
      console.error(chalk.yellow('   💡 You are being rate limited. Wait and try again'));
    } else if (error.message.includes('timeout')) {
      console.error(chalk.yellow('   💡 Request timed out. Check your connection or try again'));
    }
    
  } else if (error instanceof GitError) {
    console.error(chalk.red(`❌ Git Error: ${error.message}`));
    
    // Specific Git error suggestions
    if (error.message.includes('not a git repository')) {
      console.error(chalk.yellow('   💡 Run "git init" to initialize a repository'));
    } else if (error.message.includes('nothing to commit')) {
      console.error(chalk.yellow('   💡 Make some changes first, then try again'));
    } else if (error.message.includes('no changes')) {
      console.error(chalk.yellow('   💡 Use "git add" to stage your changes'));
    }
    
  } else if (error instanceof GitAIError) {
    console.error(chalk.red(`❌ Error: ${error.message}`));
    
  } else if (error instanceof Error) {
    console.error(chalk.red(`❌ Unexpected Error: ${error.message}`));
    
    // General error type suggestions
    if (error.message.includes('ENOENT')) {
      console.error(chalk.yellow('   💡 File or directory not found'));
    } else if (error.message.includes('EACCES')) {
      console.error(chalk.yellow('   💡 Permission denied. Check file permissions'));
    } else if (error.message.includes('ENOTDIR')) {
      console.error(chalk.yellow('   💡 Expected a directory but found a file'));
    }
    
  } else {
    console.error(chalk.red('❌ Unknown error occurred'));
  }
  
  // Show stack trace in verbose mode
  if (verbose && error instanceof Error) {
    console.error(chalk.gray('\nStack trace:'));
    console.error(chalk.gray(error.stack || 'No stack trace available'));
  }
  
  // Show additional help
  if (!verbose) {
    console.error(chalk.gray('\nUse --verbose for more details'));
  }
  
  process.exit(1);
}

/**
 * Handle specific command errors with context
 */
export function handleCommandError(
  commandName: string,
  error: unknown,
  spinner?: any,
  verbose?: boolean
): never {
  if (spinner) {
    spinner.fail(`${commandName} command failed`);
  }
  
  console.error(chalk.red(`\n❌ ${commandName} command failed:`));
  
  // Add command-specific context
  switch (commandName.toLowerCase()) {
    case 'generate':
      console.error(chalk.yellow('   💡 Make sure you have uncommitted changes to analyze'));
      break;
    case 'commit':
      console.error(chalk.yellow('   💡 Ensure you have changes to commit and AI service is configured'));
      break;
    case 'status':
      console.error(chalk.yellow('   💡 Make sure you are in a Git repository'));
      break;
  }
  
  handleError(error, undefined, verbose);
}

/**
 * Validate prerequisites before running commands
 */
export async function validatePrerequisites(
  gitManager: any,
  aiService?: any,
  requireChanges: boolean = false
): Promise<void> {
  // Check Git repository
  if (!(await gitManager.isRepository())) {
    throw new GitError('Not a Git repository. Run "git init" to initialize.');
  }
  
  // Check for changes if required
  if (requireChanges) {
    const status = await gitManager.getStatus();
    if (!status.hasChanges()) {
      throw new GitError('No changes detected. Make some changes first.');
    }
  }
  
  // Check AI service if provided
  if (aiService && !aiService.isConfigured()) {
    throw new AIServiceError(
      'AI service not configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable.',
      aiService.getProvider()
    );
  }
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: string[]): string {
  if (errors.length === 0) return '';
  
  return errors.map(error => `   • ${error}`).join('\n');
}

/**
 * Format suggestions for display
 */
export function formatSuggestions(suggestions: Array<{type: string, message: string}>): string {
  if (suggestions.length === 0) return '';
  
  return suggestions.map(suggestion => {
    const icon = suggestion.type === 'error' ? '❌' : 
                suggestion.type === 'warning' ? '⚠️' : 'ℹ️';
    return `   ${icon} ${suggestion.message}`;
  }).join('\n');
}