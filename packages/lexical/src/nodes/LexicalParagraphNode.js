/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */
import type {
  EditorConfig,
  EditorThemeClasses,
  LexicalEditor,
} from '../LexicalEditor';
import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  LexicalNode,
} from '../LexicalNode';
import type {SerializedElementNode} from './LexicalElementNode';

import invariant from '../../../shared/src/invariant';
import {getCachedClassNameArray} from '../LexicalUtils';
import {ElementNode} from './LexicalElementNode';
import {$isTextNode} from './LexicalTextNode';

type SerializedParagraphNode = {
  ...SerializedElementNode,
  ...
};

export class ParagraphNode extends ElementNode {
  static getType(): string {
    return 'paragraph';
  }

  static clone(node: ParagraphNode): ParagraphNode {
    return new ParagraphNode(node.__key);
  }

  serialize(): SerializedParagraphNode {
    const {__format, __key, __indent, __dir} = this;
    const serializedChildren = [];
    const nodeChildren = this.getChildren();
    for (let i = 0; i < nodeChildren.length; i++) {
      serializedChildren.push(nodeChildren[i].serialize());
    }
    return {
      __children: serializedChildren,
      __dir,
      __format,
      __indent,
      __key,
      __type: this.getType(),
    };
  }
  static deserialize(
    json: SerializedParagraphNode,
    editor: LexicalEditor,
  ): ParagraphNode {
    if (json.__type === this.getType()) {
      const {__format, __key, __children, __indent, __dir} = json;
      const node = new ParagraphNode(__key);
      node.__format = __format;
      node.setDirection(__dir);
      node.setIndent(__indent);
      // Are we just supposed to copy and paste this in every element node?
      // there has to be a better way to handle children...
      for (let i = 0; i < __children.length; i++) {
        const currentChild = __children[i];
        const childNode = editor._nodes.get(currentChild.__type);
        if (childNode !== undefined) {
          const child = childNode.klass.deserialize(currentChild, editor);
          child.__parent = __key;
          node.__children.push(child.__key);
        }
      }
      return node;
    }
    invariant(false, 'Type mismatch');
  }

  // View

  createDOM(config: EditorConfig): HTMLElement {
    const dom = document.createElement('p');
    const classNames = getCachedClassNameArray<EditorThemeClasses>(
      config.theme,
      'paragraph',
    );
    if (classNames !== undefined) {
      const domClassList = dom.classList;
      domClassList.add(...classNames);
    }
    return dom;
  }
  updateDOM(prevNode: ParagraphNode, dom: HTMLElement): boolean {
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      p: (node: Node) => ({
        conversion: convertParagraphElement,
        priority: 0,
      }),
    };
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const {element} = super.exportDOM(editor);

    if (element) {
      if (this.getTextContentSize() === 0) {
        element.append(document.createElement('br'));
      }
    }

    return {
      element,
    };
  }

  // Mutation

  insertNewAfter(): ParagraphNode {
    const newElement = $createParagraphNode();
    const direction = this.getDirection();
    newElement.setDirection(direction);
    this.insertAfter(newElement);
    return newElement;
  }

  collapseAtStart(): boolean {
    const children = this.getChildren();
    // If we have an empty (trimmed) first paragraph and try and remove it,
    // delete the paragraph as long as we have another sibling to go to
    if (
      children.length === 0 ||
      ($isTextNode(children[0]) && children[0].getTextContent().trim() === '')
    ) {
      const nextSibling = this.getNextSibling();
      if (nextSibling !== null) {
        this.selectNext();
        this.remove();
        return true;
      }
      const prevSibling = this.getPreviousSibling();
      if (prevSibling !== null) {
        this.selectPrevious();
        this.remove();
        return true;
      }
    }
    return false;
  }
}

function convertParagraphElement(): DOMConversionOutput {
  return {node: $createParagraphNode()};
}

export function $createParagraphNode(): ParagraphNode {
  return new ParagraphNode();
}

export function $isParagraphNode(node: ?LexicalNode): boolean %checks {
  return node instanceof ParagraphNode;
}
