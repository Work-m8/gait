import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { GitManager } from '../../git/git-manager';
import { CommitMessageGenerator } from '../../git/commit-generator';

import { CommitFormat } from '../../types';
import { handleError } from '../../utils/error-handler';
import { createGitAgent } from '../../mastra/agents/git-agent';
import { ConfigManager } from '../../config/config.manager';

export interface CommitCommandOptions {
    stagedOnly?: boolean;
    files?: string;
    dryRun?: boolean;
    interactive?: boolean;
    format?: CommitFormat;
    maxLength?: string;
}

export const commitCommand = new Command()
  .name('commit')
  .alias('c')
  .description('Generate commit message and create commit')
  .option('-s, --staged-only', 'Only commit staged changes')
  .option('-f, --files <files>', 'Comma-separated list of files to commit')
  .option('-n, --dry-run', 'Show what would be committed without committing')
  .option('-i, --interactive', 'Review and edit message before committing')
  .option('--format <type>', 'Message format: conventional, simple, detailed', 'conventional')
  .option('--skip-validation', 'Skip commit message validation')
  .action(async (options: CommitCommandOptions & { 
    format?: string;
    skipValidation?: boolean;
  }) => {
    const spinner = ora('Analyzing repository...').start();
    
    const format = options.format || 'conventional';
    const maxLength = options.maxLength || '5000';

    try {
        const repoPath = commitCommand.opts().repo;
        const verbose = commitCommand.opts().verbose;
  
        const configManager = new ConfigManager()
        const provider = await configManager.getDefaultProvider();

        const gitAgent = createGitAgent(provider!);

        const gitManager = new GitManager(repoPath);
        const generator = new CommitMessageGenerator(gitManager, gitAgent);
  
        // Check for changes
        const status = await gitManager.getStatus();
        if (!status.hasChanges()) {
            spinner.fail('No changes detected in repository');
            process.exit(1);
        }
  
        if (verbose) {
            spinner.info(`Repository: ${repoPath}`);
            spinner.info(`Staged only: ${options.stagedOnly}`);
            if (options.files) {
                spinner.info(`Files: ${options.files}`);
            }
        }
  
        spinner.text = 'Generating commit message...';
  
        let message = await generator.generateCommitMessage({
            format: format,
            maxLength: parseInt(maxLength)
        });
 
        spinner.succeed('Generated commit message:');
        console.log('\n' + chalk.cyan('─'.repeat(60)));
        console.log(chalk.white(message));
        console.log(chalk.cyan('─'.repeat(60)) + '\n');
  
        // Interactive mode
        if (options.interactive) {
            const answers = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'action',
                    message: 'What would you like to do?',
                    choices: [
                        { name: 'Use this message', value: 'use' },
                        { name: 'Edit message', value: 'edit' },
                        { name: 'Cancel', value: 'cancel' }
                    ]
                }
            ]);
    
            if (answers.action === 'cancel') {
                console.log(chalk.yellow('Commit cancelled.'));
                process.exit(0);
            } else if (answers.action === 'edit') {
                const editAnswer = await inquirer.prompt([
                    {
                        type: 'editor',
                        name: 'message',
                        message: 'Edit your commit message:',
                        default: message
                    }
                ]);
              message = editAnswer.message.trim();
            }
        }
  
        // Dry run
        if (options.dryRun) {
            console.log(chalk.blue('🔍 DRY RUN: Would create commit with message above'));
            process.exit(0);
        }
  
        // Perform commit
        const commitSpinner = ora('Creating commit...').start();
  
        let commitHash;
        if (options.stagedOnly) {
            commitHash = await gitManager.commitStaged(message);
            commitSpinner.succeed(`Created commit (staged changes): ${chalk.green(commitHash.substring(0, 8))}`);
        } else if (options.files) {
            const files = options.files.split(',').map(f => f.trim());
            commitHash = await gitManager.commitFiles(message, files);
            commitSpinner.succeed(`Created commit with files: ${chalk.green(commitHash.substring(0, 8))}`);
        } else {
            commitHash = await gitManager.commitAll(message);
            commitSpinner.succeed(`Created commit (all changes): ${chalk.green(commitHash.substring(0, 8))}`);
        }
  
    } catch (error) {
        spinner.fail(`Error: ${(error as any).message}`);
        if (commitCommand.opts().verbose) {
            console.error((error as any).stack);
        }
        handleError(error, spinner, true);

    }
  });