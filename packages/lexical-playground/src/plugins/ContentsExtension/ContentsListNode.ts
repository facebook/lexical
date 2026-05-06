/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {$isListItemNode, ListNode} from '@lexical/list';
import {
  $create,
  addClassNamesToElement,
  buildImportMap,
  DOMExportOutput,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
} from 'lexical';

import {$createContentsItemNode, ContentsItemNode} from './ContentsItemNode';

export class ContentsListNode extends ListNode {
  $config() {
    return this.config('contents-list', {
      extends: ListNode,
      importDOM: buildImportMap({
        ul: domNode => {
          if (
            domNode.className === 'lexical-toc' ||
            // Gitlab [[_TOC_]]
            domNode.className === 'section-nav' ||
            domNode.closest('ul.section-nav')
          ) {
            return {
              conversion: () => {
                // reuse parent `after()` to normalize nested lists
                const parentAfterNormalize = ListNode.importDOM?.()
                  ?.ul(domNode)
                  ?.conversion(domNode)?.after;
                return {
                  after: children => {
                    return parentAfterNormalize
                      ? $normalizeListItemToContents(
                          parentAfterNormalize(children),
                        )
                      : children;
                  },
                  node: $createContentsListNode(),
                };
              },
              priority: 1,
            };
          }
          return null;
        },
      }),
    });
  }

  createDOM(config: EditorConfig, editor?: LexicalEditor): HTMLElement {
    const element = super.createDOM(config, editor);
    addClassNamesToElement(element, config.theme.contents);
    return element;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('ul');
    addClassNamesToElement(element, 'lexical-toc');
    return {
      element,
    };
  }

  createListItemNode(): ContentsItemNode {
    return $createContentsItemNode();
  }
}

export function $createContentsListNode() {
  return $create(ContentsListNode);
}

export function $isContentsListNode(node?: LexicalNode | null) {
  return node instanceof ContentsListNode;
}

function $normalizeListItemToContents(
  lexicalNodes: LexicalNode[],
): LexicalNode[] {
  return lexicalNodes.map(node => {
    if ($isListItemNode(node)) {
      return $createContentsItemNode().append(...node.getChildren());
    }
    return node;
  });
}
