import { Command } from "commander";
import ora from "ora";
import chalk from 'chalk';
import { GitManager } from "../../git/git-manager";
import { createGitAgent } from "../../mastra/agents/git-agent";
import { CommitMessageGenerator } from "../../git/commit-generator";
import { CommitFormat } from "../../types";
import { ConfigManager } from "../../config/config.manager";

export interface GenerateCommandOptions {
    format: CommitFormat;
    maxLength: string;
}

export const generateCommand = new Command()
    .command('generate')
    .alias('gen')
    .alias('g')
    .description('Generate commit message without committing')
    .option('--format <type>', 'Message format: conventional, simple, detailed', 'conventional')
    .option('--max-length <number>', 'Maximum message length', '72')
    .action(async (options: GenerateCommandOptions) => {
        const spinner = ora('Analyzing repository changes...').start();
    
        try {
            const repoPath = generateCommand.opts().repo;
            const verbose = generateCommand.opts().verbose;
      
            if (verbose) {
                spinner.info(`Repository: ${repoPath}`);
                spinner.info(`Format: ${options.format}`);
                spinner.info(`Max length: ${options.maxLength}`);
            }
      
            const gitManager = new GitManager(repoPath);

            const configManager = new ConfigManager();

            const provider = await configManager.getDefaultProvider();

            const gitAgent = createGitAgent(provider!);
            
            const generator = new CommitMessageGenerator(gitManager, gitAgent);
      
            // Check for changes
            const status = await gitManager.getStatus();
            if (!status.hasChanges()) {
                spinner.fail('No changes detected in repository');
                process.exit(1);
            }
      
            spinner.text = `Generating commit message with ${provider!.type}...`;
      
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
            if (generateCommand.opts().verbose) {
                console.error((error as any).stack);
            }
            process.exit(1);
        }
    });