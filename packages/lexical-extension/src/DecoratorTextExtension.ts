/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
  StateConfigValue,
  StateValueOrUpdater,
  TextFormatType,
} from 'lexical';
import type {JSX} from 'react';

import {
  $findMatchingParent,
  $getNodeByKey,
  $getSelection,
  $getState,
  $isNodeSelection,
  $isRangeSelection,
  $setState,
  COMMAND_PRIORITY_LOW,
  createState,
  DecoratorNode,
  defineExtension,
  FORMAT_TEXT_COMMAND,
  mergeRegister,
  safeCast,
  TEXT_TYPE_TO_FORMAT,
  toggleTextFormatType,
} from 'lexical';

import {EditorStateExtension} from './EditorStateExtension';
import {namedSignals} from './namedSignals';
import {NodeSelectionExtension} from './NodeSelectionExtension';
import {batch, effect, ReadonlySignal, Signal, signal} from './signals';

export type SerializedDecoratorTextNode = Spread<
  {
    format: number;
  },
  SerializedLexicalNode
>;

const formatState = createState('format', {
  parse: (value) => (typeof value === 'number' ? value : 0),
});

export class DecoratorTextNode extends DecoratorNode<JSX.Element> {
  $config() {
    return this.config('decorator-text', {
      extends: DecoratorNode,
      stateConfigs: [{flat: true, stateConfig: formatState}],
    });
  }

  getFormat(): StateConfigValue<typeof formatState> {
    return $getState(this, formatState);
  }

  getFormatFlags(type: TextFormatType, alignWithFormat: null | number): number {
    return toggleTextFormatType(this.getFormat(), type, alignWithFormat);
  }

  hasFormat(type: TextFormatType): boolean {
    const formatFlag = TEXT_TYPE_TO_FORMAT[type];
    return (this.getFormat() & formatFlag) !== 0;
  }

  setFormat(type: StateValueOrUpdater<typeof formatState>): this {
    return $setState(this, formatState, type);
  }

  toggleFormat(type: TextFormatType): this {
    const format = this.getFormat();
    const newFormat = toggleTextFormatType(format, type, null);
    return this.setFormat(newFormat);
  }

  isInline(): true {
    return true;
  }

  createDOM(): HTMLElement {
    return document.createElement('span');
  }

  updateDOM(): false {
    return false;
  }
}

export function $isDecoratorTextNode(
  node: LexicalNode | null | undefined,
): node is DecoratorTextNode {
  return node instanceof DecoratorTextNode;
}

/**
 * Applies formatting to the node based on the properties in the passed style object.
 * By default, properties are checked according to the values set
 * when importing content from Google Docs.
 * This algorithm is identical to the TextNode import.

 * @param lexicalNode The node to which the format will apply
 * @param style CSS style object
 * @param shouldApply format to apply if it is not in style
 * @returns lexicalNode
 */
export function applyFormatFromStyle(
  lexicalNode: DecoratorTextNode,
  style: CSSStyleDeclaration,
  shouldApply?: TextFormatType,
) {
  const fontWeight = style.fontWeight;
  const textDecoration = style.textDecoration.split(' ');
  // Google Docs uses span tags + font-weight for bold text
  const hasBoldFontWeight = fontWeight === '700' || fontWeight === 'bold';
  // Google Docs uses span tags + text-decoration: line-through for strikethrough text
  const hasLinethroughTextDecoration = textDecoration.includes('line-through');
  // Google Docs uses span tags + font-style for italic text
  const hasItalicFontStyle = style.fontStyle === 'italic';
  // Google Docs uses span tags + text-decoration: underline for underline text
  const hasUnderlineTextDecoration = textDecoration.includes('underline');
  // Google Docs uses span tags + vertical-align to specify subscript and superscript
  const verticalAlign = style.verticalAlign;

  if (hasBoldFontWeight && !lexicalNode.hasFormat('bold')) {
    lexicalNode.toggleFormat('bold');
  }
  if (hasLinethroughTextDecoration && !lexicalNode.hasFormat('strikethrough')) {
    lexicalNode.toggleFormat('strikethrough');
  }
  if (hasItalicFontStyle && !lexicalNode.hasFormat('italic')) {
    lexicalNode.toggleFormat('italic');
  }
  if (hasUnderlineTextDecoration && !lexicalNode.hasFormat('underline')) {
    lexicalNode.toggleFormat('underline');
  }
  if (verticalAlign === 'sub' && !lexicalNode.hasFormat('subscript')) {
    lexicalNode.toggleFormat('subscript');
  }
  if (verticalAlign === 'super' && !lexicalNode.hasFormat('superscript')) {
    lexicalNode.toggleFormat('superscript');
  }
  if (shouldApply && !lexicalNode.hasFormat(shouldApply)) {
    lexicalNode.toggleFormat(shouldApply);
  }

  return lexicalNode;
}

/**
 * The function wraps the passed DOM node in semantic tags depending on the node format.
 *
 * @param lexicalNode The node where the format is checked
 * @param domNode DOM that will be wrapped in tags
 * @param tagNameToFormat Tag name and format mapping
 * @returns domNode
 */
export function applyFormatToDom(
  lexicalNode: DecoratorTextNode,
  domNode: Text | HTMLElement,
  tagNameToFormat = DEFAULT_TAG_NAME_TO_FORMAT,
) {
  for (const [tag, format] of Object.entries(tagNameToFormat)) {
    if (lexicalNode.hasFormat(format)) {
      domNode = wrapElementWith(domNode, tag);
    }
  }
  return domNode;
}

function wrapElementWith(
  element: HTMLElement | Text,
  tag: string,
): HTMLElement {
  const el = document.createElement(tag);
  el.appendChild(element);
  return el;
}

const DEFAULT_TAG_NAME_TO_FORMAT: {[key: string]: TextFormatType} = {
  b: 'bold',
  code: 'code',
  em: 'italic',
  i: 'italic',
  mark: 'highlight',
  s: 'strikethrough',
  strong: 'bold',
  sub: 'subscript',
  sup: 'superscript',
  u: 'underline',
};

const DEFAULT_FOCUS_CLASSNAME = 'selected';

export interface DecoratorTextConfig {
  className: {
    base?: string;
    /** The class that is set when the node is selected. Default is "selected". */
    focus?: string;
  };
}

/**
 * An extension for DecoratorTextNode that sets the format for the node and CSS classes for the DOM container.
 * The base class is always set, and the focus class is set when the node is selected.
 */
export const DecoratorTextExtension = defineExtension({
  build(editor, config, state) {
    return namedSignals(config);
  },
  config: safeCast<DecoratorTextConfig>({
    className: {base: '', focus: DEFAULT_FOCUS_CLASSNAME},
  }),
  dependencies: [EditorStateExtension, NodeSelectionExtension],
  name: '@lexical/extension/DecoratorText',
  nodes: () => [DecoratorTextNode],
  register(editor, config, state) {
    const {className} = state.getOutput();
    const {watchNodeKey} = state.getDependency(NodeSelectionExtension).output;
    const nodeSelectionStore = signal({
      nodeSelections: new Map<
        NodeKey,
        {
          domNode: Signal<null | HTMLElement>;
          selectedSignal: ReadonlySignal<boolean>;
        }
      >(),
    });

    return mergeRegister(
      editor.registerCommand<TextFormatType>(
        FORMAT_TEXT_COMMAND,
        (formatType) => {
          const {nodeSelections} = nodeSelectionStore.peek();
          nodeSelections.forEach(({selectedSignal}, nodeKey) => {
            const isSelected = selectedSignal.peek();
            if (!isSelected) {
              return;
            }

            const selection = $getSelection();

            if ($isNodeSelection(selection)) {
              const node = $getNodeByKey(nodeKey);

              if ($isDecoratorTextNode(node)) {
                node.toggleFormat(formatType);
              }
            } else if ($isRangeSelection(selection)) {
              const nodes = selection.getNodes();

              for (const node of nodes) {
                if ($isDecoratorTextNode(node)) {
                  node.toggleFormat(formatType);
                } else {
                  const decoratorText = $findMatchingParent(
                    node,
                    $isDecoratorTextNode,
                  );
                  if (decoratorText !== null) {
                    decoratorText.toggleFormat(formatType);
                  }
                }
              }
            }
          });

          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerMutationListener(DecoratorTextNode, (nodes, payload) => {
        batch(() => {
          let didChange = false;
          const {nodeSelections} = nodeSelectionStore.peek();
          for (const [k, v] of nodes.entries()) {
            if (v === 'destroyed') {
              nodeSelections.delete(k);
              didChange = true;
            } else {
              const prev = nodeSelections.get(k);
              const dom = editor.getElementByKey(k);
              if (prev) {
                prev.domNode.value = dom;
              } else {
                didChange = true;
                nodeSelections.set(k, {
                  domNode: signal(dom),
                  selectedSignal: watchNodeKey(k),
                });
              }
            }
          }
          if (didChange) {
            nodeSelectionStore.value = {nodeSelections};
          }
        });
      }),
      effect(() => {
        const effects = [];
        for (const {
          domNode,
          selectedSignal,
        } of nodeSelectionStore.value.nodeSelections.values()) {
          effects.push(
            effect(() => {
              const dom = domNode.value;
              if (dom) {
                const {base, focus} = className.value;
                const isSelected = selectedSignal.value;
                if (base !== undefined) {
                  dom.className = base;
                }
                if (isSelected) {
                  dom.classList.add(focus ?? DEFAULT_FOCUS_CLASSNAME);
                }
              }
            }),
          );
        }
        return mergeRegister(...effects);
      }),
    );
  },
});
