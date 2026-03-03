# Create a new custom command

Please follow the instructions provided by the user to create a new command for Claude Code.

1. Start from this template:

```markdown
# NAME OF THE COMMAND

High level concise 1 sentence description of the instructions.

Follow these steps:

1. [First step with specific action]
2. [Second step with tool usage if needed]

## Examples

## General Considerations
```

2. Remove any unnecessary sections or placeholders.
3. Ensure the command is clear, actionable, reusable and follows best practices.
4. Use the `$ARGUMENTS` placeholder if the command should accept parameters.
5. Review the command for clarity, completeness, consistency with existing commands, and concisenesses.
6. Place the command file in the `.claude/commands/` directory with a descriptive name in kebab-case.

Example:

```markdown
# Analyze and Fix GitHub Issue

Please analyze and fix the GitHub issue: $ARGUMENTS.

Follow these steps:

1. Use `gh issue view` to get the issue details
2. Understand the problem described in the issue
3. Search the codebase for relevant files
4. Implement the necessary changes to fix the issue
5. Write and run tests to verify the fix
6. Ensure code passes linting and type checking
7. Create a descriptive commit message
8. Push and create a PR

Remember to use the GitHub CLI (`gh`) for all GitHub-related tasks.
```
