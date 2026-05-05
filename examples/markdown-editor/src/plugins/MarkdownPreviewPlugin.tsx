/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$convertToMarkdownString, type Transformer} from '@lexical/markdown';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useEffect, useState} from 'react';

interface MarkdownPreviewPluginProps {
  transformers: Array<Transformer>;
  onChange?: (markdown: string) => void;
}

export function MarkdownPreviewPlugin({
  transformers,
  onChange,
}: MarkdownPreviewPluginProps) {
  const [editor] = useLexicalComposerContext();
  const [markdown, setMarkdown] = useState('');

  useEffect(() => {
    return editor.registerUpdateListener(({editorState}) => {
      editorState.read(
        () => {
          const next = $convertToMarkdownString(transformers);
          setMarkdown(next);
          if (onChange) {
            onChange(next);
          }
        },
        {editor},
      );
    });
  }, [editor, transformers, onChange]);

  return (
    <pre className="m-0 h-full overflow-auto p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
      {markdown}
    </pre>
  );
}
