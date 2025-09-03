import { Agent } from '@mastra/core/agent';
import { GitManager, Status } from "./git-manager";

interface Validation {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export class CommitMessageGenerator {

    private gitManager: GitManager;
    private agent: Agent;

    constructor(gitManager: GitManager, agent: Agent) {
      this.gitManager = gitManager;
      this.agent = agent;
    }
  
    /**
     * Generate commit message using AI
     */
    async generateCommitMessage(options = {}) {
        // Get git changes
        const diffSummary = await this.gitManager.getDiffSummary();
      
        if (!diffSummary.status.hasChanges()) {
            throw new Error('No changes detected in repository');
        }
  
        // Build prompt for AI
        const prompt = this.buildPrompt(diffSummary, options);
      
        // Generate message with AI
        return this.agent.generate(prompt)
            .then((res) => {
                console.log(res);
                return this.postProcessMessage(res.text, options);
            });
    }
  
    /**
     * Build prompt for AI service
     */
    buildPrompt(diffSummary: { diff: string; status: Status }, options: any = {}) {
        let prompt = 'Generate a commit message for the following Git changes:\n\n';
      
        // Add file changes summary
        prompt += 'Files changed:\n';
        const { status } = diffSummary;
      
        if (status.added.length > 0) {
            prompt += `- Added: ${status.added.join(', ')}\n`;
        }
        if (status.modified.length > 0) {
            prompt += `- Modified: ${status.modified.join(', ')}\n`;
        }
        if (status.deleted.length > 0) {
            prompt += `- Deleted: ${status.deleted.join(', ')}\n`;
        }
        if (status.untracked.length > 0) {
            prompt += `- Untracked: ${status.untracked.join(', ')}\n`;
        }
      
        // Add diff (truncated if too long)
        prompt += '\nCode changes:\n';
        const diff = this.truncateDiff(diffSummary.diff, options.maxDiffLength || 3000);
        prompt += diff;
      
        // Add specific instructions
        prompt += '\n\nInstructions:\n';
        if (options.format === 'conventional') {
            prompt += '- Use conventional commit format (type(scope): description)\n';
        }
        prompt += `- Keep the first line under ${options.maxLength || 50} characters\n`;
        prompt += '- Use present tense, imperative mood\n';
        prompt += '- Focus on what the change accomplishes\n';
      
        return prompt;
    }
  
    /**
     * Truncate diff if it's too long for AI processing
     */
    truncateDiff(diff: string, maxLength = 3000) {
        if (diff.length <= maxLength) {
            return diff;
        }
      
        const truncated = diff.substring(0, maxLength);
        const lastNewline = truncated.lastIndexOf('\n');
      
        // Try to cut at a reasonable line boundary
        if (lastNewline > maxLength * 0.8) {
            return truncated.substring(0, lastNewline) + '\n\n[... diff truncated ...]';
        }
      
        return truncated + '\n\n[... diff truncated ...]';
    }
  
    /**
     * Post-process the generated message
     */
    postProcessMessage(message: string, options: any = {}) {
        let processed = message.trim();
      
        // Remove any markdown formatting
        processed = processed.replace(/```[^`]*```/g, '');
        processed = processed.replace(/`([^`]+)`/g, '$1');
        processed = processed.replace(/\*\*([^*]+)\*\*/g, '$1');
        processed = processed.replace(/\*([^*]+)\*/g, '$1');
      
        // Clean up multiple spaces and newlines
        processed = processed.replace(/ +/g, ' ');
        processed = processed.replace(/\n{3,}/g, '\n\n');
      
        // Ensure first line length limit
        const lines = processed.split('\n');
        const maxLength = options.maxLength || 50;
      
        if (lines[0]!.length > maxLength) {
            // Try to shorten the first line intelligently
            const firstLine = lines[0]!;
            const colonIndex = firstLine.indexOf(':');
        
            if (colonIndex > 0 && colonIndex < maxLength) {
                // Conventional commit format - truncate after colon
                const prefix = firstLine.substring(0, colonIndex + 1);
                const description = firstLine.substring(colonIndex + 1).trim();
                const maxDescLength = maxLength - prefix.length - 1;
          
                if (description.length > maxDescLength) {
                    lines[0] = prefix + ' ' + description.substring(0, maxDescLength).trim();
                }
            } else {
                // Simple truncation
                lines[0] = firstLine.substring(0, maxLength).trim();
            }
        }
      
        return lines.join('\n').trim();
    }
  
    /**
     * Validate commit message format
     */
    validateMessage(message: string, format = 'conventional') {
        const lines = message.split('\n');
        const firstLine = lines[0]!;
      
        const validation: Validation = {
            valid: true,
            errors: [],
            warnings: []
        };
      
        // Check first line length
        if (firstLine.length > 72) {
            validation.errors.push('First line is too long (over 72 characters)');
            validation.valid = false;
        } else if (firstLine.length > 50) {
            validation.warnings.push('First line is longer than recommended 50 characters');
        }
      
        // Check conventional commit format
        if (format === 'conventional') {
            const conventionalRegex = /^(feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert)(\(.+\))?: .+/;
            if (!conventionalRegex.test(firstLine)) {
                validation.errors.push('First line does not follow conventional commit format');
                validation.valid = false;
            }
        }
      
        // Check imperative mood (basic check)
        const verbEndingRegex = /(ed|ing|s)$/i;
        const firstWord = firstLine.replace(/^[^:]*:\s*/, '').split(' ')[0]!;
        if (verbEndingRegex.test(firstWord)) {
            validation.warnings.push('Consider using imperative mood (e.g., "add" instead of "added")');
        }
      
        // Check for blank line after first line if there's a body
        if (lines.length > 1 && lines[1] !== '') {
            validation.warnings.push('Consider adding a blank line after the first line');
        }
      
        return validation;
    }
  
    /**
     * Get suggestions for improving a commit message
     */
    async getSuggestions(message: string, diffSummary: { status: Status, diff: string[]}) {
        const suggestions = [];
        
        // Analyze the changes for specific suggestions
        const { status } = diffSummary;
        
        // Check for missing test files
        const hasTestChanges = [...status.added, ...status.modified]
            .some(file => file.includes('test') || file.includes('spec'));
        const hasCodeChanges = [...status.added, ...status.modified]
            .some(file => file.match(/\.(js|ts|py|java|go|rs|cpp|c)$/));
        
        if (hasCodeChanges && !hasTestChanges) {
            suggestions.push({
                type: 'warning',
                message: 'Consider adding tests for your code changes'
            });
        }
        
        // Check for documentation updates
        const hasDocChanges = [...status.added, ...status.modified]
            .some(file => file.match(/\.(md|rst|txt)$/i) || file.toLowerCase()
            .includes('readme'));

        const hasPublicAPIChanges = diffSummary.diff.includes('export') || 
                                    diffSummary.diff.includes('public');
        
        if (hasPublicAPIChanges && !hasDocChanges) {
            suggestions.push({
                type: 'info',
                message: 'Consider updating documentation for API changes'
            });
        }
        
        // Check for breaking changes
        if (
            diffSummary.diff.includes('BREAKING') || 
            diffSummary.diff.includes('breaking') ||
            status.deleted.length > 0
        ) {
          
            suggestions.push({
                type: 'warning',
                message: 'This may be a breaking change - consider using BREAKING CHANGE footer'
            });
        }
        
        // Check commit message quality
        const validation = this.validateMessage(message);
        if (!validation.valid) {
            suggestions.push(...validation.errors.map(error => ({
                type: 'error',
                message: error
            })));
        }
        
        if (validation.warnings.length > 0) {
            suggestions.push(...validation.warnings.map(warning => ({
                type: 'warning',
                message: warning
            })));
        }
        
        return suggestions;
      }
    
      /**
       * Generate alternative commit messages
       */
      async generateAlternatives(diffSummary: { status: Status}, options = {}, count = 3) {
        const alternatives = [];
        
        for (let i = 0; i < count; i++) {
            try {
                // Vary the prompt slightly for each alternative
                const variedOptions = {
                    ...options,
                    temperature: 0.5 + (i * 0.2), // Increase creativity for each alternative
                    format: i === 0 ? 'conventional' : i === 1 ? 'simple' : 'detailed'
                };
            
                const message = await this.generateCommitMessage(variedOptions);
                alternatives.push({
                    format: variedOptions.format,
                    message: message
                });
            
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            
            } catch (error) {
                console.warn(`Failed to generate alternative ${i + 1}: ${(error as any).message}`);
            }
        }
        
        return alternatives;
    }
}