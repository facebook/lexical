/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $isHorizontalRuleNode,
  HorizontalRuleNode as BaseHorizontalRuleNode,
  INSERT_HORIZONTAL_RULE_COMMAND,
  type SerializedHorizontalRuleNode,
} from '@lexical/extension';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useLexicalNodeSelection} from '@lexical/react/useLexicalNodeSelection';
import {
  $applyNodeReplacement,
  addClassNamesToElement,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  type DOMConversionOutput,
  getComposedEventTarget,
  mergeRegister,
  type NodeKey,
  removeClassNamesFromElement,
} from 'lexical';
import * as React from 'react';
import {type JSX, useEffect} from 'react';

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

          if (getComposedEventTarget(event) === hrElem) {
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
      if (isSelected) {
        addClassNamesToElement(hrElem, isSelectedClassName);
      } else {
        removeClassNamesFromElement(hrElem, isSelectedClassName);
      }
    }
  }, [editor, isSelected, nodeKey]);

  return null;
}

/**
 * @deprecated A pure Lexical implementation is available in `@lexical/extension` as HorizontalRuleExtension
 */
export class HorizontalRuleNode extends BaseHorizontalRuleNode {
  $config() {
    // `extends` is left to the runtime default (the prototype parent,
    // BaseHorizontalRuleNode) so this deprecated subclass infers a `$config()`
    // shape compatible with the base node it reuses the 'horizontalrule' type
    // from.
    return this.config('horizontalrule', {
      importDOM: {
        hr: () => ({
          conversion: $convertHorizontalRuleElement,
          priority: 0,
        }),
      },
    });
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
