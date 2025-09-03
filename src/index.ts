#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import dotenv from 'dotenv';
import { GitManager } from './git/git-manager';
import { CommitMessageGenerator } from './git/commit-generator';

import { createGitAgent } from './mastra/agents/git-agent';
import { CommitFormat } from './git/commit-format';
import { commitCommand, generateCommand, statusCommand } from './commands/git';
import { configCommand } from './commands/config';

// Load environment variables
dotenv.config();

const program = new Command();

program
    .name('gait')
    .description('Gait, your Git Commit message generator')
    .version('1.0.0')
    .option('-r, --repo <path>', 'Repository path', '.')
    .option('-v, --verbose', 'Enable verbose output')
    .addCommand(statusCommand)
    .addCommand(generateCommand)
    .addCommand(commitCommand)
    .addCommand(configCommand)
    ;

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
    program.outputHelp();
}