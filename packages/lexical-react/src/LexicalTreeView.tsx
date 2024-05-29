/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {EditorState, LexicalEditor} from 'lexical';

import {
  CustomPrintNodeFn,
  generateContent,
  TreeView as TreeViewCore,
  useLexicalCommandsLog,
} from '@lexical/devtools-core';
import {mergeRegister} from '@lexical/utils';
import * as React from 'react';
import {useEffect, useState} from 'react';

export function TreeView({
  treeTypeButtonClassName,
  timeTravelButtonClassName,
  timeTravelPanelSliderClassName,
  timeTravelPanelButtonClassName,
  viewClassName,
  timeTravelPanelClassName,
  editor,
  customPrintNode,
}: {
  editor: LexicalEditor;
  treeTypeButtonClassName: string;
  timeTravelButtonClassName: string;
  timeTravelPanelButtonClassName: string;
  timeTravelPanelClassName: string;
  timeTravelPanelSliderClassName: string;
  viewClassName: string;
  customPrintNode?: CustomPrintNodeFn;
}): JSX.Element {
  const treeElementRef = React.createRef<HTMLPreElement>();
  const [editorCurrentState, setEditorCurrentState] = useState<EditorState>(
    editor.getEditorState(),
  );

  const commandsLog = useLexicalCommandsLog(editor);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({editorState}) => {
        setEditorCurrentState(editorState);
      }),
      editor.registerEditableListener(() => {
        setEditorCurrentState(editor.getEditorState());
      }),
    );
  }, [editor]);

  useEffect(() => {
    const element = treeElementRef.current;

    if (element !== null) {
      // @ts-ignore Internal field
      element.__lexicalEditor = editor;

      return () => {
        // @ts-ignore Internal field
        element.__lexicalEditor = null;
      };
    }
  }, [editor, treeElementRef]);

  const handleEditorReadOnly = (isReadonly: boolean) => {
    const rootElement = editor.getRootElement();
    if (rootElement == null) {
      return;
    }

    rootElement.contentEditable = isReadonly ? 'false' : 'true';
  };

  return (
    <TreeViewCore
      treeTypeButtonClassName={treeTypeButtonClassName}
      timeTravelButtonClassName={timeTravelButtonClassName}
      timeTravelPanelSliderClassName={timeTravelPanelSliderClassName}
      timeTravelPanelButtonClassName={timeTravelPanelButtonClassName}
      viewClassName={viewClassName}
      timeTravelPanelClassName={timeTravelPanelClassName}
      setEditorReadOnly={handleEditorReadOnly}
      editorState={editorCurrentState}
      setEditorState={(state) => editor.setEditorState(state)}
      generateContent={async function (exportDOM) {
        return generateContent(editor, commandsLog, exportDOM, customPrintNode);
      }}
      ref={treeElementRef}
    />
  );
}
