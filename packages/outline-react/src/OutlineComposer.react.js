/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor} from 'outline';

import * as React from 'react';
import {useState, useMemo, useRef, useEffect} from 'react';
import useOutlineEditor from './useOutlineEditor';
import usePlainText from './useOutlinePlainText';
import useOutlineDecorators from './useOutlineDecorators';
import invariant from 'shared/invariant';

// TODO: Make this configurable
const editorStyle = {
  outline: 0,
  overflowWrap: 'break-word',
  padding: '10px',
  userSelect: 'text',
  whiteSpace: 'pre-wrap',
};

export type OutlineComposerPluginProps = $ReadOnly<{|
  clearEditor: () => void,
  editor: OutlineEditor,
  containerElement: HTMLDivElement | null,
  // Registers a clearEditor function in OutlineComposer, to be provided to plugins
  registerClearEditorFn: (fn: () => void) => void,
|}>;

export type OutlineComposerPluginComponent<TProps> = ({
  outlineProps: OutlineComposerPluginProps,
  pluginProps: TProps,
}) => React$Node;

export type OutlineComposerPlugin<TProps: {...} | null> = $ReadOnly<{|
  name: string,
  component: OutlineComposerPluginComponent<TProps>,
  props: TProps,
|}>;

export type OutlineComposerProps = $ReadOnly<{|
  // $FlowFixMe[unclear-type] Remove/fix this any type. It complains when I pass <{...} | null> and I'm not sure why
  plugins: $ReadOnlyArray<OutlineComposerPlugin<any> | null>,
  isReadOnly?: boolean,
|}>;

// TODO: make this configurable
const editorConfig = {
  theme: {
    paragraph: 'editor-paragraph',
    quote: 'editor-quote',
    heading: {
      h1: 'editor-heading-h1',
      h2: 'editor-heading-h2',
      h3: 'editor-heading-h3',
      h4: 'editor-heading-h4',
      h5: 'editor-heading-h5',
    },
    list: {
      ol: 'editor-list-ol',
      ul: 'editor-list-ul',
    },
    nestedList: {
      listitem: 'editor-nested-list-listitem',
    },
    listitem: 'editor-listitem',
    image: 'editor-image',
    text: {
      bold: 'editor-text-bold',
      link: 'editor-text-link',
      italic: 'editor-text-italic',
      underline: 'editor-text-underline',
      strikethrough: 'editor-text-strikethrough',
      underlineStrikethrough: 'editor-text-underlineStrikethrough',
      code: 'editor-text-code',
    },
    hashtag: 'editor-text-hashtag',
    code: 'editor-code',
    link: 'editor-text-link',
    characterLimit: 'editor-character-limit',
  },
};

function ContentEditable({
  isReadOnly,
  rootElementRef,
}: {
  isReadOnly?: boolean,
  rootElementRef: (null | HTMLElement) => void,
}): React$Node {
  return (
    <div
      className="editor"
      contentEditable={isReadOnly !== true}
      role="textbox"
      ref={rootElementRef}
      spellCheck={true}
      style={editorStyle}
      tabIndex={0}
    />
  );
}

function Placeholder({children}: {children: string}): React.Node {
  return <div className="editor-placeholder">{children}</div>;
}

export default function OutlineComposer({
  plugins,
  isReadOnly = false,
}: OutlineComposerProps): React$Node {
  const [editor, rootElementRef, showPlaceholder] =
    useOutlineEditor(editorConfig);

  // TODO: There's probably a better way to do all this.
  const [clearEditorObject, setClearEditorObject] = useState<{|
    clearEditor: (() => void) | null,
  |}>({
    clearEditor: null,
  });

  const currentClearEditorFn =
    clearEditorObject.clearEditor != null
      ? clearEditorObject.clearEditor
      : () => {
          throw new Error('No clearEditor function registered');
        };

  const decorators = useOutlineDecorators(editor);
  const composerContainerRef = useRef(null);
  const [composerContainerNode, setComposerContainerNode] =
    useState<HTMLDivElement | null>(null);

  // Configure plugins
  const outlinePluginProps: OutlineComposerPluginProps = useMemo(
    () => ({
      editor,
      clearEditor: currentClearEditorFn,
      containerElement: composerContainerNode,
      registerClearEditorFn: (fn) => {
        // Manually check to prevent infinite state update cycles, since this state is set by a child component
        if (clearEditorObject.clearEditor !== fn) {
          setClearEditorObject({clearEditor: fn});
        }
      },
    }),
    [editor, clearEditorObject, composerContainerNode],
  );

  // Does this need to be memoized? I don't think so.
  const pluginComponents: $ReadOnlyArray<React$Node> = plugins
    .filter(Boolean)
    .map(({name, component: Component, props: pluginProps}) => (
      <Component
        pluginProps={pluginProps}
        outlineProps={outlinePluginProps}
        key={name}
      />
    ));
  const pluginNames = useMemo(
    () => plugins.filter(Boolean).map((plugin) => plugin.name),
    [plugins],
  );

  // TODO: Remove this, or create a more permanent way to debug current plugins if needed
  useEffect(() => {
    console.log('Current plugins:');
    pluginNames.forEach((name) => console.log(' * ' + name));
  }, [pluginNames]);

  return (
    <>
      <div
        className="editor-shell"
        ref={(node) => setComposerContainerNode(node)}>
        <ContentEditable
          isReadOnly={isReadOnly}
          rootElementRef={rootElementRef}
        />
        {showPlaceholder && <Placeholder>Enter some plain text...</Placeholder>}
        {decorators}
        {pluginComponents}
      </div>
    </>
  );
}
