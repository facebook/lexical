/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor, LexicalNode, NodeKey} from 'lexical';

import {
  $isCodeHighlightNode,
  $isCodeNode,
  CodeExtension,
  CodeHighlightNode,
  CodeIndentExtension,
  CodeNode,
  DEFAULT_CODE_LANGUAGE,
  registerCodeIndentation,
} from '@lexical/code-core';
import {effect, namedSignals} from '@lexical/extension';
import {
  $createTextNode,
  $getNodeByKey,
  $getSelection,
  $isLineBreakNode,
  $isRangeSelection,
  $isTabNode,
  $isTextNode,
  $onUpdate,
  defineExtension,
  mergeRegister,
  safeCast,
  TextNode,
} from 'lexical';

import {
  $getHighlightNodes,
  isCodeLanguageLoaded,
  loadCodeLanguage,
  Prism,
} from './FacadePrism';

type TokenContent = string | Token | (string | Token)[];

export interface Token {
  type: string;
  alias: string | string[];
  content: TokenContent;
}

export interface Tokenizer {
  defaultLanguage: string;
  tokenize(code: string, language?: string): (string | Token)[];
  $tokenize(codeNode: CodeNode, language?: string): LexicalNode[];
}

export const PrismTokenizer: Tokenizer = {
  $tokenize(codeNode: CodeNode, language?: string): LexicalNode[] {
    return $getHighlightNodes(codeNode, language || this.defaultLanguage);
  },
  defaultLanguage: DEFAULT_CODE_LANGUAGE,
  tokenize(code: string, language?: string): (string | Token)[] {
    return Prism.tokenize(
      code,
      Prism.languages[language || ''] || Prism.languages[this.defaultLanguage],
    );
  },
};

function $textNodeTransform(
  editor: LexicalEditor,
  tokenizer: Tokenizer,
  transformState: TransformState,
  node: TextNode,
): void {
  // Since CodeNode has flat children structure we only need to check
  // if node's parent is a code node and run highlighting if so
  const parentNode = node.getParent();
  if ($isCodeNode(parentNode)) {
    $codeNodeTransform(editor, tokenizer, transformState, parentNode);
  } else if ($isCodeHighlightNode(node)) {
    // When code block converted into paragraph or other element
    // code highlight nodes converted back to normal text
    node.replace($createTextNode(node.__text));
  }
}

function updateCodeGutter(node: CodeNode, editor: LexicalEditor): void {
  const codeElement = editor.getElementByKey(node.getKey());
  if (codeElement === null) {
    return;
  }
  const children = node.getChildren();
  const childrenLength = children.length;
  // @ts-ignore: internal field
  if (childrenLength === codeElement.__cachedChildrenLength) {
    // Avoid updating the attribute if the children length hasn't changed.
    return;
  }
  // @ts-ignore:: internal field
  codeElement.__cachedChildrenLength = childrenLength;
  let count = 1;
  for (let i = 0; i < childrenLength; i++) {
    if ($isLineBreakNode(children[i])) {
      count++;
    }
  }

  if (node.getWordWrap()) {
    // Word-wrap mode: update real DOM gutter elements
    const gutterEl = codeElement.querySelector('.code-gutter');
    if (gutterEl) {
      // Sync number of gutter line elements
      while (gutterEl.children.length > count) {
        gutterEl.removeChild(gutterEl.lastChild!);
      }
      while (gutterEl.children.length < count) {
        const span = document.createElement('span');
        span.textContent = String(gutterEl.children.length + 1);
        gutterEl.appendChild(span);
      }
      // Update text content for all lines
      for (let i = 0; i < count; i++) {
        const span = gutterEl.children[i] as HTMLElement;
        const lineNum = String(i + 1);
        if (span.textContent !== lineNum) {
          span.textContent = lineNum;
        }
      }
      // Sync heights after DOM update
      syncGutterHeights(codeElement);
    }
  } else {
    // Classic mode: data-gutter attribute
    let gutter = '1';
    for (let i = 1; i < count; i++) {
      gutter += '\n' + (i + 1);
    }
    codeElement.setAttribute('data-gutter', gutter);
  }
}

function syncGutterHeights(codeElement: HTMLElement): void {
  const gutterEl = codeElement.querySelector('.code-gutter');
  const contentEl = codeElement.querySelector('.code-content');
  if (!gutterEl || !contentEl) {
    return;
  }

  const children = contentEl.childNodes;
  let lineStart = 0;

  // Measure heights of each logical line in the content
  // Lines are separated by <br> elements (LineBreakNode renders as <br>)
  const lineHeights: number[] = [];
  const range = document.createRange();

  for (let i = 0; i <= children.length; i++) {
    const child = children[i];
    const isEnd = i === children.length;
    const isBreak = child && child.nodeName === 'BR';

    if (isEnd || isBreak) {
      // Measure height of this logical line
      if (lineStart < i) {
        range.setStartBefore(children[lineStart]);
        range.setEndAfter(children[i - 1]);
        const rects = range.getClientRects();
        let height = 0;
        if (rects.length > 0) {
          const first = rects[0];
          const last = rects[rects.length - 1];
          height = last.bottom - first.top;
        }
        lineHeights.push(height);
      } else {
        // Empty line — use line-height
        lineHeights.push(0);
      }
      lineStart = i + 1;
    }
  }

  // Apply heights to gutter spans
  for (let i = 0; i < gutterEl.children.length && i < lineHeights.length; i++) {
    const span = gutterEl.children[i] as HTMLElement;
    const h = lineHeights[i];
    if (h > 0) {
      span.style.height = h + 'px';
      span.style.lineHeight = h + 'px';
    } else {
      span.style.height = '';
      span.style.lineHeight = '';
    }
  }
}

function $codeNodeTransform(
  editor: LexicalEditor,
  tokenizer: Tokenizer,
  transformState: TransformState,
  node: CodeNode,
) {
  const {nodesCurrentlyHighlighting} = transformState;
  const nodeKey = node.getKey();

  // When new code block inserted it might not have language selected
  if (node.getLanguage() === undefined) {
    node.setLanguage(tokenizer.defaultLanguage);
  }

  const language = node.getLanguage() || tokenizer.defaultLanguage;
  if (isCodeLanguageLoaded(language)) {
    if (!node.getIsSyntaxHighlightSupported()) {
      node.setIsSyntaxHighlightSupported(true);
    }
  } else {
    if (node.getIsSyntaxHighlightSupported()) {
      node.setIsSyntaxHighlightSupported(false);
    }
    loadCodeLanguage(language, editor, nodeKey);
    return;
  }

  if (nodesCurrentlyHighlighting.has(nodeKey)) {
    return;
  }

  nodesCurrentlyHighlighting.add(nodeKey);
  if (!transformState.didTransform) {
    transformState.didTransform = true;
    $onUpdate(() => {
      transformState.didTransform = false;
      nodesCurrentlyHighlighting.clear();
    });
  }

  $updateAndRetainSelection(nodeKey, () => {
    const currentNode = $getNodeByKey(nodeKey);

    if (!$isCodeNode(currentNode) || !currentNode.isAttached()) {
      return false;
    }
    //const DIFF_LANGUAGE_REGEX = /^diff-([\w-]+)/i;
    const currentLanguage =
      currentNode.getLanguage() || tokenizer.defaultLanguage;
    //const diffLanguageMatch = DIFF_LANGUAGE_REGEX.exec(currentLanguage);

    const highlightNodes = tokenizer.$tokenize(currentNode, currentLanguage);

    const diffRange = getDiffRange(currentNode.getChildren(), highlightNodes);
    const {from, to, nodesForReplacement} = diffRange;

    if (from !== to || nodesForReplacement.length) {
      node.splice(from, to - from, nodesForReplacement);
      return true;
    }

    return false;
  });
}

// Wrapping update function into selection retainer, that tries to keep cursor at the same
// position as before.
function $updateAndRetainSelection(
  nodeKey: NodeKey,
  updateFn: () => boolean,
): void {
  const node = $getNodeByKey(nodeKey);
  if (!$isCodeNode(node) || !node.isAttached()) {
    return;
  }
  const selection = $getSelection();
  // If it's not range selection (or null selection) there's no need to change it,
  // but we can still run highlighting logic
  if (!$isRangeSelection(selection)) {
    updateFn();
    return;
  }

  const anchor = selection.anchor;
  const anchorOffset = anchor.offset;
  const isNewLineAnchor =
    anchor.type === 'element' &&
    $isLineBreakNode(node.getChildAtIndex(anchor.offset - 1));
  let textOffset = 0;

  // Calculating previous text offset (all text node prior to anchor + anchor own text offset)
  if (!isNewLineAnchor) {
    const anchorNode = anchor.getNode();
    textOffset =
      anchorOffset +
      anchorNode.getPreviousSiblings().reduce((offset, _node) => {
        return offset + _node.getTextContentSize();
      }, 0);
  }

  const hasChanges = updateFn();
  if (!hasChanges) {
    return;
  }

  // Non-text anchors only happen for line breaks, otherwise
  // selection will be within text node (code highlight node)
  if (isNewLineAnchor) {
    anchor.getNode().select(anchorOffset, anchorOffset);
    return;
  }

  // If it was non-element anchor then we walk through child nodes
  // and looking for a position of original text offset
  node.getChildren().some(_node => {
    const isText = $isTextNode(_node);
    if (isText || $isLineBreakNode(_node)) {
      const textContentSize = _node.getTextContentSize();
      if (isText && textContentSize >= textOffset) {
        _node.select(textOffset, textOffset);
        return true;
      }
      textOffset -= textContentSize;
    }
    return false;
  });
}

// Finds minimal diff range between two nodes lists. It returns from/to range boundaries of prevNodes
// that needs to be replaced with `nodes` (subset of nextNodes) to make prevNodes equal to nextNodes.
function getDiffRange(
  prevNodes: Array<LexicalNode>,
  nextNodes: Array<LexicalNode>,
): {
  from: number;
  nodesForReplacement: Array<LexicalNode>;
  to: number;
} {
  let leadingMatch = 0;
  while (leadingMatch < prevNodes.length) {
    if (!isEqual(prevNodes[leadingMatch], nextNodes[leadingMatch])) {
      break;
    }
    leadingMatch++;
  }

  const prevNodesLength = prevNodes.length;
  const nextNodesLength = nextNodes.length;
  const maxTrailingMatch =
    Math.min(prevNodesLength, nextNodesLength) - leadingMatch;

  let trailingMatch = 0;
  while (trailingMatch < maxTrailingMatch) {
    trailingMatch++;
    if (
      !isEqual(
        prevNodes[prevNodesLength - trailingMatch],
        nextNodes[nextNodesLength - trailingMatch],
      )
    ) {
      trailingMatch--;
      break;
    }
  }

  const from = leadingMatch;
  const to = prevNodesLength - trailingMatch;
  const nodesForReplacement = nextNodes.slice(
    leadingMatch,
    nextNodesLength - trailingMatch,
  );
  return {
    from,
    nodesForReplacement,
    to,
  };
}

function isEqual(nodeA: LexicalNode, nodeB: LexicalNode): boolean {
  // Only checking for code highlight nodes, tabs and linebreaks. If it's regular text node
  // returning false so that it's transformed into code highlight node
  return (
    ($isCodeHighlightNode(nodeA) &&
      $isCodeHighlightNode(nodeB) &&
      nodeA.__text === nodeB.__text &&
      nodeA.__highlightType === nodeB.__highlightType) ||
    ($isTabNode(nodeA) && $isTabNode(nodeB)) ||
    ($isLineBreakNode(nodeA) && $isLineBreakNode(nodeB))
  );
}

interface TransformState {
  didTransform: boolean;
  // Using extra cache (`nodesCurrentlyHighlighting`) since both CodeNode and CodeHighlightNode
  // transforms might be called at the same time (e.g. new CodeHighlight node inserted) and
  // in both cases we'll rerun whole reformatting over CodeNode, which is redundant.
  // Especially when pasting code into CodeBlock.
  nodesCurrentlyHighlighting: Set<NodeKey>;
}

/**
 * @internal
 * Register only the Prism highlighting transforms and the gutter
 * mutation listener. No keyboard / indent handlers — those are the
 * responsibility of
 * {@link "@lexical/code-core".registerCodeIndentation} /
 * {@link "@lexical/code-core".CodeIndentExtension}.
 *
 * Used by {@link CodePrismExtension}, whose `CodeIndentExtension`
 * dependency handles the indent side. The legacy
 * {@link registerCodeHighlighting} wrapper combines this helper with
 * `registerCodeIndentation` for direct callers that want the original
 * single-call setup.
 *
 * Exported for use by the package's own unit tests; not re-exported
 * from the package entry point.
 */
export function registerHighlightingOnly(
  editor: LexicalEditor,
  tokenizer: Tokenizer,
): () => void {
  const registrations = [];

  // Only register the mutation listener if not in headless mode
  if (editor._headless !== true) {
    const resizeObservers = new Map<string, ResizeObserver>();

    registrations.push(
      editor.registerMutationListener(
        CodeNode,
        mutations => {
          editor.getEditorState().read(() => {
            for (const [key, type] of mutations) {
              if (type === 'destroyed') {
                // Clean up ResizeObserver for destroyed nodes
                const observer = resizeObservers.get(key);
                if (observer) {
                  observer.disconnect();
                  resizeObservers.delete(key);
                }
              } else {
                const node = $getNodeByKey(key);
                if (node !== null) {
                  updateCodeGutter(node as CodeNode, editor);

                  // Set up ResizeObserver for word-wrap mode
                  const codeNode = node as CodeNode;
                  const codeElement = editor.getElementByKey(key);
                  if (codeNode.getWordWrap() && codeElement) {
                    if (!resizeObservers.has(key)) {
                      const contentEl =
                        codeElement.querySelector('.code-content');
                      if (contentEl) {
                        const observer = new ResizeObserver(() => {
                          syncGutterHeights(codeElement);
                        });
                        observer.observe(contentEl);
                        resizeObservers.set(key, observer);
                      }
                    }
                  } else {
                    // Clean up observer if word wrap was disabled
                    const observer = resizeObservers.get(key);
                    if (observer) {
                      observer.disconnect();
                      resizeObservers.delete(key);
                    }
                  }
                }
              }
            }
          });
        },
        {skipInitialization: false},
      ),
      // Cleanup all observers on unmount
      () => {
        for (const observer of resizeObservers.values()) {
          observer.disconnect();
        }
        resizeObservers.clear();
      },
    );
  }

  const transformState: TransformState = {
    didTransform: false,
    nodesCurrentlyHighlighting: new Set(),
  };
  registrations.push(
    editor.registerNodeTransform(
      CodeNode,
      $codeNodeTransform.bind(null, editor, tokenizer, transformState),
    ),
    editor.registerNodeTransform(
      TextNode,
      $textNodeTransform.bind(null, editor, tokenizer, transformState),
    ),
    editor.registerNodeTransform(
      CodeHighlightNode,
      $textNodeTransform.bind(null, editor, tokenizer, transformState),
    ),
  );

  return mergeRegister(...registrations);
}

/**
 * Register the Prism tokenizer-driven highlighting on the editor along
 * with the indent / Tab / arrow-key keyboard handlers. This function
 * is provided for legacy code that has not upgraded to using
 * {@link CodePrismExtension}.
 */
export function registerCodeHighlighting(
  editor: LexicalEditor,
  tokenizer: Tokenizer = PrismTokenizer,
): () => void {
  if (!editor.hasNodes([CodeNode, CodeHighlightNode])) {
    throw new Error(
      'CodeHighlightPlugin: CodeNode or CodeHighlightNode not registered on editor',
    );
  }
  return mergeRegister(
    registerHighlightingOnly(editor, tokenizer),
    registerCodeIndentation(editor),
  );
}

export interface CodePrismConfig {
  /**
   * When true, the Prism code highlighter is not registered on the editor.
   * This signal can be flipped at runtime to enable or disable the
   * highlighter, for example to switch between the Prism and Shiki
   * highlighters without rebuilding the editor.
   */
  disabled: boolean;
  tokenizer: Tokenizer;
}

/**
 * Add code highlighting support for code blocks with Prism.
 *
 * {@link CodeExtension} is a dependency, so the required `CodeNode` and
 * `CodeHighlightNode` nodes are registered automatically.
 * {@link CodeIndentExtension} is also a dependency, so Tab / Shift+Tab
 * and the related keyboard handlers are activated automatically. Set
 * `tabSize` on `CodeIndentExtension` to enable space-indent outdent.
 */
export const CodePrismExtension = defineExtension({
  build: (editor, config) => namedSignals(config),
  config: safeCast<CodePrismConfig>({
    disabled: false,
    tokenizer: PrismTokenizer,
  }),
  dependencies: [CodeExtension, CodeIndentExtension],
  name: '@lexical/code-prism',
  register: (editor, config, state) => {
    const stores = state.getOutput();
    return effect(() => {
      if (stores.disabled.value) {
        return;
      }
      return registerHighlightingOnly(editor, stores.tokenizer.value);
    });
  },
});
