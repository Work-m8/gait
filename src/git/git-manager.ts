import simpleGit, { SimpleGit } from 'simple-git';
import path from 'path';
import fs from 'fs/promises';

export interface GitStatus {
    added: string[];
    modified: string[];
    deleted: string[];
    untracked: string[];
    conflicted: string[];
    hasChanges(): boolean;
}

export class GitManager {

    private repoPath: string;
    private git: SimpleGit;
    
    constructor(repoPath = '.') {
        this.repoPath = path.resolve(repoPath);
        this.git = simpleGit(this.repoPath);
    }

    /**
     * Get repository status
    */
    async getStatus(): Promise<GitStatus> {
        try {
            const status = await this.git.status();
            
            return {
                added: status.staged || [],
                modified: status.modified || [],
                deleted: status.deleted || [],
                untracked: status.not_added || [],
                conflicted: status.conflicted || [],
                hasChanges() {
                    return status.staged.length > 0 || 
                        status.modified.length > 0 || 
                        status.deleted.length > 0 || 
                        status.not_added.length > 0;
                }
            };
        } catch (error) {
            throw new Error(`Failed to get git status: ${(error as any).message}`);
        }
    }

    /**
     * Get diff of changes
    */
    async getDiff() {
        try {
            // Try to get staged changes first
            let diff = await this.git.diff(['--cached']);
      
            // If no staged changes, get unstaged changes
            if (!diff.trim()) {
                diff = await this.git.diff();
            }
      
            return diff;
        } catch (error) {
            throw new Error(`Failed to get git diff: ${(error as any).message}`);
        }
    }

    /**
     * Get diff summary for AI processing
    */
    async getDiffSummary() {
        try {
            const status = await this.getStatus();
            const diff = await this.getDiff();
      
            return {
                status,
                diff,
                summary: this.createSummary(status, diff)
            };
        } catch (error) {
            throw new Error(`Failed to get diff summary: ${(error as any).message}`);
        }
    }

    /**
     * Create a human-readable summary
    */
    createSummary(status: GitStatus, diff: string) {
        let summary = 'Git Status:\n';
    
        if (status.added.length > 0) {
            summary += `Added: ${status.added.join(', ')}\n`;
        }
        if (status.modified.length > 0) {
            summary += `Modified: ${status.modified.join(', ')}\n`;
        }
        if (status.deleted.length > 0) {
            summary += `Deleted: ${status.deleted.join(', ')}\n`;
        }
        if (status.untracked.length > 0) {
            summary += `Untracked: ${status.untracked.join(', ')}\n`;
        }
    
        summary += '\nChanges:\n';
        summary += diff;
    
        return summary;
    }

    /**
     * Add all changes and commit
    */
    async commitAll(message: string) {
        try {
            await this.git.add('.');
            const commit = await this.git.commit(message);
            return commit.commit;
        } catch (error) {
            throw new Error(`Failed to commit all changes: ${(error as any).message}`);
        }
    }

    /**
     * Commit only staged changes
    */
    async commitStaged(message: string) {
        try {
            const commit = await this.git.commit(message);
            return commit.commit;
        } catch (error) {
            throw new Error(`Failed to commit staged changes: ${(error as any).message}`);
        }
    }

    /**
     * Add specific files and commit
    */
    async commitFiles(message: string, files: string[]) {
        try {
            // Validate files exist
            for (const file of files) {
                const filePath = path.resolve(this.repoPath, file);
                try {
                    await fs.access(filePath);
                } catch {
                    throw new Error(`File not found: ${file}`);
                }
            }
      
            // Add files
            await this.git.add(files);
      
            // Commit
            const commit = await this.git.commit(message);
            return commit.commit;
        } catch (error) {
            throw new Error(`Failed to commit files: ${(error as any).message}`);
        }
    }

    /**
     * Check if directory is a git repository
    */
    async isRepository() {
        try {
            await this.git.status();
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get current branch name
    */
    async getCurrentBranch() {
        try {
            const status = await this.git.status();
            return status.current;
        } catch (error) {
            throw new Error(`Failed to get current branch: ${(error as any).message}`);
        }
    }

    /**
     * Get recent commit history
    */
    async getRecentCommits(count = 5) {
        try {
            const log = await this.git.log({ maxCount: count });
            return log.all.map(commit => ({
                hash: commit.hash,
                message: commit.message,
                author: commit.author_name,
                date: commit.date
            }));
        } catch (error) {
            throw new Error(`Failed to get commit history: ${(error as any).message}`);
        }
    }

    /**
     * Check if there are any commits in the repository
    */
    async hasCommits() {
        try {
            const log = await this.git.log({ maxCount: 1 });
            return log.all.length > 0;
        } catch {
            return false;
        }
    }
}