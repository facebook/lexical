/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {RovingTabIndexExtension} from '@lexical/a11y';
import {$isCodeNode} from '@lexical/code';
import {
  buildEditorFromExtensions,
  type LexicalEditorWithDispose,
  NestedEditorExtension,
} from '@lexical/extension';
import {
  $defaultShouldInsertAfter,
  ClickAfterLastBlockExtension,
  DecoratorTextExtension,
  HorizontalRuleExtension,
  SelectBlockExtension,
  SelectionAlwaysOnDisplayExtension,
  TabIndentationExtension,
} from '@lexical/extension';
import {HashtagExtension} from '@lexical/hashtag';
import {HistoryExtension} from '@lexical/history';
import {ClickableLinkExtension, LinkExtension} from '@lexical/link';
import {CheckListExtension, ListExtension} from '@lexical/list';
import {ReactExtension} from '@lexical/react/ReactExtension';
import {ReactPluginHostExtension} from '@lexical/react/ReactPluginHostExtension';
import {RichTextExtension} from '@lexical/rich-text';
import {TableExtension} from '@lexical/table';
import {configExtension, defineExtension, type LexicalEditor} from 'lexical';

import {KeywordsExtension} from './nodes/KeywordNode';
import {PlaygroundImportExtension} from './nodes/PlaygroundImportExtension';
import PlaygroundNodes from './nodes/PlaygroundNodes';
import {PlaygroundDOMRenderExtension} from './PlaygroundDOMRenderExtension';
import {AutocompleteExtension} from './plugins/AutocompleteExtension';
import {PlaygroundAutoLinkExtension} from './plugins/AutoLinkExtension';
import {CardExtension} from './plugins/CardExtension';
import {CodeHighlightExtension} from './plugins/CodeHighlightExtension';
import {CollapsibleExtension} from './plugins/CollapsibleExtension';
import {DateTimeExtension} from './plugins/DateTimeExtension';
import {DragDropPasteExtension} from './plugins/DragDropPasteExtension';
import {EmojisExtension} from './plugins/EmojisExtension';
import {EquationsExtension} from './plugins/EquationsExtension';
import {ExcalidrawExtension} from './plugins/ExcalidrawExtension';
import {FigmaExtension} from './plugins/FigmaExtension';
import {ImagesExtension} from './plugins/ImagesExtension';
import {LayoutExtension} from './plugins/LayoutExtension/LayoutExtension';
import {PlaygroundMarkdownShortcutsExtension} from './plugins/MarkdownShortcutsExtension';
import {MentionsExtension} from './plugins/MentionsExtension';
import {NestedEditorPluginsDecorator} from './plugins/NestedEditorPlugins';
import {PageCounterNodesExtension} from './plugins/PagesExtension/PageCounterNodes';
import {PollExtension} from './plugins/PollExtension';
import {PullQuoteExtension} from './plugins/PullQuoteExtension';
import {ReactReviewExtension} from './plugins/ReviewExtension';
import {RubyExtension} from './plugins/RubyExtension';
import {SpecialTextExtension} from './plugins/SpecialTextExtension';
import {TabFocusExtension} from './plugins/TabFocusExtension';
import {TerseExportExtension} from './plugins/TerseExportExtension';
import {TwitterExtension} from './plugins/TwitterExtension';
import {VisibleNonPrintingExtension} from './plugins/VisibleNonPrintingExtension';
import {YouTubeExtension} from './plugins/YouTubeExtension';
import PlaygroundEditorTheme from './themes/PlaygroundEditorTheme';
import {validateUrl} from './utils/url';

/**
 * Everything the playground's content model needs regardless of where the
 * editor lives: nodes, theme, import/export pipeline and the inline features
 * (links, mentions, emojis, hashtags, keywords, dates, ...). Shared by the
 * main editor and the nested page header/footer editors.
 */
export const PlaygroundContentExtension = defineExtension({
  dependencies: [
    DecoratorTextExtension,
    KeywordsExtension,
    HashtagExtension,
    DateTimeExtension,
    SpecialTextExtension,
    DragDropPasteExtension,
    EmojisExtension,
    MentionsExtension,
    configExtension(LinkExtension, {validateUrl}),
    PlaygroundAutoLinkExtension,
    configExtension(ClickableLinkExtension, {newTab: true}),
    SelectionAlwaysOnDisplayExtension,
    configExtension(SelectBlockExtension, {
      cascadeSelection: true,
    }),
    TerseExportExtension,
    configExtension(ClickAfterLastBlockExtension, {
      $shouldInsertAfter: node =>
        $defaultShouldInsertAfter(node) || $isCodeNode(node),
    }),
    configExtension(AutocompleteExtension, {disabled: true}),
    configExtension(VisibleNonPrintingExtension, {
      disabled: true,
    }),
    // DOMImportExtension pipeline — `PlaygroundImportExtension` bundles
    // the shared `CoreImportExtension` baseline, the playground-specific
    // inline-style overlay and the `ClipboardDOMImportExtension` paste
    // handler. Per-node import rules ride along with each node extension.
    PlaygroundImportExtension,
    // Replaces the legacy `buildHTMLConfig().export` overrides.
    PlaygroundDOMRenderExtension,
  ],
  name: '@lexical/playground/Content',
  nodes: PlaygroundNodes,
  theme: PlaygroundEditorTheme,
});

/**
 * The playground's rich-text feature set: block types, tables, lists, embeds
 * and the other block-level nodes. Shared by the main editor and the nested
 * page header/footer editors; the main editor adds pages, page breaks,
 * find/replace and the toolbar shortcuts on top.
 */
export const PlaygroundRichTextContentExtension = defineExtension({
  dependencies: [
    configExtension(RichTextExtension, {
      escapeFormatTriggers: {
        code: {arrow: true, click: true, enter: true, onlyAtBoundary: true},
      },
    }),
    // Each node extension below registers its own DOM-import rules — the
    // framework nodes (rich-text, list, table, code) and the playground block
    // hosts (Card, PullQuote, Review) alike — so the rich-text importer set
    // tracks this node set automatically (kept out of the always-on
    // PlaygroundImportExtension so plain-text mode doesn't pull in
    // RichTextExtension, which conflicts with PlainTextExtension).
    configExtension(TableExtension, {
      hasStickyScrollbar: true,
    }),
    ImagesExtension,
    HorizontalRuleExtension,
    TwitterExtension,
    YouTubeExtension,
    FigmaExtension,
    TabFocusExtension,
    CollapsibleExtension,
    CodeHighlightExtension,
    configExtension(ListExtension, {
      shouldPreserveNumbering: false,
    }),
    CheckListExtension,
    PlaygroundMarkdownShortcutsExtension,
    PollExtension,
    EquationsExtension,
    LayoutExtension,
    ExcalidrawExtension,
    CardExtension,
    ReactReviewExtension,
    PullQuoteExtension,
    RubyExtension,
    configExtension(TabIndentationExtension, {maxIndent: 7}),
  ],
  name: '@lexical/playground/RichTextContent',
});

/**
 * What a page header or footer can contain: everything the main editor
 * can, minus pages, page breaks, sticky notes and document-level tools,
 * plus the page number / page count nodes. `ReactPluginHostExtension`
 * lets the React-rendered nodes (images, polls, equations, ...) render in
 * an editor created outside React; the pages extension mounts its host,
 * and {@link NestedEditorPlugins} brings the document's React plugins
 * (component picker, floating toolbar, table menus, ...) along.
 */
export const PlaygroundHeaderFooterEditorExtension = defineExtension({
  dependencies: [
    PlaygroundContentExtension,
    PlaygroundRichTextContentExtension,
    HistoryExtension,
    PageCounterNodesExtension,
    // The floating text format toolbar registers itself as a roving
    // tabindex container.
    RovingTabIndexExtension,
    ReactPluginHostExtension,
    configExtension(ReactExtension, {
      decorators: [NestedEditorPluginsDecorator],
    }),
  ],
  name: '@lexical/playground/HeaderFooterEditor',
  namespace: 'Playground/HeaderFooter',
});

/** Builds a nested header/footer editor with the playground's feature set. */
export function buildPlaygroundHeaderFooterEditor(
  parent: LexicalEditor,
): LexicalEditorWithDispose {
  return buildEditorFromExtensions(
    defineExtension({
      dependencies: [
        configExtension(NestedEditorExtension, {
          $getParentEditor: () => parent,
          inheritEditableFromParent: false,
        }),
        PlaygroundHeaderFooterEditorExtension,
      ],
      name: '@lexical/playground/HeaderFooterEditorInstance',
    }),
  );
}
