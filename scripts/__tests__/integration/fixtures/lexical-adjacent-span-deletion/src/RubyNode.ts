import { mergeRegister } from '@lexical/utils';
import {
  $isParagraphNode,
  $isTextNode,
  DOMConversionMap,
  ElementNode,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedElementNode,
  SerializedLexicalNode,
  Spread,
  TextNode,
} from 'lexical';

import { $createRbNode, RbNode, isRbNode } from './RbNode';

import { countGraphemes, getGraphemeBoundaries } from './graphemes';
import { jsonEqualish } from './json-equalish';
import { exportJsonSubtree } from './lexical-utils';
import { $getClosest, $removeDescendantsInclusive } from './node-utils';

export type SerializedRubyNode = Spread<
  {
    type: 'ruby';
    version: 1;
  },
  SerializedElementNode
>;

export class RubyNode extends ElementNode {
  private lastBaseTextSnapshot: SerializedLexicalNode[] | null = null;

  // ---------------------------------------------------------------------------
  //
  // Ctor and clone
  //
  // ---------------------------------------------------------------------------

  constructor(key?: NodeKey) {
    super(key);
  }

  static clone(node: RubyNode): RubyNode {
    const clone = new RubyNode(node.__key);
    clone.lastBaseTextSnapshot = node.lastBaseTextSnapshot;
    return clone;
  }

  // ---------------------------------------------------------------------------
  //
  // Local properties
  //
  // ---------------------------------------------------------------------------

  getBaseTextSnapshot(): SerializedLexicalNode[] {
    const rubyBase = this.getRbNode();
    if (!rubyBase) {
      return [];
    }

    return rubyBase
      .getChildren()
      .reduce<SerializedLexicalNode[]>((acc, child) => {
        acc.push(exportJsonSubtree(child));
        return acc;
      }, []);
  }

  getLastBaseTextSnapshot(): SerializedLexicalNode[] | null {
    return this.getLatest().lastBaseTextSnapshot;
  }

  setLastBaseTextSnapshot(
    lastBaseTextSnapshot: SerializedLexicalNode[] | null
  ): void {
    this.getWritable().lastBaseTextSnapshot = lastBaseTextSnapshot;
  }

  getRbNode(): RbNode | null {
    return this.getChildren().find(isRbNode) || null;
  }

  // ---------------------------------------------------------------------------
  //
  // Node overrides
  //
  // ---------------------------------------------------------------------------

  static getType(): string {
    return 'ruby';
  }

  canBeEmpty() {
    return false;
  }

  canInsertTextBefore() {
    return false;
  }

  canInsertTextAfter() {
    return false;
  }

  isInline() {
    return true;
  }

  // ---------------------------------------------------------------------------
  //
  // Hook registration
  //
  // ---------------------------------------------------------------------------

  static registerHandlers(editor: LexicalEditor): () => void {
    return mergeRegister(
      editor.registerNodeTransform(RubyNode, (rubyNode) => {
        // Make sure all our base text nodes are correctly wrapped.
        $wrapBaseTextInRb(rubyNode);

        // Check if the base text has changed. If it has, we need to update our
        // base text.
        if (
          !jsonEqualish(
            rubyNode.getBaseTextSnapshot(),
            rubyNode.getLastBaseTextSnapshot()
          )
        ) {
          $updateBaseText(rubyNode);
          rubyNode.setLastBaseTextSnapshot(rubyNode.getBaseTextSnapshot());
        }
      }),

      // Editing a TextNode child of a RbNode doesn't prompt a node transform
      // callback on the RbNode, or the RubyNode.
      //
      // By marking the ruby node as dirty, we make sure there is a node transform
      // callback.
      editor.registerNodeTransform(TextNode, (textNode) => {
        const rubyNode = $getInclusiveRubyAncestor(textNode);
        if (!rubyNode) {
          return;
        }

        // If the text is part of a the ruby base text, mark the ruby node as
        // dirty.
        const rbParent = textNode.getParent();
        if (isRbNode(rbParent)) {
          rubyNode.markDirty();
          return;
        }
      })
    );
  }

  // ---------------------------------------------------------------------------
  //
  // JSON import/export
  //
  // ---------------------------------------------------------------------------

  static importJSON(serializedNode: SerializedRubyNode): RubyNode {
    const node = $createRubyNode();
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    return node;
  }

  exportJSON(): SerializedRubyNode {
    return {
      ...super.exportJSON(),
      type: 'ruby',
      version: 1,
    };
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
    return { element: document.createElement('ruby') };
  }

  // ---------------------------------------------------------------------------
  //
  // DOM rendering
  //
  // ---------------------------------------------------------------------------

  createDOM(): HTMLElement {
    const ruby = document.createElement('ruby');
    ruby.style.display = 'inline-grid';
    ruby.style.gridAutoFlow = 'column';
    ruby.style.justifyItems = 'center';
    return ruby;
  }

  updateDOM(): boolean {
    return false;
  }
}

// -----------------------------------------------------------------------------
//
// Factory and identity functions
//
// -----------------------------------------------------------------------------

export function $createRubyNode(): RubyNode {
  return new RubyNode();
}

export function isRubyNode(node: unknown): node is RubyNode {
  return node instanceof RubyNode;
}

export function $getInclusiveRubyAncestor(node: LexicalNode): RubyNode | null {
  return $getClosest(node, (node): node is RubyNode => isRubyNode(node));
}

// -----------------------------------------------------------------------------
//
// Implementation helpers
//
// -----------------------------------------------------------------------------

function $wrapBaseTextInRb(rubyNode: RubyNode) {
  let rbNode: RbNode | null = null;
  const toWrap: TextNode[] = [];
  const toDrop: LexicalNode[] = [];

  for (const child of rubyNode.getChildren()) {
    if (isRbNode(child)) {
      if (!rbNode) {
        rbNode = child;
      } else {
        toDrop.push(child);
        toWrap.push(...child.getChildren().filter($isTextNode));
      }
    } else if ($isTextNode(child)) {
      toWrap.push(child);
    } else if ($isParagraphNode(child)) {
      // We need to unwrap paragraph nodes because even though our paste
      // handling goes to great lengths to flatten its input, lexical's
      // $insertGeneratedNodes will happily wrap them back in paragraph nodes
      // again.
      toWrap.push(...child.getChildren().filter($isTextNode));
      toDrop.push(child);
    }
  }

  if (!rbNode) {
    rbNode = $createRbNode();
    rubyNode.splice(0, 0, [rbNode]);
  }

  if (toWrap.length) {
    rbNode.append(...toWrap);
  }

  for (const drop of toDrop) {
    $removeDescendantsInclusive(drop);
  }
}

function $updateBaseText(rubyNode: RubyNode): void {
  const baseTextNodes = rubyNode.getRbNode()?.getTextChildren() || [];

  // Massage the base text into the appropriate number of spans
  const baseTextSegments: Array<string> = [];
  for (const child of baseTextNodes) {
    const text = child.getTextContent();
    const numSymbols = countGraphemes(text);
    if (numSymbols < 1) {
      // Empty text node, remove
      child.remove();
    } else if (numSymbols === 1) {
      // Already split -- re-use
      baseTextSegments.push(child.getTextContent());
    } else {
      // Splitting child into maximum of `remaining` pieces by grapheme
      const splitPoints = getGraphemeBoundaries(text)
        // Don't include the points at the start and end of the string
        .slice(1, -1);

      const newChildren = child.splitText(...splitPoints);

      // Make sure all the split components stay split by marking them
      // unmergable.
      for (const c of newChildren) {
        if (!c.isUnmergeable()) {
          c.toggleUnmergeable();
        }
      }

      baseTextSegments.push(...newChildren.map((c) => c.getTextContent()));
    }
  }
}
