/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {EditorConfig, NodeKey, SerializedTextNode, Spread} from 'lexical';

import {TextNode} from 'lexical';

// import * as React from 'react';
// import {useSharedAutocompleteContext} from '../context/SharedAutocompleteContext';
import {uuid as UUID} from '../plugins/AutocompletePlugin';

declare global {
  interface Navigator {
    userAgentData?: {
      mobile: boolean;
    };
  }
}

export type SerializedAutocompleteNode = Spread<
  {
    uuid: string;
  },
  SerializedTextNode
>;

export class AutocompleteNode extends TextNode {
  /**
   * A unique uuid is generated for each session and assigned to the instance.
   * This helps to:
   * - Ensures max one Autocomplete node per session.
   * - Ensure that when collaboration is enabled, this node is not shown in
   *   other sessions.
   * See https://github.com/facebook/lexical/blob/master/packages/lexical-playground/src/plugins/AutocompletePlugin/index.tsx#L39
   */
  __uuid: string;

  static clone(node: AutocompleteNode): AutocompleteNode {
    return new AutocompleteNode(node.__text, node.__uuid, node.__key);
  }

  static getType(): 'autocomplete' {
    return 'autocomplete';
  }

  static importJSON(
    serializedNode: SerializedAutocompleteNode,
  ): AutocompleteNode {
    const node = $createAutocompleteNode(
      serializedNode.text,
      serializedNode.uuid,
    );
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  exportJSON(): SerializedAutocompleteNode {
    return {
      ...super.exportJSON(),
      type: 'autocomplete',
      uuid: this.__uuid,
      version: 1,
    };
  }

  constructor(text: string, uuid: string, key?: NodeKey) {
    super(text, key);
    this.__uuid = uuid;
  }

  updateDOM(
    prevNode: unknown,
    dom: HTMLElement,
    config: EditorConfig,
  ): boolean {
    return false;
  }

  createDOM(config: EditorConfig): HTMLElement {
    if (this.__uuid !== UUID) {
      return document.createElement('span');
    }
    const dom = super.createDOM(config);
    dom.classList.add(config.theme.autocomplete);
    return dom;
  }
}

export function $createAutocompleteNode(
  text: string,
  uuid: string,
): AutocompleteNode {
  return new AutocompleteNode(text, uuid);
}

// function AutocompleteComponent({
//   className,
// }: {
//   className: EditorThemeClassName;
// }): JSX.Element {
//   const [suggestion] = useSharedAutocompleteContext();
//   const userAgentData = window.navigator.userAgentData;
//   const isMobile =
//     userAgentData !== undefined
//       ? userAgentData.mobile
//       : window.innerWidth <= 800 && window.innerHeight <= 600;
//   return (
//     <span className={className} spellCheck="false">
//       {suggestion} {isMobile ? '(SWIPE \u2B95)' : '(TAB)'}
//     </span>
//   );
// }
