# Testing

Lexical relies on tests to ensure that changes don't break anything, using a mix of unit and end-to-end tests.

## Unit tests

We use Jest to run unit tests in core (`lexical` package). The goal is to have a well tested API, enabling us to add or modify features without breaking it.

To run the tests use:

```
npm run test-unit
```

Unit tests can be found in [this directory](https://github.com/facebook/lexical/tree/main/packages/lexical/src/__tests__).

## End-to-end (E2E) tests

We use [Playwright](https://playwright.dev/) for running E2E tests in Chromium, Firefox and WebKit.

These tests run in the `lexical-playground` package and are divided into proactive and reactive tests (`e2e` and `regression` directories).

The goal for this type of test is to validate the behavior of Lexical in a browser, without necessarily knowing how the internals work.

To run E2E tests use:

```
npm run start &
npm run test-e2e-chromium # or -firefox, -webkit
```

E2E tests can be found in [this directory](https://github.com/facebook/lexical/tree/main/packages/lexical-playground/__tests__)

## General guidelines

When writing tests, please follow these practices:

- New features must include tests.
- No test is too small or too big to be included. If it can break, add a test.
- Do not merge pull requests with failing tests, this can block other people and releases.
- Be mindful with your abstractions: sometimes it's convenient to create abstractions/utils to make test files smaller and less repetitive. Please make sure that they are simple and easy to follow.
