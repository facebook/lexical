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
import {useState} from 'react';
import useOutlineEditor from './useOutlineEditor';
import usePlainText from './useOutlinePlainText';
import useOutlineDecorators from './useOutlineDecorators';

const editorStyle = {
  outline: 0,
  overflowWrap: 'break-word',
  padding: '10px',
  userSelect: 'text',
  whiteSpace: 'pre-wrap',
};

export type OutlineComposerPluginProps = $ReadOnly<{|editor: OutlineEditor|}>;
export type OutlineComposerPluginComponent =
  (OutlineComposerPluginProps) => React$Node;
export type OutlineComposerPlugin = $ReadOnly<{|
  name: string,
  component: OutlineComposerPluginComponent,
|}>;

export type OutlineComposerProps = $ReadOnly<{|
  plugins: $ReadOnlyArray<OutlineComposerPlugin>,
|}>;

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
}: OutlineComposerProps): React$Node {
  const [editor, rootElementRef, showPlaceholder] =
    useOutlineEditor(editorConfig);
  const [isReadOnly, setIsReadyOnly] = useState(false);
  const clear = usePlainText(editor);
  const decorators = useOutlineDecorators(editor);
  const pluginComponents: $ReadOnlyArray<React$Node> = plugins.map(
    ({component: Component}) => <Component editor={editor} />,
  );

  return (
    <>
      <ContentEditable
        isReadOnly={isReadOnly}
        rootElementRef={rootElementRef}
      />
      {showPlaceholder && <Placeholder>Enter some plain text...</Placeholder>}
      {decorators}
      {pluginComponents}
      <div className="actions">
        <button
          className="action-button clear"
          onClick={() => {
            clear();
            editor.focus();
          }}>
          Clear
        </button>
        <button
          className="action-button lock"
          onClick={() => setIsReadyOnly(!isReadOnly)}>
          <i className={isReadOnly ? 'unlock' : 'lock'} />
        </button>
      </div>
    </>
  );
}
