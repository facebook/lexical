/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

var LexicalComposerContext = require('@lexical/react/LexicalComposerContext');
var react = require('react');

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const CAN_USE_DOM = typeof window !== 'undefined' && typeof window.document !== 'undefined' && typeof window.document.createElement !== 'undefined';

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
const useLayoutEffectImpl = CAN_USE_DOM ? react.useLayoutEffect : react.useEffect;
var useLayoutEffect = useLayoutEffectImpl;

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/**
 * Shortcut to Lexical subscriptions when values are used for render.
 */
function useLexicalSubscription(subscription) {
  const [editor] = LexicalComposerContext.useLexicalComposerContext();
  const initializedSubscription = react.useMemo(() => subscription(editor), [editor, subscription]);
  const valueRef = react.useRef(initializedSubscription.initialValueFn());
  const [value, setValue] = react.useState(valueRef.current);
  useLayoutEffect(() => {
    const {
      initialValueFn,
      subscribe
    } = initializedSubscription;
    const currentValue = initialValueFn();
    if (valueRef.current !== currentValue) {
      valueRef.current = currentValue;
      setValue(currentValue);
    }
    return subscribe(newValue => {
      valueRef.current = newValue;
      setValue(newValue);
    });
  }, [initializedSubscription, subscription]);
  return value;
}

module.exports = useLexicalSubscription;
