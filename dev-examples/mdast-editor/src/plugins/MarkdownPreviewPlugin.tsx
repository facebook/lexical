/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useExtensionSignalValue} from '@lexical/react/useExtensionSignalValue';

import {MdastEditorExtension} from '../extensions/MdastEditorExtension';

export function MarkdownPreviewPlugin() {
  const markdown = useExtensionSignalValue(MdastEditorExtension, 'markdown');
  return (
    <pre className="m-0 h-full overflow-auto p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
      {markdown}
    </pre>
  );
}
