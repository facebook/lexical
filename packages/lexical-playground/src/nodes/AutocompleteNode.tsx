/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {DecoratorNode, EditorConfig, NodeKey} from 'lexical';
import * as React from 'react';

import {useSharedAutocompleteContext} from '../context/SharedAutocompleteContext';
import {uuid as UUID} from '../plugins/AutocompletePlugin';

declare global {
  interface Navigator {
    userAgentData?: {
      mobile: boolean;
    };
  }
}

export class AutocompleteNode extends DecoratorNode<JSX.Element | null> {
  // TODO add comment
  __uuid: string;

  static clone(node: AutocompleteNode): AutocompleteNode {
    return new AutocompleteNode(node.__key);
  }

  static getType(): 'autocomplete' {
    return 'autocomplete';
  }

  constructor(uuid: string, key?: NodeKey) {
    super(key);
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
    return document.createElement('span');
  }

  decorate(): JSX.Element | null {
    if (this.__uuid !== UUID) {
      return null;
    }
    return <AutocompleteComponent />;
  }
}

export function $createAutocompleteNode(uuid: string): AutocompleteNode {
  return new AutocompleteNode(uuid);
}

function AutocompleteComponent(): JSX.Element {
  const [suggestion] = useSharedAutocompleteContext();
  const userAgentData = window.navigator.userAgentData;
  const isMobile =
    userAgentData !== undefined
      ? userAgentData.mobile
      : window.innerWidth <= 800 && window.innerHeight <= 600;
  // TODO Move to theme
  return (
    <span style={{color: '#ccc'}} spellCheck="false">
      {suggestion} {isMobile ? '(SWIPE \u2B95)' : '(TAB)'}
    </span>
  );
}
