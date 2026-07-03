/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {DecoratorComponentProps} from '@lexical/react/ReactPluginHostExtension';
import type {JSX} from 'react';

import './FindReplace.css';

import {ReactExtension} from '@lexical/react/ReactExtension';
import {createDOMRange, createRectsFromDOMRange} from '@lexical/selection';
import {$dfsWithSlotsIterator} from '@lexical/utils';
import {
  $createRangeSelection,
  $getNodeByKeyOrThrow,
  $getRoot,
  $isElementNode,
  $isLineBreakNode,
  $isTextNode,
  $setSelection,
  COMMAND_PRIORITY_LOW,
  configExtension,
  createCommand,
  defineExtension,
  IS_APPLE,
  KEY_DOWN_COMMAND,
  type LexicalCommand,
  type LexicalEditor,
  mergeRegister,
  type NodeKey,
} from 'lexical';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {createPortal} from 'react-dom';

export interface TextMatch {
  end: number;
  start: number;
}

export interface OffsetEntry {
  globalEnd: number;
  globalStart: number;
  key: NodeKey;
}

export interface MatchPoints {
  anchorKey: NodeKey;
  anchorOffset: number;
  focusKey: NodeKey;
  focusOffset: number;
  format: number;
}

export function findMatches(
  text: string,
  searchTerm: string,
  caseSensitive: boolean,
  isRegex: boolean,
): TextMatch[] {
  if (!searchTerm || !text) {
    return [];
  }

  const pattern = isRegex ? searchTerm : escapeRegExp(searchTerm);
  const flags = 'g' + (caseSensitive ? '' : 'i');

  let regex: RegExp;
  try {
    regex = new RegExp(pattern, flags);
  } catch {
    return [];
  }

  const matches: TextMatch[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match[0].length === 0) {
      // prevent infinite loop on zero-length matches
      regex.lastIndex++;
      continue;
    }
    matches.push({end: match.index + match[0].length, start: match.index});
  }
  return matches;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function $buildOffsetMap(): OffsetEntry[] {
  const entries: OffsetEntry[] = [];
  let offset = 0;
  let prevNonInlineDepth: number | null = null;

  for (const {node, depth} of $dfsWithSlotsIterator()) {
    if ($isElementNode(node) && !node.isInline() && depth > 0) {
      if (prevNonInlineDepth !== null && depth <= prevNonInlineDepth) {
        offset += 2; // mirrors DOUBLE_LINE_BREAK separators from ElementNode.getTextContent()
      }
      prevNonInlineDepth = depth;
    }

    if ($isLineBreakNode(node)) {
      offset += 1;
    } else if ($isTextNode(node)) {
      const len = node.getTextContentSize();
      entries.push({
        globalEnd: offset + len,
        globalStart: offset,
        key: node.__key,
      });
      offset += len;
    }
  }

  return entries;
}

export function $resolveMatchToPoints(
  match: TextMatch,
  offsetMap: OffsetEntry[],
): MatchPoints | null {
  const anchorEntry = findEntryForOffset(offsetMap, match.start);
  const focusEntry = findEntryForOffset(offsetMap, match.end - 1);
  if (!anchorEntry || !focusEntry) {
    return null;
  }

  const anchorOffset = match.start - anchorEntry.globalStart;
  const focusOffset = match.end - focusEntry.globalStart;
  const isSingleNode = anchorEntry.key === focusEntry.key;
  const anchorNode = $getNodeByKeyOrThrow(anchorEntry.key);
  const format =
    isSingleNode && $isTextNode(anchorNode) ? anchorNode.getFormat() : 0;

  return {
    anchorKey: anchorEntry.key,
    anchorOffset,
    focusKey: focusEntry.key,
    focusOffset,
    format,
  };
}

function findEntryForOffset(
  offsetMap: OffsetEntry[],
  offset: number,
): OffsetEntry | null {
  let lo = 0;
  let hi = offsetMap.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const entry = offsetMap[mid];
    if (offset < entry.globalStart) {
      hi = mid - 1;
    } else if (offset >= entry.globalEnd) {
      lo = mid + 1;
    } else {
      return entry;
    }
  }
  return null;
}

export function $replaceMatch(
  points: MatchPoints,
  replacementText: string,
): void {
  const selection = $createRangeSelection();
  selection.anchor.set(points.anchorKey, points.anchorOffset, 'text');
  selection.focus.set(points.focusKey, points.focusOffset, 'text');
  selection.format = points.format;
  $setSelection(selection);
  selection.insertText(replacementText);
}

export function $replaceAllMatches(
  matches: TextMatch[],
  offsetMap: OffsetEntry[],
  replacementText: string,
): number {
  let count = 0;
  // Replace back-to-front so earlier offsets in the pre-built map stay valid
  for (let i = matches.length - 1; i >= 0; i--) {
    const points = $resolveMatchToPoints(matches[i], offsetMap);
    if (points) {
      $replaceMatch(points, replacementText);
      count++;
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// Highlight rendering (scoped per editor instance)
// ---------------------------------------------------------------------------

const SUPPORTS_CSS_HIGHLIGHTS =
  typeof Highlight !== 'undefined' &&
  typeof CSS !== 'undefined' &&
  'highlights' in CSS;

interface HighlightState {
  allHighlight: Highlight | null;
  allName: string;
  currentHighlight: Highlight | null;
  currentName: string;
  overlayContainer: HTMLDivElement | null;
  originalParentPosition: string | null;
  styleElement: HTMLStyleElement | null;
}

function createHighlightState(editorKey: string): HighlightState {
  return {
    allHighlight: null,
    allName: `lexical-find-replace-match-${editorKey}`,
    currentHighlight: null,
    currentName: `lexical-find-replace-current-${editorKey}`,
    originalParentPosition: null,
    overlayContainer: null,
    styleElement: null,
  };
}

function ensureHighlightRegistered(state: HighlightState, doc: Document): void {
  if (state.allHighlight) {
    return;
  }
  // eslint-disable-next-line compat/compat -- guarded by SUPPORTS_CSS_HIGHLIGHTS
  state.allHighlight = new Highlight();
  // eslint-disable-next-line compat/compat -- guarded by SUPPORTS_CSS_HIGHLIGHTS
  state.currentHighlight = new Highlight();
  CSS.highlights.set(state.allName, state.allHighlight);
  CSS.highlights.set(state.currentName, state.currentHighlight);
  const style = doc.createElement('style');
  style.textContent =
    `::highlight(${state.allName}) { background-color: rgba(255, 255, 0, 0.4); color: inherit; }\n` +
    `::highlight(${state.currentName}) { background-color: rgba(255, 165, 0, 0.6); color: inherit; }`;
  doc.head.appendChild(style);
  state.styleElement = style;
}

function disposeHighlightState(state: HighlightState): void {
  if (state.allHighlight) {
    state.allHighlight.clear();
    CSS.highlights.delete(state.allName);
    state.allHighlight = null;
  }
  if (state.currentHighlight) {
    state.currentHighlight.clear();
    CSS.highlights.delete(state.currentName);
    state.currentHighlight = null;
  }
  if (state.styleElement) {
    state.styleElement.remove();
    state.styleElement = null;
  }
  if (state.overlayContainer) {
    if (state.originalParentPosition !== null) {
      const parent = state.overlayContainer.parentElement;
      if (parent) {
        parent.style.position = state.originalParentPosition;
      }
      state.originalParentPosition = null;
    }
    state.overlayContainer.remove();
    state.overlayContainer = null;
  }
}

function $updateHighlights(
  editor: LexicalEditor,
  matches: TextMatch[],
  currentIndex: number,
  state: HighlightState,
): void {
  clearHighlights(state);

  if (matches.length === 0) {
    return;
  }

  const offsetMap = $buildOffsetMap();

  if (SUPPORTS_CSS_HIGHLIGHTS) {
    const doc = editor.getRootElement()?.ownerDocument ?? document;
    ensureHighlightRegistered(state, doc);

    for (let i = 0; i < matches.length; i++) {
      const points = $resolveMatchToPoints(matches[i], offsetMap);
      if (!points) {
        continue;
      }
      const anchorNode = $getNodeByKeyOrThrow(points.anchorKey);
      const focusNode = $getNodeByKeyOrThrow(points.focusKey);
      const range = createDOMRange(
        editor,
        anchorNode,
        points.anchorOffset,
        focusNode,
        points.focusOffset,
      );
      if (!range) {
        continue;
      }
      state.allHighlight!.add(range);
      if (i === currentIndex) {
        state.currentHighlight!.add(range);
      }
    }
  } else {
    $updateOverlayHighlights(editor, matches, currentIndex, offsetMap, state);
  }
}

function clearHighlights(state: HighlightState): void {
  if (state.allHighlight) {
    state.allHighlight.clear();
  }
  if (state.currentHighlight) {
    state.currentHighlight.clear();
  }
  clearOverlayHighlights(state);
}

// ---------------------------------------------------------------------------
// Legacy fallback: overlay spans
// ---------------------------------------------------------------------------

function getOverlayContainer(
  editor: LexicalEditor,
  state: HighlightState,
): HTMLDivElement {
  if (state.overlayContainer) {
    return state.overlayContainer;
  }
  const root = editor.getRootElement();
  if (!root) {
    throw new Error('No root element');
  }
  const doc = root.ownerDocument;
  const parent = root.parentElement!;
  if (getComputedStyle(parent).position === 'static') {
    // overlay spans need a positioned ancestor
    state.originalParentPosition = parent.style.position;
    parent.style.position = 'relative';
  }
  const container = doc.createElement('div');
  container.style.position = 'absolute';
  container.style.top = '0';
  container.style.left = '0';
  container.style.pointerEvents = 'none';
  parent.appendChild(container);
  state.overlayContainer = container;
  return container;
}

function clearOverlayHighlights(state: HighlightState): void {
  if (state.overlayContainer) {
    state.overlayContainer.innerHTML = '';
  }
}

function $updateOverlayHighlights(
  editor: LexicalEditor,
  matches: TextMatch[],
  currentIndex: number,
  offsetMap: OffsetEntry[],
  state: HighlightState,
): void {
  const container = getOverlayContainer(editor, state);
  container.innerHTML = '';
  const rootElement = editor.getRootElement();
  if (!rootElement) {
    return;
  }
  const doc = rootElement.ownerDocument;
  const containerRect = container.offsetParent
    ? container.offsetParent.getBoundingClientRect()
    : rootElement.getBoundingClientRect();

  for (let i = 0; i < matches.length; i++) {
    const points = $resolveMatchToPoints(matches[i], offsetMap);
    if (!points) {
      continue;
    }
    const anchorNode = $getNodeByKeyOrThrow(points.anchorKey);
    const focusNode = $getNodeByKeyOrThrow(points.focusKey);
    const range = createDOMRange(
      editor,
      anchorNode,
      points.anchorOffset,
      focusNode,
      points.focusOffset,
    );
    if (!range) {
      continue;
    }
    const rects = createRectsFromDOMRange(editor, range);
    const isCurrent = i === currentIndex;
    for (const rect of rects) {
      const span = doc.createElement('span');
      span.style.position = 'absolute';
      span.style.top = `${rect.top - containerRect.top}px`;
      span.style.left = `${rect.left - containerRect.left}px`;
      span.style.width = `${rect.width}px`;
      span.style.height = `${rect.height}px`;
      span.style.backgroundColor = isCurrent
        ? 'rgba(255, 165, 0, 0.6)'
        : 'rgba(255, 255, 0, 0.4)';
      span.style.pointerEvents = 'none';
      container.appendChild(span);
    }
  }
}

// ---------------------------------------------------------------------------
// Extension definitions
// ---------------------------------------------------------------------------

export const OPEN_FIND_REPLACE_COMMAND: LexicalCommand<void> =
  /* @__PURE__ */ createCommand('OPEN_FIND_REPLACE_COMMAND');

export const FindReplaceExtension = /* @__PURE__ */ defineExtension({
  name: '@lexical/playground/FindReplace',
  register: editor => {
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      event => {
        const isFindReplace =
          (event.code === 'KeyH' &&
            event.ctrlKey &&
            !event.metaKey &&
            !event.altKey &&
            !event.shiftKey) ||
          (IS_APPLE &&
            event.code === 'KeyF' &&
            event.metaKey &&
            event.altKey &&
            !event.ctrlKey);
        const isFind =
          event.code === 'KeyF' &&
          !event.altKey &&
          !event.shiftKey &&
          (IS_APPLE
            ? event.metaKey && !event.ctrlKey
            : event.ctrlKey && !event.metaKey);
        if (isFindReplace || isFind) {
          event.preventDefault();
          editor.dispatchCommand(OPEN_FIND_REPLACE_COMMAND, undefined);
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
  },
});

// ---------------------------------------------------------------------------
// React UI
// ---------------------------------------------------------------------------

function FindReplacePanel({
  context,
}: DecoratorComponentProps): JSX.Element | null {
  const [editor] = context;
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [isRegex, setIsRegex] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cachedText, setCachedText] = useState(() =>
    editor.read(() => $getRoot().getTextContent()),
  );
  const searchInputRef = useRef<HTMLInputElement>(null);
  const highlightStateRef = useRef<HighlightState>(
    createHighlightState(editor.getKey()),
  );

  useEffect(() => {
    return mergeRegister(
      editor.registerTextContentListener(text => {
        setCachedText(text);
      }),
      editor.registerCommand(
        OPEN_FIND_REPLACE_COMMAND,
        () => {
          setIsOpen(prev => !prev);
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor]);

  useEffect(() => {
    const state = highlightStateRef.current;
    return () => disposeHighlightState(state);
  }, []);

  const regexError = useMemo(() => {
    if (!isRegex || !searchTerm) {
      return false;
    }
    try {
      RegExp(searchTerm);
      return false;
    } catch {
      return true;
    }
  }, [searchTerm, isRegex]);

  const matches = useMemo(() => {
    if (!isOpen) {
      return [];
    }
    return findMatches(cachedText, searchTerm, caseSensitive, isRegex);
  }, [cachedText, searchTerm, caseSensitive, isRegex, isOpen]);

  const effectiveIndex =
    matches.length > 0 ? Math.min(currentIndex, matches.length - 1) : 0;

  useLayoutEffect(() => {
    const state = highlightStateRef.current;
    if (!isOpen || matches.length === 0) {
      clearHighlights(state);
      return () => clearHighlights(state);
    }
    editor.read(() => {
      $updateHighlights(editor, matches, effectiveIndex, state);
    });
    return () => clearHighlights(state);
  }, [editor, matches, effectiveIndex, isOpen]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleNext = useCallback(() => {
    setCurrentIndex(prev =>
      matches.length > 0 ? (prev + 1) % matches.length : 0,
    );
  }, [matches.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex(prev =>
      matches.length > 0 ? (prev - 1 + matches.length) % matches.length : 0,
    );
  }, [matches.length]);

  const handleReplace = useCallback(() => {
    if (matches.length === 0) {
      return;
    }
    editor.update(
      () => {
        const offsetMap = $buildOffsetMap();
        const points = $resolveMatchToPoints(
          matches[effectiveIndex],
          offsetMap,
        );
        if (points) {
          $replaceMatch(points, replaceTerm);
        }
      },
      {discrete: true},
    );
  }, [editor, matches, effectiveIndex, replaceTerm]);

  const handleReplaceAll = useCallback(() => {
    if (matches.length === 0) {
      return;
    }
    editor.update(
      () => {
        const offsetMap = $buildOffsetMap();
        $replaceAllMatches(matches, offsetMap, replaceTerm);
      },
      {discrete: true},
    );
  }, [editor, matches, replaceTerm]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    editor.focus();
  }, [editor]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          handlePrev();
        } else {
          handleNext();
        }
      }
    },
    [handleClose, handleNext, handlePrev],
  );

  if (!isOpen) {
    return null;
  }

  const rootElement = editor.getRootElement();
  const portalTarget = rootElement?.ownerDocument?.body ?? document.body;

  return createPortal(
    <div
      className="find-replace-panel"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-label="Find and Replace">
      <div className="find-replace-row">
        <input
          ref={searchInputRef}
          className="find-replace-input"
          type="text"
          placeholder="Find..."
          value={searchTerm}
          onChange={e => {
            setSearchTerm(e.target.value);
            setCurrentIndex(0);
          }}
          aria-label="Search text"
        />
        <span className="find-replace-count">
          {regexError
            ? 'Invalid regex'
            : matches.length > 0
              ? `${effectiveIndex + 1} / ${matches.length}`
              : 'No results'}
        </span>
        <button
          className="find-replace-btn"
          onClick={handlePrev}
          disabled={matches.length === 0}
          title="Previous (Shift+Enter)"
          aria-label="Previous match">
          <svg viewBox="0 0 16 16">
            <path d="M8 4l5 6H3z" />
          </svg>
        </button>
        <button
          className="find-replace-btn"
          onClick={handleNext}
          disabled={matches.length === 0}
          title="Next (Enter)"
          aria-label="Next match">
          <svg viewBox="0 0 16 16">
            <path d="M8 12L3 6h10z" />
          </svg>
        </button>
        <div className="find-replace-separator" />
        <button
          className="find-replace-toggle"
          onClick={() => {
            setCaseSensitive(v => !v);
            setCurrentIndex(0);
          }}
          title="Match case"
          aria-label="Match case"
          aria-pressed={caseSensitive}>
          Aa
        </button>
        <button
          className="find-replace-toggle"
          onClick={() => {
            setIsRegex(v => !v);
            setCurrentIndex(0);
          }}
          title="Use regular expression"
          aria-label="Use regular expression"
          aria-pressed={isRegex}>
          .*
        </button>
        <div className="find-replace-separator" />
        <button
          className="find-replace-btn"
          onClick={handleClose}
          title="Close (Escape)"
          aria-label="Close">
          <svg viewBox="0 0 16 16">
            <path d="M12.2 4.5l-.7-.7L8 7.3 4.5 3.8l-.7.7L7.3 8l-3.5 3.5.7.7L8 8.7l3.5 3.5.7-.7L8.7 8z" />
          </svg>
        </button>
      </div>
      <div className="find-replace-row">
        <input
          className="find-replace-input"
          type="text"
          placeholder="Replace..."
          value={replaceTerm}
          onChange={e => setReplaceTerm(e.target.value)}
          aria-label="Replace text"
        />
        <button
          className="find-replace-action"
          onClick={handleReplace}
          disabled={matches.length === 0}
          aria-label="Replace current match">
          Replace
        </button>
        <button
          className="find-replace-action"
          onClick={handleReplaceAll}
          disabled={matches.length === 0}
          aria-label="Replace all matches">
          All
        </button>
      </div>
    </div>,
    portalTarget,
  );
}

export const ReactFindReplaceExtension = /* @__PURE__ */ defineExtension({
  dependencies: [
    FindReplaceExtension,
    /* @__PURE__ */ configExtension(ReactExtension, {
      decorators: [FindReplacePanel],
    }),
  ],
  name: '@lexical/playground/ReactFindReplace',
});
