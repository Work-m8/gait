import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { GitManager } from '../../git/git-manager';
import { GlobalOptions } from '../../types';
import { handleError } from '../../utils/error-handler';

export interface StatusCommandOptions {
    showDiff?: boolean;
}

export const statusCommand = new Command()
  .name('status')
  .alias('st')
  .description('Show repository status and changes')
  .option('--show-diff', 'Show diff of changes')
  .option('--show-stats', 'Show detailed statistics')
  .option('--branch-info', 'Show branch information')
  .option('--recent-commits <count>', 'Show recent commits', '5')
  .action(async (options: StatusCommandOptions & {
    showStats?: boolean;
    branchInfo?: boolean;
    recentCommits?: string;
  }) => {
    const spinner = ora('Checking repository status...').start();
    
    try {
      const globalOpts = statusCommand.parent?.opts() as GlobalOptions;
      const repoPath = globalOpts?.repo || '.';
      const verbose = globalOpts?.verbose;
      const gitManager = new GitManager(repoPath);
      
      // Check if it's a git repository
      if (!(await gitManager.isRepository())) {
        spinner.fail('Not a Git repository');
        process.exit(1);
      }
      
      const status = await gitManager.getStatus();
      
      if (!status.hasChanges()) {
        spinner.succeed('No changes detected');
        
        // Still show branch info if requested
        if (options.branchInfo) {
          const branch = await gitManager.getCurrentBranch();
          const hasCommits = await gitManager.hasCommits();
          
          console.log(chalk.cyan('\n📍 Repository Info:'));
          console.log(chalk.cyan('─'.repeat(30)));
          console.log(chalk.blue(`Branch: ${branch}`));
          console.log(chalk.blue(`Has commits: ${hasCommits ? 'Yes' : 'No (initial commit needed)'}`));
        }
        
        // Show recent commits if repository has commits
        if (options.recentCommits && await gitManager.hasCommits()) {
          const count = parseInt(options.recentCommits);
          const commits = await gitManager.getRecentCommits(count);
          
          console.log(chalk.cyan(`\n📚 Recent ${count} commits:`));
          console.log(chalk.cyan('─'.repeat(40)));
          
          commits.forEach((commit, index) => {
            const shortHash = commit.hash.substring(0, 8);
            const shortMessage = commit.message.length > 50 
              ? commit.message.substring(0, 47) + '...'
              : commit.message;
            
            console.log(chalk.gray(`${index + 1}. ${shortHash} ${shortMessage}`));
            if (verbose) {
              console.log(chalk.gray(`   Author: ${commit.author}, Date: ${commit.date}`));
            }
          });
        }
        
        process.exit(0);
      }
      
      spinner.succeed('Repository status:');
      console.log(chalk.cyan('\n─'.repeat(50)));
      
      // File status
      if (status.added.length > 0) {
        console.log(chalk.green(`🟢 Staged files (${status.added.length}):`));
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
      
      if (status.conflicted.length > 0) {
        console.log(chalk.magenta(`⚠️  Conflicted files (${status.conflicted.length}):`));
        status.conflicted.forEach(file => console.log(chalk.magenta(`   ! ${file}`)));
      }
      
      // Statistics
      if (options.showStats) {
        const totalFiles = status.added.length + status.modified.length + 
                          status.deleted.length + status.untracked.length;
        
        console.log(chalk.cyan('\n📊 Statistics:'));
        console.log(chalk.cyan('─'.repeat(20)));
        console.log(chalk.blue(`Total changed files: ${totalFiles}`));
        console.log(chalk.blue(`Files ready to commit: ${status.added.length}`));
        console.log(chalk.blue(`Files need staging: ${status.modified.length + status.untracked.length}`));
        
        if (status.conflicted.length > 0) {
          console.log(chalk.red(`⚠️  Files in conflict: ${status.conflicted.length}`));
        }
      }
      
      // Branch information
      if (options.branchInfo) {
        const branch = await gitManager.getCurrentBranch();
        const hasCommits = await gitManager.hasCommits();
        
        console.log(chalk.cyan('\n📍 Branch Info:'));
        console.log(chalk.cyan('─'.repeat(20)));
        console.log(chalk.blue(`Current branch: ${branch}`));
        console.log(chalk.blue(`Repository initialized: ${hasCommits ? 'Yes' : 'No'}`));
        
        if (!hasCommits) {
          console.log(chalk.yellow('   💡 This will be your initial commit'));
        }
      }
      
      // Diff output
      if (options.showDiff) {
        console.log(chalk.cyan('\n📄 Changes:'));
        console.log(chalk.cyan('─'.repeat(50)));
        
        const diff = await gitManager.getDiff();
        if (diff.trim()) {
          // Limit diff output for readability
          const lines = diff.split('\n');
          if (lines.length > 100 && !verbose) {
            console.log(lines.slice(0, 100).join('\n'));
            console.log(chalk.gray(`\n... (${lines.length - 100} more lines, use --verbose to see all)`));
          } else {
            console.log(diff);
          }
        } else {
          console.log(chalk.gray('No diff available (files may be binary or identical)'));
        }
      }
      
      // Recent commits
      if (options.recentCommits && await gitManager.hasCommits()) {
        const count = parseInt(options.recentCommits);
        const commits = await gitManager.getRecentCommits(count);
        
        console.log(chalk.cyan(`\n📚 Recent ${count} commits:`));
        console.log(chalk.cyan('─'.repeat(40)));
        
        commits.forEach((commit, index) => {
          const shortHash = commit.hash.substring(0, 8);
          const shortMessage = commit.message.split('\n')[0]!; // First line only
          const displayMessage = shortMessage.length > 60 
            ? shortMessage.substring(0, 57) + '...'
            : shortMessage;
          
          console.log(chalk.gray(`${index + 1}. ${shortHash} ${displayMessage}`));
          if (verbose) {
            console.log(chalk.gray(`   📝 ${commit.author} • ${new Date(commit.date).toLocaleDateString()}`));
          }
        });
      }
      
      // Suggestions
      if (!options.showDiff && (status.modified.length > 0 || status.untracked.length > 0)) {
        console.log(chalk.blue('\n💡 Suggestions:'));
        console.log(chalk.blue(`   • Use --show-diff to see detailed changes`));
        console.log(chalk.blue(`   • Run 'git-ai generate' to preview a commit message`));
        console.log(chalk.blue(`   • Run 'git-ai commit' to generate and commit`));
      }
      
    } catch (error) {
      handleError(error, spinner, true);
    }
  });