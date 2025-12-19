# GitHub Actions Security & Architecture

This document outlines the Lexical repository's approach to GitHub Actions workflows, including security best practices, workflow organization, and guidelines for adding new workflows.

## Table of Contents

- [Security Principles](#security-principles)
- [Workflow Categories](#workflow-categories)
- [Secrets Management](#secrets-management)
- [Adding New Workflows](#adding-new-workflows)
- [Troubleshooting](#troubleshooting)

## Security Principles

### 1. Principle of Least Privilege

All workflows follow the principle of least privilege - they only have the minimum permissions necessary to perform their function.

**Default for test workflows:**
```yaml
permissions: {}
```

This completely removes the `GITHUB_TOKEN` from the workflow environment, preventing:
- Token theft from malicious npm postinstall scripts
- Token exfiltration from compromised dependencies
- Unauthorized API calls during test execution

### 2. No Credentials in Test Workflows

Test workflows (unit tests, e2e tests, integration tests) run with **zero permissions** because:
- Tests only need to execute code locally
- No GitHub API access is required
- Tests run on untrusted code (approved PRs, external dependencies)
- Compromised dependencies could steal credentials

### 3. Explicit Permissions for Write Operations

Workflows that need write access explicitly declare minimal permissions:

```yaml
permissions:
  contents: write  # Only for version tagging, release branches
```

or

```yaml
permissions:
  pull-requests: write  # Only for closing stale PRs
```

## Workflow Categories

### Test Workflows (No Permissions)

These workflows execute code but never need GitHub API access:

| Workflow | Purpose | Permissions |
|----------|---------|-------------|
| `call-core-tests.yml` | Linting, TypeScript, Flow, builds, unit tests | `{}` |
| `call-e2e-test.yml` | Individual e2e test execution | `{}` |
| `call-e2e-all-tests.yml` | Full e2e test suite | `{}` |
| `call-e2e-canary-tests.yml` | Quick e2e smoke tests | `{}` |
| `call-integration-tests.yml` | Integration tests with examples | `{}` |
| `tests.yml` | Orchestrates test workflows | `{}` |
| `tests-extended.yml` | Extended test suite | `{}` |
| `after-approval.yml` | Post-approval test orchestration | `{}` |

**Security rationale**: These workflows run untrusted code from:
- npm/pnpm dependencies (postinstall scripts)
- Example projects with their own dependencies
- PR code after approval but before merge

### Release Workflows (Controlled Permissions)

These workflows modify the repository or publish artifacts:

| Workflow | Purpose | Permissions | Secrets |
|----------|---------|-------------|---------|
| `call-increment-version.yml` | Create version tags and branches | `contents: write` | None |
| `call-post-release.yml` | Update examples after release | `contents: write` | None |
| `close-stale-pr.yml` | Close stale PRs | `pull-requests: write` | None |

### Publish Workflows (Requires Secrets)

These workflows publish to external services and require secrets:

| Workflow | Purpose | Secrets Required |
|----------|---------|------------------|
| `call-npm-publish.yml` | Publish packages to npm | `NPM_TOKEN` |
| `devtools-extension-publish.yml` | Publish browser extensions | `EXTENSION_CHROME_*`, `EXTENSION_FIREFOX_*`, `EXTENSION_EDGE_*` |
| `pre-release.yml` | Orchestrates npm publish | Inherits from `call-npm-publish.yml` |
| `nightly-release.yml` | Nightly releases | Inherits from `call-npm-publish.yml` |

## Secrets Management

### Available Secrets

The repository uses the following secrets:

#### Build & Cache
- `CACHE_VERSION` - Cache invalidation key

#### npm Publishing
- `NPM_TOKEN` - Authentication token for publishing to npm registry

#### Browser Extension Publishing
- `EXTENSION_CHROME_CLIENT_ID` - Chrome Web Store API client ID
- `EXTENSION_CHROME_CLIENT_SECRET` - Chrome Web Store API client secret
- `EXTENSION_CHROME_EXTENSION_ID` - Chrome extension ID
- `EXTENSION_CHROME_PUBLISH_TARGET` - Chrome publish target (default/trustedTesters)
- `EXTENSION_CHROME_REFRESH_TOKEN` - Chrome Web Store OAuth refresh token
- `EXTENSION_EDGE_ACCESS_TOKEN_URL` - Edge Add-ons API token URL
- `EXTENSION_EDGE_CLIENT_ID` - Edge Add-ons API client ID
- `EXTENSION_EDGE_CLIENT_SECRET` - Edge Add-ons API client secret
- `EXTENSION_EDGE_PRODUCT_ID` - Edge extension product ID
- `EXTENSION_FIREFOX_EXTENSION_ID` - Firefox extension ID
- `EXTENSION_FIREFOX_JWT_ISSUER` - Firefox Add-ons API JWT issuer
- `EXTENSION_FIREFOX_JWT_SECRET` - Firefox Add-ons API JWT secret

### Secret Access Policy

**✅ ONLY workflows that publish artifacts should access secrets**

**❌ Test workflows must NEVER access secrets**

When adding a new workflow that needs secrets:
1. Document why the secret is needed
2. Use the secret in the minimum number of steps
3. Never log or echo secret values
4. Prefer workflow secrets over repository secrets when possible

## Adding New Workflows

### For Test Workflows

When adding a new test workflow:

```yaml
name: My New Test Workflow

on:
  workflow_call:

# NO GitHub token access
permissions: {}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # No persist-credentials needed since we have no permissions

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22.x

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm run test
```

**Key points:**
- Always set `permissions: {}`
- Never use secrets
- Don't use `persist-credentials: false` (redundant with `permissions: {}`)
- Use `pnpm` for development tooling
- Use `npm` for example projects (user-facing)

### For Release Workflows

When adding a workflow that modifies the repository:

```yaml
name: My Release Workflow

on:
  workflow_call:

# Explicit minimal permissions
permissions:
  contents: write  # Only if creating tags/branches
  pull-requests: write  # Only if modifying PRs

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # ... release steps
```

**Key points:**
- Explicitly list only the permissions needed
- Document why each permission is required
- Avoid combining multiple permission types if possible

### For Publish Workflows

When adding a workflow that publishes artifacts:

```yaml
name: My Publish Workflow

on:
  workflow_call:
    secrets:
      MY_SECRET:
        required: true

permissions:
  contents: read  # Minimal permissions for checkout

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Publish
        run: pnpm run publish
        env:
          AUTH_TOKEN: ${{ secrets.MY_SECRET }}
```

**Key points:**
- Declare secrets in `workflow_call.secrets`
- Use secrets only in the specific steps that need them
- Never log secret values
- Prefer environment variables over command-line arguments for secrets

## Package Manager Usage

### Development Workflows (CI/CD)

Use **pnpm** for all development and CI workflows:

```yaml
- uses: pnpm/action-setup@v4
  with:
    version: 9
- run: pnpm install --frozen-lockfile
- run: pnpm run build
- run: pnpm run test
```

**Rationale**:
- Monorepo is managed with pnpm workspaces
- Faster installation with content-addressed store
- Strict dependency resolution

### Example/Integration Workflows

Use **npm** for testing examples and integration tests:

```yaml
- run: npm install --no-save ./path/to/tarball.tgz
- run: npm run build
- run: npm run test
```

**Rationale**:
- Examples are user-facing and should be package-manager agnostic
- Users may use npm, not pnpm
- Integration tests simulate real-world usage
- `npm install --no-save` installs without modifying package.json (pnpm has no equivalent)

## Troubleshooting

### "Resource not accessible by integration" error

**Cause**: Workflow trying to use GitHub API without permissions

**Solution**:
1. If the workflow is a test → it shouldn't need permissions, fix the code
2. If the workflow legitimately needs access → add explicit permissions
3. Check if a reusable workflow needs permissions inherited from the caller

### "Secret not found" error

**Cause**: Workflow trying to access a secret it doesn't have access to

**Solution**:
1. Verify secret exists in repository settings
2. Check secret name matches exactly (case-sensitive)
3. Ensure workflow is triggered from the correct branch/event
4. For `workflow_call`, declare secret in inputs:
   ```yaml
   on:
     workflow_call:
       secrets:
         MY_SECRET:
           required: true
   ```

### Tests failing due to dependency conflicts

**Cause**: pnpm's strict dependency resolution exposes version mismatches

**Solution**:
1. Check for version mismatches in dependencies (e.g., `@playwright/test` vs `playwright`)
2. Align versions in package.json
3. Regenerate lockfile: `pnpm install`
4. For examples using npm, check that `package-lock.json` is up to date

### Workflow runs on wrong code version

**Cause**: `pull_request_review` trigger runs PR code, not base branch

**Solution**:
- For untrusted code, use `pull_request` trigger (runs on base branch)
- For trusted code after approval, `pull_request_review` is acceptable
- Consider security implications of running PR code

## Best Practices Checklist

When creating or modifying workflows:

- [ ] Set `permissions: {}` for test workflows
- [ ] Set explicit minimal permissions for release workflows
- [ ] Use pnpm for development workflows
- [ ] Use npm for example/integration workflows
- [ ] Never log or echo secrets
- [ ] Document why secrets are needed
- [ ] Test workflow changes in a fork first
- [ ] Verify workflow runs don't expose sensitive information in logs
- [ ] Check that workflow only runs on intended events/branches
- [ ] Review security implications of running untrusted code

## Additional Resources

- [GitHub Actions Security Best Practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [Understanding permissions for GitHub Actions](https://docs.github.com/en/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token)
- [Lexical Development Guide](../AGENTS.md)
- [Lexical Maintainers' Guide](../packages/lexical-website/docs/maintainers-guide.md)
