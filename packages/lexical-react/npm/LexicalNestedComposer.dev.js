/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

var LexicalCollaborationContext = require('@lexical/react/LexicalCollaborationContext');
var LexicalComposerContext = require('@lexical/react/LexicalComposerContext');
var React = require('react');

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
function LexicalNestedComposer({
  initialEditor,
  children,
  initialNodes,
  initialTheme,
  skipCollabChecks
}) {
  const wasCollabPreviouslyReadyRef = React.useRef(false);
  const parentContext = React.useContext(LexicalComposerContext.LexicalComposerContext);
  if (parentContext == null) {
    {
      throw Error(`Unexpected parent context null on a nested composer`);
    }
  }
  const [parentEditor, {
    getTheme: getParentTheme
  }] = parentContext;
  const composerContext = React.useMemo(() => {
    const composerTheme = initialTheme || getParentTheme() || undefined;
    const context = LexicalComposerContext.createLexicalComposerContext(parentContext, composerTheme);
    if (composerTheme !== undefined) {
      initialEditor._config.theme = composerTheme;
    }
    initialEditor._parentEditor = parentEditor;
    if (!initialNodes) {
      const parentNodes = initialEditor._nodes = new Map(parentEditor._nodes);
      for (const [type, entry] of parentNodes) {
        initialEditor._nodes.set(type, {
          klass: entry.klass,
          replace: entry.replace,
          replaceWithKlass: entry.replaceWithKlass,
          transforms: new Set()
        });
      }
    } else {
      for (const klass of initialNodes) {
        const type = klass.getType();
        initialEditor._nodes.set(type, {
          klass,
          replace: null,
          replaceWithKlass: null,
          transforms: new Set()
        });
      }
    }
    initialEditor._config.namespace = parentEditor._config.namespace;
    initialEditor._editable = parentEditor._editable;
    return [initialEditor, context];
  },
  // We only do this for init
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  // If collaboration is enabled, make sure we don't render the children until the collaboration subdocument is ready.
  const {
    isCollabActive,
    yjsDocMap
  } = LexicalCollaborationContext.useCollaborationContext();
  const isCollabReady = skipCollabChecks || wasCollabPreviouslyReadyRef.current || yjsDocMap.has(initialEditor.getKey());
  React.useEffect(() => {
    if (isCollabReady) {
      wasCollabPreviouslyReadyRef.current = true;
    }
  }, [isCollabReady]);

  // Update `isEditable` state of nested editor in response to the same change on parent editor.
  React.useEffect(() => {
    return parentEditor.registerEditableListener(editable => {
      initialEditor.setEditable(editable);
    });
  }, [initialEditor, parentEditor]);
  return /*#__PURE__*/React.createElement(LexicalComposerContext.LexicalComposerContext.Provider, {
    value: composerContext
  }, !isCollabActive || isCollabReady ? children : null);
}

exports.LexicalNestedComposer = LexicalNestedComposer;
