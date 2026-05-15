/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {DOMConversionMap, DOMConversionOutput, NodeKey} from 'lexical';
import type {JSX} from 'react';

import {
  $isHorizontalRuleNode,
  HorizontalRuleNode as BaseHorizontalRuleNode,
  INSERT_HORIZONTAL_RULE_COMMAND,
  type SerializedHorizontalRuleNode,
} from '@lexical/extension';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useLexicalNodeSelection} from '@lexical/react/useLexicalNodeSelection';
import {
  addClassNamesToElement,
  mergeRegister,
  removeClassNamesFromElement,
} from '@lexical/utils';
import {
  $applyNodeReplacement,
  $getEditorDOMRenderConfig,
  $getNodeByKey,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
} from 'lexical';
import * as React from 'react';
import {useEffect} from 'react';

export {
  $isHorizontalRuleNode,
  INSERT_HORIZONTAL_RULE_COMMAND,
  type SerializedHorizontalRuleNode,
};

function HorizontalRuleComponent({nodeKey}: {nodeKey: NodeKey}) {
  const [editor] = useLexicalComposerContext();
  const [isSelected, setSelected, clearSelection] =
    useLexicalNodeSelection(nodeKey);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        CLICK_COMMAND,
        (event: MouseEvent) => {
          const hrElem = editor.getElementByKey(nodeKey);

          if (hrElem === null || !(event.target instanceof Node)) {
            return false;
          }
          // Hit-test against the slot's inner `<hr>`, not the keyed DOM. With
          // an extension-added wrapper, the keyed DOM is the wrapper and
          // includes the gutter + any sibling controls (e.g. a drag handle);
          // restricting `contains` to the inner element keeps clicks on
          // those siblings from registering as an HR selection.
          let target: HTMLElement = hrElem;
          editor.getEditorState().read(() => {
            const node = $getNodeByKey(nodeKey);
            if (node !== null) {
              target = $getEditorDOMRenderConfig(editor).$getDOMSlot(
                node,
                hrElem,
                editor,
              ).element;
            }
          });
          if (target.contains(event.target)) {
            if (!event.shiftKey) {
              clearSelection();
            }
            setSelected(!isSelected);
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [clearSelection, editor, isSelected, nodeKey, setSelected]);

  useEffect(() => {
    const hrElem = editor.getElementByKey(nodeKey);
    const isSelectedClassName = editor._config.theme.hrSelected ?? 'selected';

    if (hrElem !== null) {
      // Apply the selected class to the slot's content-bearing element (the
      // actual `<hr>`) rather than the keyed DOM, so a wrapper added by an
      // extension doesn't dilute the theme's compound selector
      // (`.PlaygroundEditorTheme__hr.PlaygroundEditorTheme__hrSelected`).
      let target: HTMLElement = hrElem;
      editor.getEditorState().read(() => {
        const node = $getNodeByKey(nodeKey);
        if (node !== null) {
          target = $getEditorDOMRenderConfig(editor).$getDOMSlot(
            node,
            hrElem,
            editor,
          ).element;
        }
      });
      if (isSelected) {
        addClassNamesToElement(target, isSelectedClassName);
      } else {
        removeClassNamesFromElement(target, isSelectedClassName);
      }
    }
  }, [editor, isSelected, nodeKey]);

  return null;
}

/**
 * @deprecated A pure Lexical implementation is available in `@lexical/extension` as HorizontalRuleExtension
 */
export class HorizontalRuleNode extends BaseHorizontalRuleNode {
  static getType(): string {
    return 'horizontalrule';
  }

  static clone(node: HorizontalRuleNode): HorizontalRuleNode {
    return new HorizontalRuleNode(node.__key);
  }

  static importJSON(
    serializedNode: SerializedHorizontalRuleNode,
  ): HorizontalRuleNode {
    return $createHorizontalRuleNode().updateFromJSON(serializedNode);
  }

  static importDOM(): DOMConversionMap | null {
    return {
      hr: () => ({
        conversion: $convertHorizontalRuleElement,
        priority: 0,
      }),
    };
  }

  decorate(): JSX.Element {
    return <HorizontalRuleComponent nodeKey={this.__key} />;
  }
}

function $convertHorizontalRuleElement(): DOMConversionOutput {
  return {node: $createHorizontalRuleNode()};
}

/**
 * @deprecated A pure Lexical implementation is available in `@lexical/extension` as HorizontalRuleExtension
 */
export function $createHorizontalRuleNode(): HorizontalRuleNode {
  return $applyNodeReplacement(new HorizontalRuleNode());
}
