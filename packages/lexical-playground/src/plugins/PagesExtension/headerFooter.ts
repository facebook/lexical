/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {
  PageSlotContent,
  PageSlotKind,
  PageSlotSetup,
  PageSlotVariant,
} from './types';

import {
  buildEditorFromExtensions,
  type LexicalEditorWithDispose,
  NestedEditorExtension,
} from '@lexical/extension';
import {HistoryExtension} from '@lexical/history';
import {LinkExtension} from '@lexical/link';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $getRoot,
  $getState,
  $setState,
  configExtension,
  createCommand,
  createState,
  defineExtension,
  type LexicalCommand,
  type LexicalEditor,
  type SerializedEditorState,
  type StateConfig,
} from 'lexical';

import {PageCounterNodesExtension} from './PageCounterNodes';

export const PAGE_SLOT_VARIANTS: readonly PageSlotVariant[] = [
  'default',
  'first',
  'even',
];

function isSerializedEditorState(v: unknown): v is SerializedEditorState {
  return (
    typeof v === 'object' && v !== null && !Array.isArray(v) && 'root' in v
  );
}

/**
 * Accepts `{default?, first?, even?}` where each value is a serialized
 * editor state or null. Anything else (including a `root`-less object from
 * a future shape) parses to `null`, so old readers ignore what they do not
 * understand.
 */
function parseSlotContent(v: unknown): PageSlotContent | null {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) {
    return null;
  }
  const result: PageSlotContent = {};
  let any = false;
  for (const variant of PAGE_SLOT_VARIANTS) {
    const value = (v as Record<string, unknown>)[variant];
    if (value === null || isSerializedEditorState(value)) {
      result[variant] = value;
      any = true;
    }
  }
  return any ? result : null;
}

function slotContentIsEqual(
  a: PageSlotContent | null,
  b: PageSlotContent | null,
): boolean {
  return (
    a === b ||
    (a !== null && b !== null && JSON.stringify(a) === JSON.stringify(b))
  );
}

export const pageHeaderState = createState('pageHeader', {
  isEqual: slotContentIsEqual,
  parse: parseSlotContent,
});
export const pageFooterState = createState('pageFooter', {
  isEqual: slotContentIsEqual,
  parse: parseSlotContent,
});

export function slotStateFor(
  kind: PageSlotKind,
): StateConfig<string, PageSlotContent | null> {
  return kind === 'header' ? pageHeaderState : pageFooterState;
}

export function $getPageSlotContent(
  kind: PageSlotKind,
): PageSlotContent | null {
  return $getState($getRoot(), slotStateFor(kind));
}

/** Store one variant of a header/footer; `null` clears that variant. */
export function $setPageSlotContent(
  kind: PageSlotKind,
  variant: PageSlotVariant,
  content: SerializedEditorState | null,
): void {
  $setState($getRoot(), slotStateFor(kind), prev => ({
    ...(prev ?? {}),
    [variant]: content,
  }));
}

export function $getPageHeader(
  variant: PageSlotVariant = 'default',
): SerializedEditorState | null {
  return $getPageSlotContent('header')?.[variant] ?? null;
}

export function $setPageHeader(
  content: SerializedEditorState | null,
  variant: PageSlotVariant = 'default',
): void {
  $setPageSlotContent('header', variant, content);
}

export function $getPageFooter(
  variant: PageSlotVariant = 'default',
): SerializedEditorState | null {
  return $getPageSlotContent('footer')?.[variant] ?? null;
}

export function $setPageFooter(
  content: SerializedEditorState | null,
  variant: PageSlotVariant = 'default',
): void {
  $setPageSlotContent('footer', variant, content);
}

/** Which variant the page at `pageIndex` (0-based) shows for this setup. */
export function resolveSlotVariant(
  setup: PageSlotSetup,
  pageIndex: number,
): PageSlotVariant {
  if (setup.differentFirstPage && pageIndex === 0) {
    return 'first';
  }
  // Page numbers are 1-based, so odd indices are even pages.
  if (setup.differentEvenPages && pageIndex % 2 === 1) {
    return 'even';
  }
  return 'default';
}

/**
 * Open a header/footer for editing: either the one on `pageIndex`, or the
 * first page that shows `variant`. Defaults to page 0.
 */
export const EDIT_PAGE_SLOT_COMMAND: LexicalCommand<{
  kind: PageSlotKind;
  pageIndex?: number;
  variant?: PageSlotVariant;
}> = createCommand('EDIT_PAGE_SLOT_COMMAND');

/** Commit and close the header/footer editor if one is open. */
export const CLOSE_PAGE_SLOT_COMMAND: LexicalCommand<undefined> = createCommand(
  'CLOSE_PAGE_SLOT_COMMAND',
);

/**
 * The default header/footer editor: rich text, links and the page number /
 * page count nodes. The playground replaces it through the `buildSlotEditor`
 * config of `PagesExtension` with an editor that has its whole feature set
 * (see `PlaygroundExtensions.ts`).
 */
export const HeaderFooterEditorExtension = defineExtension({
  dependencies: [
    RichTextExtension,
    HistoryExtension,
    LinkExtension,
    PageCounterNodesExtension,
  ],
  name: '@lexical/playground/PageHeaderFooter',
  namespace: 'Playground/PageHeaderFooter',
});

/** Builds one nested header/footer editor for `parent`. */
export type SlotEditorBuilder = (
  parent: LexicalEditor,
) => LexicalEditorWithDispose;

/**
 * Build a nested editor for one header/footer variant. It shares the parent
 * editor's theme (through `NestedEditorExtension`) and its commands bubble
 * to the parent, so the toolbar formats header text like caption text.
 */
export function buildHeaderFooterEditor(
  parent: LexicalEditor,
): LexicalEditorWithDispose {
  return buildEditorFromExtensions(
    defineExtension({
      dependencies: [
        configExtension(NestedEditorExtension, {
          $getParentEditor: () => parent,
          inheritEditableFromParent: false,
        }),
        HeaderFooterEditorExtension,
      ],
      name: '@lexical/playground/PageHeaderFooterEditor',
    }),
  );
}
