#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import dotenv from 'dotenv';
import { GitManager } from './git/git-manager';
import { CommitMessageGenerator } from './git/commit-generator';

import { gitAgent } from './mastra/agents/git-agent';

// Load environment variables
dotenv.config();

const program = new Command();

export type CommitFormat = 'conventional' | 'simple' | 'detailed';


// CLI Command Options
export interface GenerateCommandOptions {
    format: CommitFormat;
    maxLength: string;
}

export interface CommitCommandOptions {
    stagedOnly?: boolean;
    files?: string;
    dryRun?: boolean;
    interactive?: boolean;
}

export interface StatusCommandOptions {
    showDiff?: boolean;
}

program
    .name('gait')
    .description('Gait, your Git Commit message generator')
    .version('1.0.0')
    .option('-r, --repo <path>', 'Repository path', '.')
    .option('-v, --verbose', 'Enable verbose output');

// Generate command
program
    .command('generate')
    .alias('gen')
    .alias('g')
    .description('Generate commit message without committing')
    .option('--format <type>', 'Message format: conventional, simple, detailed', 'conventional')
    .option('--max-length <number>', 'Maximum message length', '72')
    .action(async (options: GenerateCommandOptions) => {
        const spinner = ora('Analyzing repository changes...').start();
    
        try {
            const repoPath = program.opts().repo;
            const verbose = program.opts().verbose;
      
            if (verbose) {
                spinner.info(`Repository: ${repoPath}`);
                spinner.info(`Format: ${options.format}`);
                spinner.info(`Max length: ${options.maxLength}`);
            }
      
            const gitManager = new GitManager(repoPath);
            const generator = new CommitMessageGenerator(gitManager, gitAgent);
      
            // Check for changes
            const status = await gitManager.getStatus();
            if (!status.hasChanges()) {
                spinner.fail('No changes detected in repository');
                process.exit(1);
            }
      
            spinner.text = 'Generating commit message with AI...';
      
            const message = await generator.generateCommitMessage({
                format: options.format,
                maxLength: parseInt(options.maxLength)
            });
      
            spinner.succeed('Generated commit message:');
            console.log('\n' + chalk.cyan('─'.repeat(60)));
            console.log(chalk.white(message));
            console.log(chalk.cyan('─'.repeat(60)) + '\n');
      
        } catch (error) {
            spinner.fail(`Error: ${(error as any).message}`);
            if (program.opts().verbose) {
                console.error((error as any).stack);
            }
            process.exit(1);
        }
    });

// Commit command
program
    .command('commit')
    .alias('c')
    .description('Generate commit message and create commit')
    .option('-s, --staged-only', 'Only commit staged changes')
    .option('-f, --files <files>', 'Comma-separated list of files to commit')
    .option('-n, --dry-run', 'Show what would be committed without committing')
    .option('-i, --interactive', 'Review and edit message before committing')
    .action(async (options: CommitCommandOptions) => {
        const spinner = ora('Analyzing repository...').start();
    
        try {
            const repoPath = program.opts().repo;
            const verbose = program.opts().verbose;
      
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
      
            let message = await generator.generateCommitMessage();
      
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
            if (program.opts().verbose) {
                console.error((error as any).stack);
            }
            process.exit(1);
        }
    });

// Status command
program
    .command('status')
    .alias('st')
    .description('Show repository status and changes')
    .option('--show-diff', 'Show diff of changes')
    .action(async (options: StatusCommandOptions) => {
        const spinner = ora('Checking repository status...').start();
    
        try {
            const repoPath = program.opts().repo;
            const gitManager = new GitManager(repoPath);
      
            const status = await gitManager.getStatus();
      
            if (!status.hasChanges()) {
                spinner.succeed('No changes detected');
                process.exit(0);
            }
      
            spinner.succeed('Repository status:');
            console.log(chalk.cyan('\n─'.repeat(40)));
      
            if (status.added.length > 0) {
                console.log(chalk.green(`🟢 Added files (${status.added.length}):`));
                status.added.forEach(file => console.log(chalk.green(`   + ${file}`)));
            }
      
            if (status.modified.length > 0) {
                console.log(chalk.yellow(`🟡 Modified files (${status.modified.length}):`));
                status.modified.forEach(file => console.log(chalk.yellow(`   ~ ${file}`)));
            }
      
            if (status.deleted.length > 0) {
                console.log(chalk.red(`🔴 Deleted files (${status.deleted.length}):`));
                status.deleted.forEach(file => console.log(chalk.red(`   - ${file}`)));
            }
      
            if (status.untracked.length > 0) {
                console.log(chalk.gray(`⚪ Untracked files (${status.untracked.length}):`));
                status.untracked.forEach(file => console.log(chalk.gray(`   ? ${file}`)));
            }
      
            if (options.showDiff) {
                console.log(chalk.cyan('\n📄 Changes:'));
                console.log(chalk.cyan('─'.repeat(40)));
                const diff = await gitManager.getDiff();
                console.log(diff);
            }
      
        } catch (error) {
            spinner.fail(`Error: ${(error as any).message}`);
            if (program.opts().verbose) {
                console.error((error as any).stack);
            }
            process.exit(1);
        }
    });

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
    program.outputHelp();
}