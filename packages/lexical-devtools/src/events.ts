/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

declare global {
  interface DocumentEventMap {
    lexicalExtensionCommsInjToCont: CustomEvent;
    lexicalExtensionCommsContToInj: CustomEvent;
  }
}

// https://stackoverflow.com/a/63961972
// eslint-disable-next-line no-shadow
export enum Events {
  LEXICAL_EXT_COMM_REQ = 'lexicalExtensionCommsInjToCont',
  LEXICAL_EXT_COMM_RES = 'lexicalExtensionCommsContToInj',
}
