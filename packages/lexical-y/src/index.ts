/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// The implementation lives under ./internal and is bundled into this entry
// (the package has no other public entry), so this module imports and
// exports rather than re-exporting from private files.
import {
  YBinding,
  type YBindingOptions,
  type YBindingStatus,
  type YCursor,
} from './internal/Binding';
import {type ClientIDRange} from './internal/ClientID';
import {DEFAULT_ROOT_NAME, LAYOUT_VERSION} from './internal/constants';
import {describeStorage} from './internal/Describe';
import {type StorageKind} from './internal/Schema';
import {
  NESTED_FALLBACK_WARNING,
  RECOVERED_READ_WARNING,
  RECOVERED_WRITE_WARNING,
  SELF_CHECK_WARNING,
  STORAGE_MISMATCH_WARNING,
  UNKNOWN_NODE_TYPES_WARNING,
  UNSUPPORTED_CONFIG_WARNING,
  UNSUPPORTED_LAYOUT_WARNING,
  UNSUPPORTED_SLOTS_WARNING,
  UNSYNCED_VALUE_WARNING,
  type YWarningCode,
} from './internal/Warnings';
import {type YCollabConfig, YCollabExtension} from './internal/YExtension';

export type {
  ClientIDRange,
  StorageKind,
  YBindingOptions,
  YBindingStatus,
  YCollabConfig,
  YCursor,
  YWarningCode,
};
export {
  DEFAULT_ROOT_NAME,
  describeStorage,
  LAYOUT_VERSION,
  NESTED_FALLBACK_WARNING,
  RECOVERED_READ_WARNING,
  RECOVERED_WRITE_WARNING,
  SELF_CHECK_WARNING,
  STORAGE_MISMATCH_WARNING,
  UNKNOWN_NODE_TYPES_WARNING,
  UNSUPPORTED_CONFIG_WARNING,
  UNSUPPORTED_LAYOUT_WARNING,
  UNSUPPORTED_SLOTS_WARNING,
  UNSYNCED_VALUE_WARNING,
  YBinding,
  YCollabExtension,
};
