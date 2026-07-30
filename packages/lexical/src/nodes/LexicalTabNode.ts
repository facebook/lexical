/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {EditorConfig} from '../LexicalEditor';
import type {LexicalNode, NodeKey} from '../LexicalNode';

import invariant from '@lexical/internal/invariant';

import {IS_UNMERGEABLE} from '../LexicalConstants';
import {$applyNodeReplacement, getCachedClassNameArray} from '../LexicalUtils';
import {
  type SerializedTextNode,
  type TextDetailType,
  type TextModeType,
  TextNode,
} from './LexicalTextNode';

export type SerializedTabNode = SerializedTextNode;

/** @noInheritDoc */
export class TabNode extends TextNode {
  $config() {
    return this.config('tab', {extends: TextNode});
  }

  // `key` carries an explicit `undefined` default (rather than the usual `?`)
  // so the constructor reports zero required arguments, which lets `$config`
  // synthesize the static `clone` by invoking the no-argument constructor.
  constructor(key: NodeKey | undefined = undefined) {
    super('\t', key);
    this.__detail = IS_UNMERGEABLE;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    const classNames = getCachedClassNameArray(config.theme, 'tab');

    if (classNames !== undefined) {
      const domClassList = dom.classList;
      domClassList.add(...classNames);
    }
    return dom;
  }

  /**
   * Always normalizes the stored content to `'\t'` regardless of input — see
   * comment below for the rationale.
   */
  setTextContent(_text: string): this {
    // The stored content is canonical regardless of input. Safari's
    // MutationObserver can deliver mid-IME-composition writes onto the
    // TabNode's `\t` text node (verified with Korean), and `flushMutations`
    // then calls this with the in-flight composition payload; throwing here
    // cascaded through `onError` and froze the editor (#8596). The dropped
    // check was guarding caller assumptions, not stored state — the
    // reconciler renders the canonical content on the next update.
    return super.setTextContent('\t');
  }

  spliceText(
    offset: number,
    delCount: number,
    newText: string,
    moveSelection?: boolean,
  ): TextNode {
    invariant(
      (newText === '' && delCount === 0) ||
        (newText === '\t' && delCount === 1),
      'TabNode does not support spliceText',
    );
    return this;
  }

  setDetail(detail: TextDetailType | number): this {
    invariant(detail === IS_UNMERGEABLE, 'TabNode does not support setDetail');
    return this;
  }

  setMode(type: TextModeType): this {
    invariant(type === 'normal', 'TabNode does not support setMode');
    return this;
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }
}

export function $createTabNode(): TabNode {
  return $applyNodeReplacement(new TabNode());
}

export function $isTabNode(
  node: LexicalNode | null | undefined,
): node is TabNode {
  return node instanceof TabNode;
}
