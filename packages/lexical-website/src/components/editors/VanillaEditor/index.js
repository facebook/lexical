/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './styles.css';

import {registerPlainText} from '@lexical/plain-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
} from 'lexical';
import {useEffect, useRef} from 'react';

const theme = {
  paragraph: 'editor-paragraph',
};

export default function VanillaEditor() {
  const editorRef = useRef(null);
  const editorInstanceRef = useRef(null);

  useEffect(() => {
    if (editorInstanceRef.current || !editorRef.current) {
      return;
    }

    const editor = createEditor({
      namespace: 'VanillaEditor',
      onError: (error) => console.error(error),
      theme,
    });

    editor.setRootElement(editorRef.current);
    const unregister = registerPlainText(editor);
    editorInstanceRef.current = editor;
    editor.update(() => {
      const root = $getRoot();
      const paragraphNode = $createParagraphNode();
      const textNode = $createTextNode('This is boilerplate text...');
      paragraphNode.append(textNode);
      root.append(paragraphNode);
    });

    return () => {
      unregister();
      editor.setRootElement(null);
      editorInstanceRef.current = null;
    };
  }, []);

  return (
    <div id="vanilla-editor">
      <div
        ref={editorRef}
        contentEditable={true}
        aria-placeholder="Start typing..."
      />
    </div>
  );
}
