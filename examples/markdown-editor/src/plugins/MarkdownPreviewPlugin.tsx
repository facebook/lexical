/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useExtensionSignalValue} from '@lexical/react/useExtensionSignalValue';
import {useEffect} from 'react';

import {MarkdownExtension} from '../extensions/MarkdownExtension';

interface MarkdownPreviewPluginProps {
  onChange?: (markdown: string) => void;
}

export function MarkdownPreviewPlugin({onChange}: MarkdownPreviewPluginProps) {
  const markdown = useExtensionSignalValue(MarkdownExtension, 'markdown');

  useEffect(() => {
    if (onChange) {
      onChange(markdown);
    }
  }, [markdown, onChange]);

  return (
    <pre className="m-0 h-full overflow-auto p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
      {markdown}
    </pre>
  );
}
