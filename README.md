# Gait 🚶‍♂️

**Your AI-powered Git commit message generator**

Gait analyzes your Git repository changes and generates professional, conventional commit messages using AI. Never struggle with writing commit messages again!

## Features

✨ **AI-Powered**: Uses OpenAI GPT-4 to understand your code changes and generate contextual commit messages

📝 **Multiple Formats**: Support for conventional commits, simple, and detailed formats

🎯 **Smart Analysis**: Analyzes file changes, diffs, and context to create relevant messages

🛡️ **Validation**: Built-in validation for commit message quality and format

🔍 **Interactive Mode**: Review and edit messages before committing

📊 **Status Overview**: Visual repository status with file change summaries

## Installation

```bash
npm install -g @gait/cli
```

## Prerequisites

1. **OpenAI API Key**: You'll need an OpenAI API key to use Gait
   ```bash
   export OPENAI_API_KEY="your-api-key-here"
   ```
   
   Or create a `.env` file in your project:
   ```env
   OPENAI_API_KEY=your-api-key-here
   ```

2. **Git Repository**: Gait works within Git repositories

## Quick Start

```bash
# Generate a commit message without committing
gait generate

# Generate and commit with interactive review
gait commit --interactive

# Check repository status
gait status
```

## Commands

### `gait generate` (alias: `gen`, `g`)

Generate a commit message without creating a commit.

```bash
gait generate [options]

Options:
  --format <type>        Message format: conventional, simple, detailed (default: "conventional")
  --max-length <number>  Maximum message length (default: "72")
```

**Examples:**
```bash
# Generate conventional commit message
gait generate

# Generate simple format message
gait generate --format simple

# Limit message length
gait generate --max-length 50
```

### `gait commit` (alias: `c`)

Generate a commit message and create a commit.

```bash
gait commit [options]

Options:
  -s, --staged-only     Only commit staged changes
  -f, --files <files>   Comma-separated list of files to commit
  -n, --dry-run        Show what would be committed without committing
  -i, --interactive    Review and edit message before committing
```

**Examples:**
```bash
# Generate message and commit all changes
gait commit

# Interactive mode - review before committing
gait commit --interactive

# Commit only staged changes
gait commit --staged-only

# Commit specific files
gait commit --files "src/index.ts,README.md"

# Preview without committing
gait commit --dry-run
```

### `gait status` (alias: `st`)

Show repository status and changes.

```bash
gait status [options]

Options:
  --show-diff  Show diff of changes
```

**Examples:**
```bash
# Show basic status
gait status

# Show status with diff
gait status --show-diff
```

## Global Options

```bash
Options:
  -r, --repo <path>  Repository path (default: ".")
  -v, --verbose      Enable verbose output
  --version          Show version number
  --help             Show help
```

## Commit Message Formats

### Conventional Commits (Default)
```
feat(auth): add JWT token validation
fix(api): resolve user authentication bug
docs: update installation instructions
```

### Simple Format
```
Add JWT token validation
Fix user authentication bug
Update installation instructions
```

### Detailed Format
```
Add JWT token validation

Implement comprehensive JWT validation with proper error handling
and expiration checks to enhance authentication security.
```

## How It Works

1. **Analysis**: Gait analyzes your Git repository changes, including:
   - File additions, modifications, and deletions
   - Code diffs and context
   - Change patterns and scope

2. **AI Generation**: Uses OpenAI's GPT-4 to generate contextually appropriate commit messages following best practices

3. **Validation**: Validates the generated message against:
   - Length limits
   - Conventional commit format (when selected)
   - Grammar and style guidelines

4. **Commit**: Optionally creates the commit with the generated message

## Configuration

Gait can be configured through environment variables:

```env
# Required: OpenAI API Key
OPENAI_API_KEY=your-api-key-here

# Optional: Default format
GAIT_DEFAULT_FORMAT=conventional

# Optional: Default max length
GAIT_DEFAULT_MAX_LENGTH=72
```

## Examples

### Basic Workflow
```bash
# Make some changes to your code
echo "console.log('hello world');" >> index.js

# Generate and review a commit message
gait generate
# Output: feat: add hello world logging

# Commit with interactive review
gait commit --interactive
```

### Working with Staged Changes
```bash
# Stage specific files
git add src/auth.ts src/types.ts

# Commit only staged changes
gait commit --staged-only
```

### Multiple File Types
```bash
# After updating docs and fixing bugs
gait generate
# Output: fix(auth): resolve token expiration handling

# Check what would be committed
gait commit --dry-run
```

## Best Practices

1. **Stage Related Changes**: Group related changes together for better commit messages
2. **Use Interactive Mode**: Review generated messages for accuracy
3. **Check Status First**: Use `gait status` to understand your changes
4. **Meaningful Changes**: Make atomic commits with clear purposes

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

ISC

## Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/work-m8/gait/issues)
- 📖 **Documentation**: [Full Documentation](https://github.com/work-m8/gait/docs)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/work-m8/gait/discussions)

---

**Made with ❤️ for developers who care about clean Git history**