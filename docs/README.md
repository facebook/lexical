# Lexical Documentation

This directory contains specialized documentation for the Lexical project.

## Available Documentation

### [GitHub Actions Security & Architecture](./github-actions.md)

Comprehensive guide to the repository's CI/CD approach, including:
- Security principles and best practices
- Workflow categorization (test vs. release vs. publish)
- Secrets management
- Guidelines for adding new workflows
- Package manager usage (pnpm vs. npm)
- Troubleshooting common issues

**Audience**: Contributors adding or modifying GitHub Actions workflows, security reviewers, and agents/tools working with CI/CD.

## Contributing to Documentation

When adding new documentation:

1. Create a new `.md` file in this directory
2. Add it to this README with a brief description
3. Link to it from relevant files (e.g., AGENTS.md, CONTRIBUTING.md)
4. Follow the existing documentation structure and style
5. Include practical examples and rationale for decisions

## Related Documentation

- **[AGENTS.md](../AGENTS.md)** - Guide for AI agents and automated tools working with the codebase
- **[Maintainers' Guide](../packages/lexical-website/docs/maintainers-guide.md)** - Monorepo organization, package management, release procedures
- **[Contributing Guide](../CONTRIBUTING.md)** - Guidelines for contributing to Lexical
