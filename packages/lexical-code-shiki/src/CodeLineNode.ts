/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createCodeHighlightNode,
  $isCodeHighlightNode,
} from '@lexical/code-core';
import {
  $applyNodeReplacement,
  $createTabNode,
  $isTabNode,
  $isTextNode,
  ElementNode,
  type LexicalNode,
  type RangeSelection,
} from 'lexical';

/**
 * Block-per-line wrapper used by `CodeShikiExtension` when
 * `enableLineNodes` is on. Each `CodeLineNode` represents one logical
 * line inside a `CodeNode`: its children are the inline token nodes
 * (`CodeHighlightNode`, `TabNode`, `TextNode`) that make up that line.
 *
 * `LineBreakNode` does not appear inside a `CodeLineNode` — the
 * block boundary between sibling `CodeLineNode`s replaces it. When
 * a `CodeLineNode` moves out of its `CodeNode` parent it gets flattened
 * back into a `LineBreakNode`-delimited inline run, so serialization
 * and downstream consumers that don't know about `CodeLineNode`
 * continue to see the historical flat shape.
 *
 * The keyed DOM is a `<span data-code-line>` element styled
 * `display: block` so the `<code>` parent stays a valid HTML5 inline
 * container while each line participates in the browser's block
 * navigation (arrow keys, line wrap, line-number positioning).
 */
export class CodeLineNode extends ElementNode {
  /** @internal */
  $config() {
    return this.config('code-line', {
      extends: ElementNode,
    });
  }

  createDOM(): HTMLElement {
    const dom = document.createElement('span');
    dom.setAttribute('data-code-line', 'true');
    // `display: block` so each line participates in native block
    // navigation (arrow keys, line wrap, gutter line-number layout).
    dom.style.display = 'block';
    return dom;
  }

  updateDOM(): false {
    return false;
  }

  isInline(): false {
    return false;
  }

  // Called by `RangeSelection.insertParagraph` (Enter handler default).
  // We replicate `CodeNode.insertNewAfter`'s indent preservation at the
  // line-block granularity: walk this line's leading tabs / leading
  // spaces, clone them onto the new line, then move trailing children
  // (the portion of the current line after the caret) after the indent.
  // The caret lands right after the indent.
  //
  // Returns `null` to opt out of `RangeSelection.insertParagraph`'s
  // default `newBlock.append(...trailing) + newBlock.selectStart()`,
  // which would (a) clobber our caret position and (b) re-append the
  // trailing children we already moved. Callers other than
  // `RangeSelection.insertParagraph` (e.g. `RangeSelection.insertNodes`
  // CASE 3) interpret a null return as "no new block was created";
  // they will then route around the split using `firstBlock` (this
  // line) directly. The trailing move and indent clone we already did
  // remain on the new line, so the structure stays consistent — but
  // those callers don't get a handle to the new line for further
  // manipulation. This is fine for the common Enter path and matches
  // how flat `CodeNode.insertNewAfter` already behaves.
  insertNewAfter(selection: RangeSelection, _restoreSelection?: boolean): null {
    const {anchor} = selection;
    const firstSelectionNode = anchor.getNode();

    const indent: LexicalNode[] = [];
    let scan: null | LexicalNode = this.getFirstChild();
    while (scan !== null) {
      if ($isTabNode(scan)) {
        indent.push($createTabNode());
        scan = scan.getNextSibling();
      } else if ($isCodeHighlightNode(scan)) {
        const text = scan.getTextContent();
        const textSize = scan.getTextContentSize();
        let spaces = 0;
        while (spaces < textSize && text[spaces] === ' ') {
          spaces++;
        }
        if (spaces !== 0) {
          indent.push($createCodeHighlightNode(' '.repeat(spaces)));
        }
        if (spaces !== textSize) {
          break;
        }
        scan = scan.getNextSibling();
      } else {
        break;
      }
    }

    let splitIndex: number;
    if (
      $isTextNode(firstSelectionNode) &&
      firstSelectionNode.getParent() === this
    ) {
      if (anchor.offset === 0) {
        splitIndex = firstSelectionNode.getIndexWithinParent();
      } else if (anchor.offset === firstSelectionNode.getTextContentSize()) {
        splitIndex = firstSelectionNode.getIndexWithinParent() + 1;
      } else {
        const [left] = firstSelectionNode.splitText(anchor.offset);
        splitIndex = left.getIndexWithinParent() + 1;
      }
    } else if (firstSelectionNode === this && anchor.type === 'element') {
      splitIndex = anchor.offset;
    } else {
      splitIndex = this.getChildrenSize();
    }

    const newLine = $createCodeLineNode();
    this.insertAfter(newLine, false);
    newLine.append(...indent);
    const liveChildren = this.getChildren();
    for (let i = splitIndex; i < liveChildren.length; i++) {
      newLine.append(liveChildren[i]);
    }

    // Element point at index === indent.length puts the caret right
    // after the indent tokens (or at the line start if indent is empty).
    newLine.select(indent.length, indent.length);
    return null;
  }
}

export function $createCodeLineNode(): CodeLineNode {
  return $applyNodeReplacement(new CodeLineNode());
}

export function $isCodeLineNode(
  node: LexicalNode | null | undefined,
): node is CodeLineNode {
  return node instanceof CodeLineNode;
}
