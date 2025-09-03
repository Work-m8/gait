// Core interfaces and types for Git AI CLI

export interface GitStatus {
    added: string[];
    modified: string[];
    deleted: string[];
    untracked: string[];
    conflicted: string[];
    hasChanges(): boolean;
  }
  
  export interface DiffSummary {
    status: GitStatus;
    diff: string;
    summary: string;
  }
  
  export interface CommitInfo {
    hash: string;
    message: string;
    author: string;
    date: string;
  }
  
  // AI Service Options
  export interface AIServiceOptions {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    format?: CommitFormat;
    maxLength?: number;
    maxDiffLength?: number;
    timeout?: number;
  }
  
  // Commit Message Generation Options
  export interface GenerateOptions {
    format?: CommitFormat;
    maxLength?: number;
    maxDiffLength?: number;
    temperature?: number;
    model?: string;
  }
  
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
  
  export interface GlobalOptions {
    repo: string;
    verbose?: boolean;
  }
  
  // Enums and Literals
  export type CommitFormat = 'conventional' | 'simple' | 'detailed';
  
  export type ConventionalCommitType = 
    | 'feat'
    | 'fix'
    | 'docs'
    | 'style'
    | 'refactor'
    | 'perf'
    | 'test'
    | 'chore'
    | 'ci'
    | 'build'
    | 'revert';
  
  export type AIProvider = 'openai' | 'anthropic';
  
  export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
  
  // Validation and Suggestions
  export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
  }
  
  export interface Suggestion {
    type: 'error' | 'warning' | 'info';
    message: string;
  }
  
  export interface CommitAlternative {
    format: CommitFormat;
    message: string;
  }
  
  // AI Service Response Types
  export interface AITestResult {
    success: boolean;
    provider: AIProvider;
    error?: string;
  }
  
  // Environment Configuration
  export interface EnvironmentConfig {
    openaiApiKey?: string;
    anthropicApiKey?: string;
    defaultFormat?: CommitFormat;
    defaultMaxLength?: number;
    defaultModel?: string;
    debug?: boolean;
    logLevel?: LogLevel;
  }
  
  // Git Manager Configuration
  export interface GitManagerConfig {
    repoPath: string;
  }
  
  // Extended Git Status with additional metadata
  export interface ExtendedGitStatus extends GitStatus {
    branch: string;
    ahead: number;
    behind: number;
    hasUncommittedChanges: boolean;
  }
  
  // Commit Creation Results
  export interface CommitResult {
    hash: string;
    message: string;
    filesChanged: number;
    insertions: number;
    deletions: number;
  }
  
  // Error Types
  export class GitAIError extends Error {
    constructor(
      message: string,
      public code?: string,
      public cause?: Error
    ) {
      super(message);
      this.name = 'GitAIError';
    }
  }
  
  export class AIServiceError extends GitAIError {
    constructor(message: string, public provider: AIProvider, cause?: Error) {
      super(message, 'AI_SERVICE_ERROR', cause);
      this.name = 'AIServiceError';
    }
  }
  
  export class GitError extends GitAIError {
    constructor(message: string, cause?: Error) {
      super(message, 'GIT_ERROR', cause);
      this.name = 'GitError';
    }
  }
  
  // Utility Types
  export interface Logger {
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
  }
  
  // Configuration Schema
  export interface Config {
    ai: {
      provider: AIProvider;
      apiKey: string;
      model?: string;
      temperature?: number;
      maxTokens?: number;
      timeout?: number;
    };
    git: {
      defaultFormat: CommitFormat;
      maxLineLength: number;
      requireConventionalFormat: boolean;
    };
    ui: {
      showSpinner: boolean;
      colorOutput: boolean;
      verboseByDefault: boolean;
    };
  }