/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Flow comes with a pretty good library definitions for React, and it
// includes a type for useRef but no definition for the ref object itself.

// eslint-disable-next-line strict
declare type RefObject<T> = {current: null | T};
