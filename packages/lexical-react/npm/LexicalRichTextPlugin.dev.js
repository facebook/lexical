/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

var LexicalComposerContext = require('@lexical/react/LexicalComposerContext');
var useLexicalEditable = require('@lexical/react/useLexicalEditable');
var React = require('react');
var text = require('@lexical/text');
var utils = require('@lexical/utils');
var reactDom = require('react-dom');
var dragon = require('@lexical/dragon');
var richText = require('@lexical/rich-text');

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
const useLayoutEffectImpl = CAN_USE_DOM ? React.useLayoutEffect : React.useEffect;
var useLayoutEffect = useLayoutEffectImpl;

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
function canShowPlaceholderFromCurrentEditorState(editor) {
  const currentCanShowPlaceholder = editor.getEditorState().read(text.$canShowPlaceholderCurry(editor.isComposing()));
  return currentCanShowPlaceholder;
}
function useCanShowPlaceholder(editor) {
  const [canShowPlaceholder, setCanShowPlaceholder] = React.useState(() => canShowPlaceholderFromCurrentEditorState(editor));
  useLayoutEffect(() => {
    function resetCanShowPlaceholder() {
      const currentCanShowPlaceholder = canShowPlaceholderFromCurrentEditorState(editor);
      setCanShowPlaceholder(currentCanShowPlaceholder);
    }
    resetCanShowPlaceholder();
    return utils.mergeRegister(editor.registerUpdateListener(() => {
      resetCanShowPlaceholder();
    }), editor.registerEditableListener(() => {
      resetCanShowPlaceholder();
    }));
  }, [editor]);
  return canShowPlaceholder;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
function useDecorators(editor, ErrorBoundary) {
  const [decorators, setDecorators] = React.useState(() => editor.getDecorators());

  // Subscribe to changes
  useLayoutEffect(() => {
    return editor.registerDecoratorListener(nextDecorators => {
      reactDom.flushSync(() => {
        setDecorators(nextDecorators);
      });
    });
  }, [editor]);
  React.useEffect(() => {
    // If the content editable mounts before the subscription is added, then
    // nothing will be rendered on initial pass. We can get around that by
    // ensuring that we set the value.
    setDecorators(editor.getDecorators());
  }, [editor]);

  // Return decorators defined as React Portals
  return React.useMemo(() => {
    const decoratedPortals = [];
    const decoratorKeys = Object.keys(decorators);
    for (let i = 0; i < decoratorKeys.length; i++) {
      const nodeKey = decoratorKeys[i];
      const reactDecorator = /*#__PURE__*/React.createElement(ErrorBoundary, {
        onError: e => editor._onError(e)
      }, /*#__PURE__*/React.createElement(React.Suspense, {
        fallback: null
      }, decorators[nodeKey]));
      const element = editor.getElementByKey(nodeKey);
      if (element !== null) {
        decoratedPortals.push( /*#__PURE__*/reactDom.createPortal(reactDecorator, element, nodeKey));
      }
    }
    return decoratedPortals;
  }, [ErrorBoundary, decorators, editor]);
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
function useRichTextSetup(editor) {
  useLayoutEffect(() => {
    return utils.mergeRegister(richText.registerRichText(editor), dragon.registerDragonSupport(editor));

    // We only do this for init
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
function RichTextPlugin({
  contentEditable,
  placeholder,
  ErrorBoundary
}) {
  const [editor] = LexicalComposerContext.useLexicalComposerContext();
  const decorators = useDecorators(editor, ErrorBoundary);
  useRichTextSetup(editor);
  return /*#__PURE__*/React.createElement(React.Fragment, null, contentEditable, /*#__PURE__*/React.createElement(Placeholder, {
    content: placeholder
  }), decorators);
}
function Placeholder({
  content
}) {
  const [editor] = LexicalComposerContext.useLexicalComposerContext();
  const showPlaceholder = useCanShowPlaceholder(editor);
  const editable = useLexicalEditable();
  if (!showPlaceholder) {
    return null;
  }
  if (typeof content === 'function') {
    return content(editable);
  } else {
    return content;
  }
}

exports.RichTextPlugin = RichTextPlugin;
