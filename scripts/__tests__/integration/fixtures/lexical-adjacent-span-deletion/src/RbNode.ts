import {
  $isTextNode,
  DOMConversionMap,
  ElementNode,
  NodeKey,
  SerializedElementNode,
  Spread,
  TextNode,
} from 'lexical';

export type SerializedRbNode = Spread<
  { type: 'rb'; version: 1 },
  SerializedElementNode
>;

export class RbNode extends ElementNode {
  // ---------------------------------------------------------------------------
  //
  // Ctor and clone
  //
  // ---------------------------------------------------------------------------

  constructor(key?: NodeKey) {
    super(key);
  }

  static clone(node: RbNode): RbNode {
    return new RbNode(node.__key);
  }

  // ---------------------------------------------------------------------------
  //
  // Local properties
  //
  // ---------------------------------------------------------------------------

  getTextChildren(): TextNode[] {
    const textNodes = this.getChildren().filter($isTextNode) || null;
    if (!textNodes) {
      return [];
    }
    return textNodes;
  }

  // ---------------------------------------------------------------------------
  //
  // Node overrides
  //
  // ---------------------------------------------------------------------------

  static getType(): string {
    return 'rb';
  }

  isInline() {
    return true;
  }

  // ---------------------------------------------------------------------------
  //
  // JSON import/export
  //
  // ---------------------------------------------------------------------------

  static importJSON(): RbNode {
    return $createRbNode();
  }

  exportJSON(): SerializedRbNode {
    return { ...super.exportJSON(), type: 'rb', version: 1 };
  }

  // ---------------------------------------------------------------------------
  //
  // DOM import/export
  //
  // ---------------------------------------------------------------------------

  static importDOM(): DOMConversionMap | null {
    return null;
  }

  exportDOM() {
    return { element: document.createElement('span') };
  }

  // ---------------------------------------------------------------------------
  //
  // DOM rendering
  //
  // ---------------------------------------------------------------------------

  createDOM(): HTMLSpanElement {
    const element = document.createElement('span');
    element.style.display = 'contents';
    element.dataset.type = 'ruby base';
    return element;
  }

  updateDOM(_prevNode: RbNode) {
    return false;
  }
}

// -----------------------------------------------------------------------------
//
// Factory and identity functions
//
// -----------------------------------------------------------------------------

export function $createRbNode(): RbNode {
  return new RbNode();
}

export function isRbNode(node: unknown): node is RbNode {
  return node instanceof RbNode;
}