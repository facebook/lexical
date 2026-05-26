/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Ambient stubs for third-party modules used only by build/release scripts
// that don't ship (or don't have installed) type declarations. The scripts
// type-check (tsconfig.scripts.json) verifies our own logic, not these APIs,
// so treating them as untyped is acceptable here.
declare module 'minimist';
declare module 'semver';
declare module '@babel/core';
declare module 'hermes-estree';
declare module 'hermes-parser';
declare module 'hermes-transform';
