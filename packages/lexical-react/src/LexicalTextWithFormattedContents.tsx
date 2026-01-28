/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {NodeKey, TextFormatType} from 'lexical';
import type {JSX} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$isDecoratorTextNode} from '@lexical/react/LexicalDecoratorTextNode';
import {useLexicalNodeSelection} from '@lexical/react/useLexicalNodeSelection';
import {mergeRegister} from '@lexical/utils';
import {
  $findMatchingParent,
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
} from 'lexical';
import * as React from 'react';
import {ReactNode, useEffect, useRef} from 'react';

type Props = Readonly<{
  children: ReactNode;
  nodeKey: NodeKey;
  className: Readonly<{
    base: string;
    focus: string;
  }>;
}>;

export function TextWithFormattedContents({
  children,
  nodeKey,
  className,
}: Props): JSX.Element {
  const [editor] = useLexicalComposerContext();

  const [isSelected] = useLexicalNodeSelection(nodeKey);
  const ref = useRef(null);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand<TextFormatType>(
        FORMAT_TEXT_COMMAND,
        (formatType) => {
          if (isSelected) {
            const selection = $getSelection();

            if ($isNodeSelection(selection)) {
              const node = $getNodeByKey(nodeKey);

              if ($isDecoratorTextNode(node)) {
                const newFormat = node.getFormatFlags(formatType, null);
                node.setFormat(newFormat);
              }
            } else if ($isRangeSelection(selection)) {
              const nodes = selection.getNodes();

              for (const node of nodes) {
                if ($isDecoratorTextNode(node)) {
                  const newFormat = node.getFormatFlags(formatType, null);
                  node.setFormat(newFormat);
                } else {
                  const decoratorText = $findMatchingParent(
                    node,
                    $isDecoratorTextNode,
                  );
                  if (decoratorText !== null) {
                    const newFormat = decoratorText.getFormatFlags(
                      formatType,
                      null,
                    );
                    decoratorText.setFormat(newFormat);
                  }
                }
              }
            }
          }

          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, isSelected, nodeKey]);

  return (
    <div
      className={[className.base, isSelected ? className.focus : null]
        .filter(Boolean)
        .join(' ')}
      ref={ref}>
      {children}
    </div>
  );
}
