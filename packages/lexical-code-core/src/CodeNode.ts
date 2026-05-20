/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {CodeExtension} from './CodeExtension';
import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  LexicalUpdateJSON,
  NodeKey,
  ParagraphNode,
  RangeSelection,
  SerializedElementNode,
  Spread,
  TabNode,
} from 'lexical';

import {getPeerDependencyFromEditor} from '@lexical/extension';
import {
  $create,
  $createLineBreakNode,
  $createParagraphNode,
  $createTabNode,
  $getEditor,
  $isElementNode,
  $isLineBreakNode,
  $isTabNode,
  $isTextNode,
  addClassNamesToElement,
  ElementNode,
  isHTMLElement,
  setDOMStyleFromCSS,
} from 'lexical';
import warnOnlyOnce from 'shared/warnOnlyOnce';

import {
  $createCodeHighlightNode,
  $isCodeHighlightNode,
  type CodeHighlightNode,
} from './CodeHighlightNode';
import {$getFirstCodeNodeOfLine} from './FlatStructureUtils';

export type SerializedCodeNode = Spread<
  {
    language: string | null | undefined;
    theme?: string | undefined;
  },
  SerializedElementNode
>;

export const DEFAULT_CODE_LANGUAGE = 'javascript';
export const getDefaultCodeLanguage = (): string => DEFAULT_CODE_LANGUAGE;

function hasChildDOMNodeTag(node: Node, tagName: string) {
  for (const child of node.childNodes) {
    if (isHTMLElement(child) && child.tagName === tagName) {
      return true;
    }
    if (hasChildDOMNodeTag(child, tagName)) {
      return true;
    }
  }
  return false;
}

const LANGUAGE_DATA_ATTRIBUTE = 'data-language';
const HIGHLIGHT_LANGUAGE_DATA_ATTRIBUTE = 'data-highlight-language';
const THEME_DATA_ATTRIBUTE = 'data-theme';

const noExtensionDeprecation = warnOnlyOnce(
  'Using CodeNode without CodeExtension is deprecated',
);

/** @noInheritDoc */
export class CodeNode extends ElementNode {
  /** @internal */
  __language: string | null | undefined;
  /** @internal */
  __theme: string | undefined;
  /** @internal */
  __isSyntaxHighlightSupported: boolean;

  static getType(): string {
    return 'code';
  }

  static clone(node: CodeNode): CodeNode {
    return new CodeNode(node.__language, node.__key);
  }

  constructor(language?: string | null | undefined, key?: NodeKey) {
    super(key);
    this.__language = language || undefined;
    this.__isSyntaxHighlightSupported = false;
    this.__theme = undefined;
  }

  afterCloneFrom(prevNode: this): void {
    super.afterCloneFrom(prevNode);
    this.__language = prevNode.__language;
    this.__theme = prevNode.__theme;
    this.__isSyntaxHighlightSupported = prevNode.__isSyntaxHighlightSupported;
  }

  // View
  createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement('code');
    addClassNamesToElement(element, config.theme.code);
    element.setAttribute('spellcheck', 'false');
    const language = this.getLanguage();
    if (language) {
      element.setAttribute(LANGUAGE_DATA_ATTRIBUTE, language);
      if (this.getIsSyntaxHighlightSupported()) {
        element.setAttribute(HIGHLIGHT_LANGUAGE_DATA_ATTRIBUTE, language);
      }
    }

    const theme = this.getTheme();
    if (theme) {
      element.setAttribute(THEME_DATA_ATTRIBUTE, theme);
    }

    const style = this.getStyle();
    if (style) {
      setDOMStyleFromCSS(element.style, style);
    }
    return element;
  }
  updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
    const language = this.__language;
    const prevLanguage = prevNode.__language;

    if (language) {
      if (language !== prevLanguage) {
        dom.setAttribute(LANGUAGE_DATA_ATTRIBUTE, language);
      }
    } else if (prevLanguage) {
      dom.removeAttribute(LANGUAGE_DATA_ATTRIBUTE);
    }

    const isSyntaxHighlightSupported = this.__isSyntaxHighlightSupported;
    const prevIsSyntaxHighlightSupported =
      prevNode.__isSyntaxHighlightSupported;

    if (prevIsSyntaxHighlightSupported && prevLanguage) {
      if (isSyntaxHighlightSupported && language) {
        if (language !== prevLanguage) {
          dom.setAttribute(HIGHLIGHT_LANGUAGE_DATA_ATTRIBUTE, language);
        }
      } else {
        dom.removeAttribute(HIGHLIGHT_LANGUAGE_DATA_ATTRIBUTE);
      }
    } else if (isSyntaxHighlightSupported && language) {
      dom.setAttribute(HIGHLIGHT_LANGUAGE_DATA_ATTRIBUTE, language);
    }

    const theme = this.__theme;
    const prevTheme = prevNode.__theme;

    if (theme) {
      if (theme !== prevTheme) {
        dom.setAttribute(THEME_DATA_ATTRIBUTE, theme);
      }
    } else if (prevTheme) {
      dom.removeAttribute(THEME_DATA_ATTRIBUTE);
    }

    const style = this.__style;
    const prevStyle = prevNode.__style;
    if (style !== prevStyle) {
      setDOMStyleFromCSS(dom.style, style, prevStyle);
    }

    return false;
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const element = document.createElement('pre');
    addClassNamesToElement(element, editor._config.theme.code);
    element.setAttribute('spellcheck', 'false');
    const language = this.getLanguage();
    if (language) {
      element.setAttribute(LANGUAGE_DATA_ATTRIBUTE, language);

      if (this.getIsSyntaxHighlightSupported()) {
        element.setAttribute(HIGHLIGHT_LANGUAGE_DATA_ATTRIBUTE, language);
      }
    }

    const theme = this.getTheme();
    if (theme) {
      element.setAttribute(THEME_DATA_ATTRIBUTE, theme);
    }

    const style = this.getStyle();
    if (style) {
      setDOMStyleFromCSS(element.style, style);
    }
    return {element};
  }

  static importDOM(): DOMConversionMap | null {
    return {
      // Typically <pre> is used for code blocks, and <code> for inline code styles
      // but if it's a multi line <code> we'll create a block. Pass through to
      // inline format handled by TextNode otherwise.
      code: (node: Node) => {
        const isMultiLine =
          node.textContent != null &&
          (/\r?\n/.test(node.textContent) || hasChildDOMNodeTag(node, 'BR'));

        return isMultiLine
          ? {
              conversion: $convertPreElement,
              priority: 1,
            }
          : null;
      },
      div: () => ({
        conversion: $convertDivElement,
        priority: 1,
      }),
      pre: () => ({
        conversion: $convertPreElement,
        priority: 0,
      }),
      table: (node: Node) => {
        const table = node;
        // domNode is a <table> since we matched it by nodeName
        if (isGitHubCodeTable(table as HTMLTableElement)) {
          return {
            conversion: $convertTableElement,
            priority: 3,
          };
        }
        return null;
      },
      td: (node: Node) => {
        // element is a <td> since we matched it by nodeName
        const td = node as HTMLTableCellElement;
        const table: HTMLTableElement | null = td.closest('table');

        if (isGitHubCodeCell(td) || (table && isGitHubCodeTable(table))) {
          // Return a no-op if it's a table cell in a code table, but not a code line.
          // Otherwise it'll fall back to the T
          return {
            conversion: convertCodeNoop,
            priority: 3,
          };
        }

        return null;
      },
      tr: (node: Node) => {
        // element is a <tr> since we matched it by nodeName
        const tr = node as HTMLTableCellElement;
        const table: HTMLTableElement | null = tr.closest('table');
        if (table && isGitHubCodeTable(table)) {
          return {
            conversion: convertCodeNoop,
            priority: 3,
          };
        }
        return null;
      },
    };
  }

  static importJSON(serializedNode: SerializedCodeNode): CodeNode {
    return $createCodeNode().updateFromJSON(serializedNode);
  }

  updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedCodeNode>): this {
    return super
      .updateFromJSON(serializedNode)
      .setLanguage(serializedNode.language)
      .setTheme(serializedNode.theme);
  }

  /**
   * `CodeNode` children are inline (`CodeHighlightNode`, `TabNode`,
   * `LineBreakNode`) by invariant — the only way a block child appears
   * directly under `CodeNode` is as an implementation detail of an
   * extension that groups inline tokens into per-line wrappers
   * (e.g. `CodeLineNode` from `@lexical/code-shiki`'s `enableLineNodes`
   * mode). Block children are not part of the public `CodeNode` shape,
   * so `exportJSON` flattens them back into the inline,
   * `LineBreakNode`-delimited form code-core consumers know.
   * Consumers that don't register the wrapper still read the same JSON;
   * the grouping transform re-applies on deserialization when the
   * wrapper extension is present.
   */
  exportJSON(): SerializedCodeNode {
    const json = super.exportJSON();
    const liveChildren = this.getChildren();
    const hasBlockChild = liveChildren.some(
      c => $isElementNode(c) && !c.isInline(),
    );
    if (hasBlockChild && Array.isArray(json.children)) {
      const flat: SerializedElementNode['children'] = [];
      liveChildren.forEach((child, idx) => {
        const childJson = json.children[idx];
        if (
          $isElementNode(child) &&
          !child.isInline() &&
          childJson &&
          Array.isArray((childJson as SerializedElementNode).children)
        ) {
          for (const inner of (childJson as SerializedElementNode).children) {
            flat.push(inner);
          }
          if (idx < liveChildren.length - 1) {
            flat.push({type: 'linebreak', version: 1});
          }
        } else {
          flat.push(childJson);
        }
      });
      json.children = flat;
    }
    return {
      ...json,
      language: this.getLanguage(),
      theme: this.getTheme(),
    };
  }

  // Mutation
  insertNewAfter(
    selection: RangeSelection,
    restoreSelection = true,
  ): null | ParagraphNode | CodeHighlightNode | TabNode {
    if (
      !getPeerDependencyFromEditor<typeof CodeExtension>(
        $getEditor(),
        '@lexical/code',
      )
    ) {
      noExtensionDeprecation();
      const el = $exitCodeNodeOnEnter(selection);
      if (el) {
        return el;
      }
    }
    // If the selection is within the codeblock, find all leading tabs and
    // spaces of the current line. Create a new line that has all those
    // tabs and spaces, such that leading indentation is preserved.
    const {anchor, focus} = selection;
    const firstPoint = anchor.isBefore(focus) ? anchor : focus;
    const firstSelectionNode = firstPoint.getNode();
    if ($isTextNode(firstSelectionNode)) {
      let node: null | LexicalNode =
        $getFirstCodeNodeOfLine(firstSelectionNode);
      const insertNodes = [];

      while (true) {
        if ($isTabNode(node)) {
          insertNodes.push($createTabNode());
          node = node.getNextSibling();
        } else if ($isCodeHighlightNode(node)) {
          let spaces = 0;
          const text = node.getTextContent();
          const textSize = node.getTextContentSize();
          while (spaces < textSize && text[spaces] === ' ') {
            spaces++;
          }
          if (spaces !== 0) {
            insertNodes.push($createCodeHighlightNode(' '.repeat(spaces)));
          }
          if (spaces !== textSize) {
            break;
          }
          node = node.getNextSibling();
        } else {
          break;
        }
      }
      const split = firstSelectionNode.splitText(anchor.offset)[0];
      const x = anchor.offset === 0 ? 0 : 1;
      const index = split.getIndexWithinParent() + x;
      const codeNode = firstSelectionNode.getParentOrThrow();
      const nodesToInsert = [$createLineBreakNode(), ...insertNodes];
      codeNode.splice(index, 0, nodesToInsert);
      const last = insertNodes[insertNodes.length - 1];
      if (last) {
        last.select();
      } else if (anchor.offset === 0) {
        split.selectPrevious();
      } else {
        split.getNextSibling()!.selectNext(0, 0);
      }
    }
    if ($isCodeNode(firstSelectionNode)) {
      const {offset} = selection.anchor;
      firstSelectionNode.splice(offset, 0, [$createLineBreakNode()]);
      firstSelectionNode.select(offset + 1, offset + 1);
    }

    return null;
  }

  canIndent(): false {
    return false;
  }

  // The default ElementNode.getTextContent joins non-inline block
  // children with a double newline (paragraph-style separation). For a
  // code block, a single newline represents one line boundary; the
  // double-newline default would make a downstream tokenizer (Shiki,
  // Prism) read each line boundary as two newlines and emit a spurious
  // empty line per boundary. Override with single-newline separators
  // so block-per-line wrappers (e.g. CodeLineNode in code-shiki) round
  // trip through `getTextContent` without inflating the line count.
  // Flat-mode CodeNode children are inline (CodeHighlightNode, TabNode,
  // LineBreakNode) and never trigger the separator branch, so flat
  // behavior is unchanged.
  getTextContent(): string {
    let textContent = '';
    const children = this.getChildren();
    const lastIndex = children.length - 1;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      textContent += child.getTextContent();
      if ($isElementNode(child) && i !== lastIndex && !child.isInline()) {
        textContent += '\n';
      }
    }
    return textContent;
  }

  getTextContentSize(): number {
    let size = 0;
    const children = this.getChildren();
    const lastIndex = children.length - 1;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      size += child.getTextContentSize();
      if ($isElementNode(child) && i !== lastIndex && !child.isInline()) {
        size += 1;
      }
    }
    return size;
  }

  collapseAtStart(): boolean {
    const paragraph = $createParagraphNode();
    const children = this.getChildren();
    children.forEach(child => paragraph.append(child));
    this.replace(paragraph);
    return true;
  }

  setLanguage(language: string | null | undefined): this {
    const writable = this.getWritable();
    writable.__language = language || undefined;
    return writable;
  }

  getLanguage(): string | null | undefined {
    return this.getLatest().__language;
  }

  setIsSyntaxHighlightSupported(isSupported: boolean): this {
    const writable = this.getWritable();
    writable.__isSyntaxHighlightSupported = isSupported;
    return writable;
  }

  getIsSyntaxHighlightSupported(): boolean {
    return this.getLatest().__isSyntaxHighlightSupported;
  }

  setTheme(theme: string | null | undefined): this {
    const writable = this.getWritable();
    writable.__theme = theme || undefined;
    return writable;
  }

  getTheme(): string | undefined {
    return this.getLatest().__theme;
  }
}

export function $createCodeNode(
  language?: string | null | undefined,
  theme?: string | null | undefined,
): CodeNode {
  return $create(CodeNode).setLanguage(language).setTheme(theme);
}

export function $isCodeNode(
  node: LexicalNode | null | undefined,
): node is CodeNode {
  return node instanceof CodeNode;
}

function $convertPreElement(domNode: HTMLElement): DOMConversionOutput {
  const language = domNode.getAttribute(LANGUAGE_DATA_ATTRIBUTE);
  return {node: $createCodeNode(language)};
}

function $convertDivElement(domNode: Node): DOMConversionOutput {
  // domNode is a <div> since we matched it by nodeName
  const div = domNode as HTMLDivElement;
  const isCode = isCodeElement(div);
  if (!isCode && !isCodeChildElement(div)) {
    return {
      node: null,
    };
  }
  return {
    node: isCode ? $createCodeNode() : null,
  };
}

function $convertTableElement(): DOMConversionOutput {
  return {node: $createCodeNode()};
}

function convertCodeNoop(): DOMConversionOutput {
  return {node: null};
}

function isCodeElement(div: HTMLElement): boolean {
  return div.style.fontFamily.match('monospace') !== null;
}

function isCodeChildElement(node: HTMLElement): boolean {
  let parent = node.parentElement;
  while (parent !== null) {
    if (isCodeElement(parent)) {
      return true;
    }
    parent = parent.parentElement;
  }
  return false;
}

function isGitHubCodeCell(
  cell: HTMLTableCellElement,
): cell is HTMLTableCellElement {
  return cell.classList.contains('js-file-line');
}

function isGitHubCodeTable(table: HTMLTableElement): table is HTMLTableElement {
  return table.classList.contains('js-file-line-container');
}

export function $exitCodeNodeOnEnter(
  selection: RangeSelection,
): null | ParagraphNode {
  const {anchor} = selection;
  if (!selection.isCollapsed() || anchor.type !== 'element') {
    return null;
  }
  const anchorNode = anchor.getNode();
  // Flat structure: the caret sits on the `CodeNode` itself at the end,
  // with the last two children being `LineBreakNode`s (the user pressed
  // Enter to create the trailing blank line, then again to exit).
  if ($isCodeNode(anchorNode)) {
    const childrenSize = anchorNode.getChildrenSize();
    if (childrenSize >= 2 && anchor.offset === childrenSize) {
      const lastChild = anchorNode.getLastChild();
      if (
        $isLineBreakNode(lastChild) &&
        $isLineBreakNode(lastChild.getPreviousSibling())
      ) {
        const newElement = $createParagraphNode();
        anchorNode
          .splice(childrenSize - 2, 2, [])
          .insertAfter(newElement, false);
        newElement.select();
        return newElement;
      }
    }
    return null;
  }
  // Block-per-line structure (e.g. `CodeLineNode` from
  // `@lexical/code-shiki`'s `enableLineNodes` mode): the caret sits on
  // an empty block child of the `CodeNode`, and the previous sibling is
  // also an empty block child — the same "two trailing blank lines"
  // shape as the flat case, just with block wrappers in place of
  // `LineBreakNode` pairs.
  if ($isElementNode(anchorNode) && anchorNode.isEmpty()) {
    const parent = anchorNode.getParent();
    if ($isCodeNode(parent)) {
      const prev = anchorNode.getPreviousSibling();
      if ($isElementNode(prev) && prev.isEmpty()) {
        const newElement = $createParagraphNode();
        anchorNode.remove();
        prev.remove();
        parent.insertAfter(newElement, false);
        newElement.select();
        return newElement;
      }
    }
  }
  return null;
}
