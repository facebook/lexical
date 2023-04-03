/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {useEffect, useRef} from 'react';

export default function usePrevious<TRefType = unknown>(value: TRefType) {
  const ref = useRef<TRefType>();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}
