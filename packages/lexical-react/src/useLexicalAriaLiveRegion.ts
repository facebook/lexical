/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  type AriaLiveRegionHandle,
  type AriaLiveRegionOptions,
  registerAriaLiveRegion,
} from '@lexical/a11y';
import {useCallback, useEffect, useRef} from 'react';

export type {AriaLiveRegionOptions, AriaPoliteness} from '@lexical/a11y';

/**
 * React wrapper around `registerAriaLiveRegion` from `@lexical/a11y`.
 *
 * Mounts a visually hidden `aria-live` region on first render, removes it
 * on unmount, and returns an `announce` function that writes a message
 * into it. The returned function is stable across renders.
 */
export function useLexicalAriaLiveRegion(
  options: AriaLiveRegionOptions = {},
): (message: string) => void {
  const handleRef = useRef<AriaLiveRegionHandle | null>(null);
  const {politeness, owner} = options;
  useEffect(() => {
    const handle = registerAriaLiveRegion({owner, politeness});
    handleRef.current = handle;
    return () => {
      handle.dispose();
      handleRef.current = null;
    };
  }, [politeness, owner]);
  return useCallback((message: string) => {
    const handle = handleRef.current;
    if (handle !== null) {
      handle.announce(message);
    }
  }, []);
}
