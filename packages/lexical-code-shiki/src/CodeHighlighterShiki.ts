/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

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
  $createLineBreakNode,
  $createTextNode,
  $getDOMSlot,
  $getNodeByKey,
  $getSelection,
  $isElementNode,
  $isLineBreakNode,
  $isRangeSelection,
  $isTabNode,
  $isTextNode,
  $onUpdate,
  COMMAND_PRIORITY_LOW,
  defineExtension,
  INSERT_LINE_BREAK_COMMAND,
  INSERT_PARAGRAPH_COMMAND,
  type LexicalEditor,
  type LexicalNode,
  mergeRegister,
  type NodeKey,
  safeCast,
  TextNode,
} from 'lexical';

import {
  $createCodeLineNode,
  $isCodeLineNode,
  CodeLineNode,
} from './CodeLineNode';
import {
  $getHighlightNodes,
  isCodeLanguageLoaded,
  isCodeThemeLoaded,
  loadCodeLanguage,
  loadCodeTheme,
} from './FacadeShiki';

export interface Tokenizer {
  defaultLanguage: string;
  defaultTheme: string;
  $tokenize: (
    this: Tokenizer,
    codeNode: CodeNode,
    language?: string,
  ) => LexicalNode[];
}

const DEFAULT_CODE_THEME = 'one-light';

export const ShikiTokenizer: Tokenizer = {
  $tokenize(
    this: Tokenizer,
    codeNode: CodeNode,
    language?: string,
  ): LexicalNode[] {
    return $getHighlightNodes(codeNode, language || this.defaultLanguage);
  },
  defaultLanguage: DEFAULT_CODE_LANGUAGE,
  defaultTheme: DEFAULT_CODE_THEME,
};

function $textNodeTransform(
  editor: LexicalEditor,
  tokenizer: Tokenizer,
  transformState: TransformState,
  enableLineNodes: boolean,
  node: TextNode,
): void {
  // A CodeHighlightNode may live directly under CodeNode (flat mode)
  // or one level deeper under a CodeLineNode (grouped mode). Walk up
  // and trigger the CodeNode transform when we find one.
  let parentNode = node.getParent();
  if (enableLineNodes && $isCodeLineNode(parentNode)) {
    parentNode = parentNode.getParent();
  }
  if ($isCodeNode(parentNode)) {
    $codeNodeTransform(
      editor,
      tokenizer,
      transformState,
      enableLineNodes,
      parentNode,
    );
  } else if ($isCodeHighlightNode(node)) {
    // When code block converted into paragraph or other element
    // code highlight nodes converted back to normal text
    node.replace($createTextNode(node.__text));
  }
}

/**
 * Line-number gutter updater. In flat mode the gutter string lives on
 * `<code data-gutter>` and is rebuilt from `LineBreakNode` occurrences,
 * driving the legacy sticky pseudo-element. In grouped mode
 * (`enableLineNodes`) each `CodeLineNode` carries its own
 * `data-line-number`, so the line number can be positioned by a
 * per-line CSS pseudo-element and survive a future `white-space: pre-wrap`
 * (the `\n`-joined `data-gutter` would lose alignment once a line wraps).
 * The cache key includes the child-key list so that grouping-induced
 * line replacements (same count, new keys) re-attach `data-line-number`
 * to the freshly-minted line DOM.
 */
function $updateCodeGutter(node: CodeNode, editor: LexicalEditor): void {
  const keyedDOM = editor.getElementByKey(node.getKey());
  if (keyedDOM === null) {
    return;
  }
  const codeElement = $getDOMSlot(node, keyedDOM, editor).element;
  const children = node.getChildren();
  const childrenLength = children.length;

  const isGroupedMode =
    childrenLength > 0 &&
    children.every(c => $isElementNode(c) && !c.isInline());

  const cacheKey = isGroupedMode
    ? childrenLength + ':' + children.map(c => c.getKey()).join(',')
    : String(childrenLength);
  // @ts-ignore: internal field
  if (cacheKey === codeElement.__cachedGutterKey) {
    return;
  }
  // @ts-ignore: internal field
  codeElement.__cachedGutterKey = cacheKey;

  if (isGroupedMode) {
    let gutter = '';
    for (let i = 0; i < childrenLength; i++) {
      gutter += (i === 0 ? '' : '\n') + (i + 1);
      const childDOM = editor.getElementByKey(children[i].getKey());
      if (childDOM) {
        childDOM.setAttribute('data-line-number', String(i + 1));
      }
    }
    codeElement.setAttribute('data-gutter', gutter);
    return;
  }

  let gutter = '1';
  let count = 1;
  for (let i = 0; i < childrenLength; i++) {
    if ($isLineBreakNode(children[i])) {
      gutter += '\n' + ++count;
    }
  }
  codeElement.setAttribute('data-gutter', gutter);
}

interface TransformState {
  didTransform: boolean;
  // Using extra cache (`nodesCurrentlyHighlighting`) since both CodeNode and CodeHighlightNode
  // transforms might be called at the same time (e.g. new CodeHighlight node inserted) and
  // in both cases we'll rerun whole reformatting over CodeNode, which is redundant.
  // Especially when pasting code into CodeBlock.
  nodesCurrentlyHighlighting: Set<NodeKey>;
}

function $codeNodeTransform(
  editor: LexicalEditor,
  tokenizer: Tokenizer,
  transformState: TransformState,
  enableLineNodes: boolean,
  node: CodeNode,
) {
  const nodeKey = node.getKey();
  const {nodesCurrentlyHighlighting} = transformState;

  // When new code block inserted it might not have language selected
  let language = node.getLanguage();
  if (!language) {
    language = tokenizer.defaultLanguage;
    node.setLanguage(language);
  }

  let theme = node.getTheme();
  if (!theme) {
    theme = tokenizer.defaultTheme;
    node.setTheme(theme);
  }

  // dynamic import of themes
  let inFlight = false;
  if (!isCodeThemeLoaded(theme)) {
    loadCodeTheme(theme, editor, nodeKey);
    inFlight = true;
  }

  // dynamic import of languages
  if (isCodeLanguageLoaded(language)) {
    if (!node.getIsSyntaxHighlightSupported()) {
      node.setIsSyntaxHighlightSupported(true);
    }
  } else {
    if (node.getIsSyntaxHighlightSupported()) {
      node.setIsSyntaxHighlightSupported(false);
    }
    loadCodeLanguage(language, editor, nodeKey);
    inFlight = true;
  }

  if (inFlight) {
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

  $updateAndRetainSelection(nodeKey, enableLineNodes, () => {
    const currentNode = $getNodeByKey(nodeKey);

    if (!$isCodeNode(currentNode) || !currentNode.isAttached()) {
      return false;
    }

    const lang = currentNode.getLanguage() || tokenizer.defaultLanguage;
    const highlightNodes = tokenizer.$tokenize(currentNode, lang);
    // In grouped mode wrap the tokenizer's flat output into
    // CodeLineNodes before diffing, so unchanged CodeLineNodes survive
    // the splice with their identity intact. The selection retention
    // step below then only has to handle restoring the cursor within
    // the one line whose tokens actually changed.
    const replacementNodes = enableLineNodes
      ? $groupFlatNodesIntoLineNodes(highlightNodes)
      : highlightNodes;
    const diffRange = getDiffRange(currentNode.getChildren(), replacementNodes);
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
/** @internal */
export function $updateAndRetainSelection(
  nodeKey: NodeKey,
  enableLineNodes: boolean,
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

  // Grouped-mode path: capture (lineIndex, columnOffset) inside the
  // anchor's containing CodeLineNode. After the splice runs, find the
  // CodeLineNode at the same index and walk its text children to the
  // captured column to restore the cursor. Unchanged sibling lines
  // keep their identity through the splice so their cursor would
  // already be valid; this branch handles the case where the changed
  // line is replaced.
  if (enableLineNodes) {
    const anchorNode: LexicalNode = anchor.getNode();
    let containingLine: LexicalNode | null = anchorNode;
    while (containingLine !== null && !$isCodeLineNode(containingLine)) {
      containingLine = containingLine.getParent();
    }
    if ($isCodeLineNode(containingLine)) {
      // Walk the line's children up to the anchor, counting
      // `LineBreakNode`s as virtual sub-line boundaries. The original
      // trigger was Shift+Enter inserting a `LineBreakNode` into the
      // existing `CodeLineNode` before the tokenizer transform fired;
      // the keyboard path is now intercepted upstream
      // (`INSERT_LINE_BREAK_COMMAND` → `INSERT_PARAGRAPH_COMMAND` in
      // `CodeShikiExtension.register`), so a within-line LB no longer
      // arrives from keyboard input. This branch still matters for
      // paste, programmatic edits, and other paths that drop a LB
      // inside a line without going through Enter: each within-line LB
      // becomes a new `CodeLineNode` after re-grouping, so the
      // anchor's restored `lineIndex` skips ahead by the LB count seen
      // on the way to the anchor, and the column offset resets after
      // every LB.
      const lineChildren = containingLine.getChildren();
      const anchorChildIndex =
        anchor.type === 'text' && anchorNode.getParent() === containingLine
          ? anchorNode.getIndexWithinParent()
          : anchor.type === 'element' && anchorNode === containingLine
            ? anchorOffset
            : -1;
      let linesBefore = 0;
      let columnOffset = 0;
      if (anchorChildIndex >= 0) {
        for (let i = 0; i < anchorChildIndex; i++) {
          const child = lineChildren[i];
          if ($isLineBreakNode(child)) {
            linesBefore += 1;
            columnOffset = 0;
          } else {
            columnOffset += child.getTextContentSize();
          }
        }
        if (anchor.type === 'text') {
          columnOffset += anchorOffset;
        }
      }
      const lineIndex = containingLine.getIndexWithinParent() + linesBefore;
      const hasChanges = updateFn();
      if (!hasChanges) {
        return;
      }
      const newLine = node.getChildAtIndex(lineIndex);
      if ($isCodeLineNode(newLine)) {
        let remaining = columnOffset;
        const restoredChildren = newLine.getChildren();
        for (const child of restoredChildren) {
          if ($isTextNode(child)) {
            const size = child.getTextContentSize();
            if (size >= remaining) {
              child.select(remaining, remaining);
              return;
            }
            remaining -= size;
          }
        }
        // Past the end of all text in the line: anchor on the line
        // itself at the end so caret lands at line end.
        newLine.select(restoredChildren.length, restoredChildren.length);
      }
      return;
    }
    // No containing line found (anchor is directly on CodeNode or
    // outside the grouped structure). Don't fall through to the flat
    // logic — that path assumes children are TextNode / LineBreakNode
    // direct on CodeNode, which doesn't hold in grouped mode.
    updateFn();
    return;
  }

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
  // Only checking for code highlight nodes, tabs, linebreaks, and
  // CodeLineNodes (the grouped-mode wrapper). Anything else returns
  // false so it gets transformed into a code highlight node (or a
  // CodeLineNode wrapping one).
  if ($isCodeLineNode(nodeA) && $isCodeLineNode(nodeB)) {
    const aChildren = nodeA.getChildren();
    const bChildren = nodeB.getChildren();
    if (aChildren.length !== bChildren.length) {
      return false;
    }
    for (let i = 0; i < aChildren.length; i++) {
      if (!isEqual(aChildren[i], bChildren[i])) {
        return false;
      }
    }
    return true;
  }
  return (
    ($isCodeHighlightNode(nodeA) &&
      $isCodeHighlightNode(nodeB) &&
      nodeA.__text === nodeB.__text &&
      nodeA.__highlightType === nodeB.__highlightType &&
      nodeA.__style === nodeB.__style) ||
    ($isTabNode(nodeA) && $isTabNode(nodeB)) ||
    ($isLineBreakNode(nodeA) && $isLineBreakNode(nodeB))
  );
}

/**
 * @internal
 * Register only the Shiki highlighting transforms and the gutter
 * mutation listener. No keyboard / indent handlers — those are the
 * responsibility of
 * {@link "@lexical/code-core".registerCodeIndentation} /
 * {@link "@lexical/code-core".CodeIndentExtension}.
 *
 * Used by {@link CodeShikiExtension}, whose `CodeIndentExtension`
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
  enableLineNodes: boolean = false,
): () => void {
  const registrations = [];

  if (editor._headless !== true) {
    registrations.push(
      editor.registerMutationListener(
        CodeNode,
        mutations => {
          editor.getEditorState().read(() => {
            for (const [key, type] of mutations) {
              if (type !== 'destroyed') {
                const node = $getNodeByKey(key);
                if (node !== null) {
                  $updateCodeGutter(node as CodeNode, editor);
                }
              }
            }
          });
        },
        {skipInitialization: false},
      ),
    );
  }

  const transformState: TransformState = {
    didTransform: false,
    nodesCurrentlyHighlighting: new Set(),
  };
  registrations.push(
    editor.registerNodeTransform(
      CodeNode,
      $codeNodeTransform.bind(
        null,
        editor,
        tokenizer,
        transformState,
        enableLineNodes,
      ),
    ),
    editor.registerNodeTransform(
      TextNode,
      $textNodeTransform.bind(
        null,
        editor,
        tokenizer,
        transformState,
        enableLineNodes,
      ),
    ),
    editor.registerNodeTransform(
      CodeHighlightNode,
      $textNodeTransform.bind(
        null,
        editor,
        tokenizer,
        transformState,
        enableLineNodes,
      ),
    ),
  );

  return mergeRegister(...registrations);
}

/**
 * Register the Shiki tokenizer-driven highlighting on the editor along
 * with the indent / Tab / arrow-key keyboard handlers. This function
 * is provided for legacy code that has not upgraded to using
 * {@link CodeShikiExtension}.
 */
export function registerCodeHighlighting(
  editor: LexicalEditor,
  tokenizer: Tokenizer = ShikiTokenizer,
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

/**
 * Group a flat sequence of inline nodes into `CodeLineNode`s on the
 * `LineBreakNode` boundary. The input nodes may or may not already have
 * a parent: `line.append(node)` will detach from any prior parent.
 *
 * `LineBreakNode`s mark line boundaries: each one ends the current
 * group and starts a new (initially empty) one, so `[content, LB]`
 * yields a trailing empty line and `[LB, LB]` yields two empty lines
 * around a boundary.
 */
function $groupFlatNodesIntoLineNodes(
  nodes: ReadonlyArray<LexicalNode>,
): CodeLineNode[] {
  const groups: LexicalNode[][] = [[]];
  for (const node of nodes) {
    if ($isLineBreakNode(node)) {
      groups.push([]);
    } else {
      groups[groups.length - 1].push(node);
    }
  }
  return groups.map(group => {
    const line = $createCodeLineNode();
    for (const node of group) {
      // If a CodeLineNode somehow appears nested inside the flat
      // segment (transient state during paste / programmatic edit),
      // unwrap it so we don't end up with a CodeLineNode containing a
      // CodeLineNode.
      if ($isCodeLineNode(node)) {
        for (const inner of node.getChildren()) {
          line.append(inner);
        }
      } else {
        line.append(node);
      }
    }
    return line;
  });
}

/**
 * Re-group a `CodeNode`'s flat children into `CodeLineNode`s.
 *
 * Idempotent: when the `CodeNode` is already grouped (no `LineBreakNode`s
 * and every child is a `CodeLineNode`) this is a no-op, so it composes
 * with the existing Shiki tokenizer transform without forming an update
 * loop. Mostly handles input that arrives in the flat shape — pasted
 * code, programmatic edits, or content loaded from a serialized form
 * that pre-dates the grouping option.
 */
/** @internal */
export function $groupChildrenIntoLineNodes(codeNode: CodeNode): void {
  const children = codeNode.getChildren();
  let hasLineBreak = false;
  let allLineNodes = children.length > 0;
  for (const child of children) {
    if ($isLineBreakNode(child)) {
      hasLineBreak = true;
      allLineNodes = false;
    } else if (!$isCodeLineNode(child)) {
      allLineNodes = false;
    }
  }
  if (!hasLineBreak && allLineNodes) {
    return;
  }
  const lineNodes = $groupFlatNodesIntoLineNodes(children);
  codeNode.clear();
  codeNode.append(...lineNodes);
}

/**
 * Flatten a `CodeLineNode` back into its inline children when it has
 * left its `CodeNode` parent (e.g. cut-and-pasted into a paragraph).
 *
 * Inserts a `LineBreakNode` *before* this line's content when there is
 * an existing previous sibling that isn't already a `LineBreakNode`,
 * so the line boundary survives the flatten regardless of the order
 * sibling lines transform in (lexical's transform dispatch order is
 * dirty-set order, not document order).
 */
/** @internal */
export function $flattenLineNodeIfDetached(lineNode: CodeLineNode): void {
  const parent = lineNode.getParent();
  if (parent === null || $isCodeNode(parent)) {
    return;
  }
  const prev = lineNode.getPreviousSibling();
  if (prev !== null && !$isLineBreakNode(prev)) {
    lineNode.insertBefore($createLineBreakNode());
  }
  for (const child of lineNode.getChildren()) {
    lineNode.insertBefore(child);
  }
  lineNode.remove();
}

export interface CodeShikiConfig {
  /**
   * When true, the Shiki code highlighter is not registered on the editor.
   * This signal can be flipped at runtime to enable or disable the
   * highlighter, for example to switch between the Prism and Shiki
   * highlighters without rebuilding the editor.
   */
  disabled: boolean;
  /**
   * When true, the `CodeNode`'s flat children are re-grouped into
   * block-per-line `CodeLineNode`s so each visible line is its own
   * lexical block. Native browser navigation (arrow keys, line wrap)
   * then operates on real block boundaries instead of a stretch of
   * inline content separated by `LineBreakNode`s. The flat shape is
   * restored on serialization and when a `CodeLineNode` moves out of
   * its `CodeNode`, so consumers that don't know about
   * `CodeLineNode` are unaffected.
   */
  enableLineNodes: boolean;
  tokenizer: Tokenizer;
}

/**
 * Add code highlighting support for code blocks with Shiki.
 *
 * {@link CodeExtension} is a dependency, so the required `CodeNode` and
 * `CodeHighlightNode` nodes are registered automatically.
 * {@link CodeIndentExtension} is also a dependency, so Tab / Shift+Tab
 * and the related keyboard handlers are activated automatically. Set
 * `tabSize` on `CodeIndentExtension` to enable space-indent outdent.
 */
export const CodeShikiExtension = defineExtension({
  build: (editor, config) => namedSignals(config),
  config: safeCast<CodeShikiConfig>({
    disabled: false,
    enableLineNodes: false,
    tokenizer: ShikiTokenizer,
  }),
  dependencies: [CodeExtension, CodeIndentExtension],
  name: '@lexical/code-shiki',
  nodes: () => [CodeLineNode],
  register: (editor, config, state) => {
    const stores = state.getOutput();
    return mergeRegister(
      effect(() => {
        if (stores.disabled.value) {
          return;
        }
        return registerHighlightingOnly(
          editor,
          stores.tokenizer.value,
          stores.enableLineNodes.value,
        );
      }),
      effect(() => {
        if (stores.disabled.value || !stores.enableLineNodes.value) {
          return;
        }
        return mergeRegister(
          editor.registerNodeTransform(CodeNode, $groupChildrenIntoLineNodes),
          editor.registerNodeTransform(
            CodeLineNode,
            $flattenLineNodeIfDetached,
          ),
          // Shift+Enter inside a code block goes through the same
          // line-splitting path as Enter — the original flat CodeNode
          // resolves both to a `LineBreakNode` insertion which renders
          // identically, but grouped mode would otherwise leave a
          // within-line `LineBreakNode` for one frame before the
          // tokenizer re-splits the line. Route INSERT_LINE_BREAK_COMMAND
          // through INSERT_PARAGRAPH_COMMAND inside `CodeNode` so the
          // visible outcome matches Enter immediately.
          //
          // The dispatch back into INSERT_PARAGRAPH_COMMAND assumes the
          // rich-text (or plain-text equivalent) handler is registered.
          // `enableLineNodes` is wired through `CodeShikiExtension`,
          // which is intended to compose with rich-text in the host
          // editor; a plain-text-only host would see the dispatch
          // return false here and fall through to the default
          // `INSERT_LINE_BREAK_COMMAND` handler.
          editor.registerCommand(
            INSERT_LINE_BREAK_COMMAND,
            () => {
              const selection = $getSelection();
              if (!$isRangeSelection(selection)) {
                return false;
              }
              for (
                let n: LexicalNode | null = selection.anchor.getNode();
                n !== null;
                n = n.getParent()
              ) {
                if ($isCodeNode(n)) {
                  return editor.dispatchCommand(
                    INSERT_PARAGRAPH_COMMAND,
                    undefined,
                  );
                }
              }
              return false;
            },
            COMMAND_PRIORITY_LOW,
          ),
        );
      }),
    );
  },
});

/**
 * @deprecated Use {@link CodeShikiExtension} instead. This type is a
 * flat alias for {@link Tokenizer} kept for backward compatibility with
 * {@link CodeHighlighterShikiExtension}.
 */
export type CodeHighlighterShikiConfig = Tokenizer;

/**
 * @deprecated Use {@link CodeShikiExtension} instead.
 *
 * This is a thin backward-compatibility shim that preserves the original
 * flat {@link Tokenizer} config API. It depends on
 * {@link CodeShikiExtension} and routes its configured tokenizer to the
 * underlying extension during `init` (before `CodeShikiExtension` builds),
 * so consumers using
 * `configExtension(CodeHighlighterShikiExtension, customTokenizer)`
 * continue to work without modification.
 */
export const CodeHighlighterShikiExtension = defineExtension({
  config: safeCast<CodeHighlighterShikiConfig>(ShikiTokenizer),
  dependencies: [CodeShikiExtension],
  init: (editorConfig, config, state) => {
    // Forward the flat Tokenizer config to CodeShikiExtension's `tokenizer`
    // field before it builds.
    state.getDependency(CodeShikiExtension).config.tokenizer = config;
  },
  name: '@lexical/code-shiki/legacy',
});
