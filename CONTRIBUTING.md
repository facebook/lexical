# Contributing to lexical

We want to make contributing to this project as easy and transparent as
possible.

## Pull Requests

We actively welcome your pull requests.

This project uses [pnpm](https://pnpm.io/) as its package manager. If you don't have it installed:

```bash
npm install -g pnpm
# or if you have Node.js 16.13+
corepack enable
```

1. Fork the repo and create your branch from `main`.
2. Run `pnpm install` to install dependencies.
3. If you've added code that should be tested, add tests.
4. If you've changed APIs, update the documentation.
5. Ensure the test suite passes.
6. Make sure your code lints.
7. If you haven't already, complete the Contributor License Agreement ("CLA").

Note that the local server needs to be running in order to run the e2e tests.

- `pnpm run start`
- `pnpm run test-e2e-chromium` (to run only chromium e2e tests)

`pnpm run start` will start both the dev server and collab server. If you don't need collab, use `pnpm run dev` to start just the dev server.

If you're contributing to the website or documentation, you can run docusaurus
with:

- `pnpm run start:website`

A full build of the website can be done with:

- `pnpm -C packages/lexical-website run build`

## Contributor License Agreement ("CLA")

In order to accept your pull request, we need you to submit a CLA. You only need
to do this once to work on any of Facebook's open source projects.

Complete your CLA here: <https://code.facebook.com/cla>

## Issues

We use GitHub issues to track public bugs. Please ensure your description is
clear and has sufficient instructions to be able to reproduce the issue.

Meta has a [bounty program](https://bugbounty.meta.com/) for the safe
disclosure of security bugs. In those cases, please go through the process
outlined on that page and do not file a public issue.

## License

By contributing to lexical, you agree that your contributions will be licensed
under the LICENSE file in the root directory of this source tree.
