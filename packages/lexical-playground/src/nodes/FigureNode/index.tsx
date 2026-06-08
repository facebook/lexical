/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  DOMExportOutput,
  LexicalEditor,
  LexicalNode,
  NodeKey,
} from 'lexical';
import type {JSX} from 'react';

import {$appendNodeToHTML} from '@lexical/html';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useLexicalSlot} from '@lexical/react/useLexicalSlot';
import {$getSlot, $setSlot, DecoratorNode} from 'lexical';
import * as React from 'react';

import {$createEquationNode} from '../EquationNode';

// The Figure is a DecoratorNode host: its `media` slot container is reconciled
// detached (the reconciler owns no inline layout for a decorator host) and
// useLexicalSlot moves it into the React-rendered chrome below. Mirrors Card
// so the host carries no children channel — typing past the slot can't leak
// into a stray paragraph inside the figure.
function FigureComponent({nodeKey}: {nodeKey: NodeKey}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const mediaRef = useLexicalSlot<HTMLDivElement>(editor, nodeKey, 'media');
  return (
    <div className="lexical-figure-chrome">
      <div ref={mediaRef} />
    </div>
  );
}

export class FigureNode extends DecoratorNode<JSX.Element> {
  $config() {
    return this.config('figure', {extends: DecoratorNode});
  }

  createDOM(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'lexical-figure-node';
    return div;
  }

  updateDOM(): false {
    return false;
  }

  isInline(): false {
    return false;
  }

  decorate(): JSX.Element {
    return <FigureComponent nodeKey={this.__key} />;
  }

  // Slots ride in a separate Map, so the HTML exporter never descends into
  // them on its own — like NodeState, slot serialization is opt-in. Emit the
  // `media` slot's contents into a `data-lexical-slot` wrapper the import
  // rule maps back to setSlot(). JSON still serializes slots automatically.
  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const element = document.createElement('div');
    element.className = 'lexical-figure-node';
    const slot = $getSlot(this, 'media');
    if (slot !== null) {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('data-lexical-slot', 'media');
      $appendNodeToHTML(editor, slot, wrapper);
      element.append(wrapper);
    }
    return {element};
  }
}

export function $createFigureNode(): FigureNode {
  const node = new FigureNode();
  $setSlot(node, 'media', $createEquationNode('E=mc^2', false));
  return node;
}

export function $isFigureNode(
  node: LexicalNode | null | undefined,
): node is FigureNode {
  return node instanceof FigureNode;
}
