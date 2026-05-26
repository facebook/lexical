/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Ambient stubs for the Hermes Flow-tooling modules used by the flow scripts.
// They ship no TypeScript declarations and have no @types package, so they
// resolve as untyped here (the scripts type-check verifies our own logic, not
// these APIs). Other third-party modules (minimist, semver, @babel/core) have
// real @types packages installed instead.
declare module 'hermes-estree';
declare module 'hermes-parser';
declare module 'hermes-transform';
