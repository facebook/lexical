/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  FootnoteDefinition,
  FootnoteReference,
  MdastExportHandler,
  MdastImportHandler,
  PhrasingContent,
  RootContent,
} from '@lexical/mdast';

import {GetClipboardDataExtension} from '@lexical/clipboard';
import {$getExtensionOutput, DecoratorTextExtension} from '@lexical/extension';
import {
  $generateDOMFromRoot,
  $getRenderContextValue,
  defineImportRule,
  DOMImportExtension,
  domOverride,
  DOMRenderExtension,
  ImportTextFormat,
  sel,
} from '@lexical/html';
import {
  MdastExportExtension,
  MdastImportExtension,
  RenderContextMarkdownSelection,
} from '@lexical/mdast';
import {mergeRegister} from '@lexical/utils';
import {
  $create,
  $createParagraphNode,
  $getDocument,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $getSlot,
  $isDecoratorNode,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  CLEAR_EDITOR_COMMAND,
  COLLABORATION_TAG,
  COMMAND_PRIORITY_BEFORE_EDITOR,
  COMMAND_PRIORITY_EDITOR,
  configExtension,
  createCommand,
  defineExtension,
  HISTORIC_TAG,
  IS_APPLE,
  isExactShortcutMatch,
  isHTMLElement,
  KEY_DOWN_COMMAND,
  type LexicalCommand,
  type LexicalEditor,
  RootNode,
} from 'lexical';
import {
  gfmFootnoteFromMarkdown,
  gfmFootnoteToMarkdown,
} from 'mdast-util-gfm-footnote';
import {defaultHandlers, type Options} from 'mdast-util-to-markdown';
import {gfmFootnote} from 'micromark-extension-gfm-footnote';

import {
  $clearFootnotes,
  $createFootnoteRefNode,
  $ensureFootnoteDefinition,
  $isFootnoteDefinitionNode,
  $isFootnoteRefNode,
  $isFootnotesNode,
  FootnoteDefinitionNode,
  FootnoteRefNode,
  FOOTNOTES_SLOT,
  FootnotesNode,
  normalizeLabel,
  registerFootnoteBacklinks,
} from './FootnoteNodes';

/* -------------------------------------------------------------------------- *
 * Markdown import: refs inline, definitions relocated to the footnotes slot  *
 * -------------------------------------------------------------------------- */

// The surrounding emphasis/strong/delete formats (`**x[^a]**`) land on the
// ref's DecoratorTextNode format bitmask, the way they land on text nodes.
const $importFootnoteReference: MdastImportHandler<FootnoteReference> = (
  node,
  ctx,
) => [
  $createFootnoteRefNode(node.label ?? node.identifier).setFormat(ctx.format),
];

// Definitions import as ordinary flow nodes; the FootnoteDefinitionNode
// transform relocates them into the root's footnotes slot in the same
// update, so this also covers paste and any other entry path.
const $importFootnoteDefinition: MdastImportHandler<FootnoteDefinition> = (
  node,
  ctx,
) => {
  const definition = $create(FootnoteDefinitionNode).setLabel(
    node.label ?? node.identifier,
  );
  definition.append(...node.children.flatMap(child => ctx.importNode(child)));
  return [definition];
};

/* -------------------------------------------------------------------------- *
 * Markdown export: refs from the walk, definitions appended by the root      *
 * handler                                                                    *
 * -------------------------------------------------------------------------- */

const $exportFootnoteRef: MdastExportHandler<FootnoteRefNode> = node => {
  let content: PhrasingContent = {
    identifier: normalizeLabel(node.getLabel()),
    label: node.getLabel(),
    type: 'footnoteReference',
  };
  // The format bitmask re-wraps in phrasing containers, nesting in the same
  // order as the core text serialization (emphasis innermost).
  if (node.hasFormat('italic')) {
    content = {children: [content], type: 'emphasis'};
  }
  if (node.hasFormat('bold')) {
    content = {children: [content], type: 'strong'};
  }
  if (node.hasFormat('strikethrough')) {
    content = {children: [content], type: 'delete'};
  }
  return content;
};

const $exportFootnoteDefinition: MdastExportHandler<FootnoteDefinitionNode> = (
  node,
  ctx,
) => ({
  // A freshly minted definition holds one empty paragraph; dropping it
  // serializes as a clean `[^label]:` instead of `[^label]: ` with a
  // trailing space.
  children: (ctx.exportChildren(node) as FootnoteDefinition['children']).filter(
    child => !(child.type === 'paragraph' && child.children.length === 0),
  ),
  identifier: normalizeLabel(node.getLabel()),
  label: node.getLabel(),
  type: 'footnoteDefinition',
});

// The registry's text-run accumulator merges adjacent same-format TEXT into
// one delimiter pair, but a formatted ref exports through its own handler,
// so `**x**` + `**[^a]**` would sit side by side and serialize as the
// broken `**x****[^a]**` / `*em**[^a]*` shapes. Folding adjacent same-type
// wrappers back together before serialization keeps the emitted Markdown
// re-parseable (`**x[^a]**`).
const MERGEABLE_PHRASING = new Set(['delete', 'emphasis', 'strong']);

function mergeAdjacentPhrasing(node: {children?: unknown[]}): void {
  const children = (node.children ?? []) as {
    type: string;
    children?: unknown[];
  }[];
  for (let i = children.length - 1; i > 0; i--) {
    const prev = children[i - 1];
    const current = children[i];
    if (
      MERGEABLE_PHRASING.has(current.type) &&
      prev.type === current.type &&
      prev.children !== undefined &&
      current.children !== undefined
    ) {
      prev.children.push(...current.children);
      children.splice(i, 1);
    }
  }
  children.forEach(mergeAdjacentPhrasing);
}

/** Every footnoteReference identifier in an mdast (sub)tree. */
function collectFootnoteReferenceIds(
  node: {type?: string; identifier?: string; children?: unknown[]},
  out: Set<string>,
): void {
  if (node.type === 'footnoteReference' && node.identifier !== undefined) {
    out.add(node.identifier);
  }
  for (const child of node.children ?? []) {
    collectFootnoteReferenceIds(child as {type?: string}, out);
  }
}

// The footnotes live on a root slot, outside the children walk, so nothing
// dispatches them during a normal export. A contributed to-markdown `root`
// handler runs synchronously inside the exporting editor.read(), where the
// slot is readable and the registry's exporter re-entrant: serialize the
// section as its own subtree and append the definitions to the document
// tree before delegating. gfmFootnoteToMarkdown then emits the `[^label]:`
// syntax (multi-block continuation indent included) at the document end.
const footnotesRootHandler = {
  handlers: {
    root: (node, parent, state, info) => {
      const footnotes = $getSlot($getRoot(), FOOTNOTES_SLOT);
      if ($isFootnotesNode(footnotes) && !footnotes.isEmpty()) {
        const {$convertToMdast} = $getExtensionOutput(MdastExportExtension);
        // On a whole-document export ALL definitions ride along, in section
        // order — an editor preserves content, unlike a renderer, so
        // unreferenced definitions survive the round trip too. A selection
        // export (a clipboard copy) instead scopes them to the references
        // that made it into the exported tree.
        let definitions: RootContent[] = $convertToMdast(footnotes).children;
        if ($getRenderContextValue(RenderContextMarkdownSelection) !== null) {
          const referenced = new Set<string>();
          collectFootnoteReferenceIds(node, referenced);
          definitions = definitions.filter(
            child =>
              child.type === 'footnoteDefinition' &&
              referenced.has(child.identifier),
          );
        }
        node.children.push(...definitions);
      }
      mergeAdjacentPhrasing(node);
      return defaultHandlers.root(node, parent, state, info);
    },
  },
} satisfies Options;

/* -------------------------------------------------------------------------- *
 * Rendering: the root slot's container reveals at the document bottom        *
 * -------------------------------------------------------------------------- */

// Slot containers park hidden slots-first in the host DOM. For the root's
// footnotes slot, reveal at the BOTTOM instead: a chrome anchor element is
// appended to the root DOM (created during reconciliation, so the mutation
// observer never sees it as foreign), $getSlotTargetElement re-parents the
// container into it, and $getDOMSlot bounds the root's managed children
// range before the anchor so new blocks always insert above the section.
const FootnotesRenderOverride = domOverride([RootNode], {
  $getDOMSlot: (_node, dom, $next) => {
    const anchor = dom.querySelector<HTMLElement>(':scope > .footnotes-anchor');
    const slot = $next();
    return anchor === null ? slot : slot.withBefore(anchor);
  },
  $getSlotTargetElement: (_node, slotName, hostDom, $next) => {
    if (slotName !== FOOTNOTES_SLOT) {
      return $next();
    }
    let anchor = hostDom.querySelector<HTMLElement>(
      ':scope > .footnotes-anchor',
    );
    if (anchor === null) {
      anchor = $getDocument().createElement('div');
      anchor.className = 'footnotes-anchor';
      hostDom.append(anchor);
    }
    return anchor;
  },
});

/* -------------------------------------------------------------------------- *
 * HTML paste: our own clipboard encoding                                     *
 * -------------------------------------------------------------------------- */

const FootnoteRefDOMImportRule = defineImportRule({
  // The accumulated format context (<b>, <em>, ... ancestors) carries onto
  // the ref, matching how the core #text rule applies it to text.
  $import: (ctx, el) => [
    $createFootnoteRefNode(
      el.getAttribute('data-footnote-ref') || '',
    ).setFormat(ctx.get(ImportTextFormat)),
  ],
  match: sel.tag('sup').attr('data-footnote-ref', true),
  name: '@lexical/dev-mdast-editor-example/footnote-ref-html',
});

// Reads back the envelope exportDOM emits (copying a selection with refs
// appends the referenced definitions to the clipboard HTML — see the
// GetClipboardDataExtension config below). The definition lands in the flow
// at the paste position and the node transform relocates it into the
// footnotes slot.
const FootnoteDefDOMImportRule = defineImportRule({
  $import: (ctx, el) => {
    const definition = $create(FootnoteDefinitionNode).setLabel(
      el.getAttribute('data-footnote-def') || '',
    );
    const content: ReturnType<typeof ctx.$importOne> = [];
    for (const child of Array.from(el.childNodes)) {
      // The `[^label]:` marker span is chrome, not content.
      if (
        isHTMLElement(child) &&
        child.hasAttribute('data-footnote-def-label')
      ) {
        continue;
      }
      content.push(...ctx.$importOne(child));
    }
    // The body is block content; wrap stray inline runs in paragraphs.
    let paragraph = null;
    for (const child of content) {
      if (
        ($isElementNode(child) || $isDecoratorNode(child)) &&
        !child.isInline()
      ) {
        paragraph = null;
        definition.append(child);
      } else {
        if (paragraph === null) {
          paragraph = $createParagraphNode();
          definition.append(paragraph);
        }
        paragraph.append(child);
      }
    }
    return [definition];
  },
  match: sel.tag('div').attr('data-footnote-def', true),
  name: '@lexical/dev-mdast-editor-example/footnote-def-html',
});

/* -------------------------------------------------------------------------- *
 * Clipboard export: selected refs carry their definitions                    *
 * -------------------------------------------------------------------------- */

// Copying part of a document detaches references from the notes they point
// at, so the definitions for every ref in the selection ride along at the
// end of the payload: the Markdown path scopes the root handler above via
// the selection option, and this handler appends the definitions' HTML
// (each in its data-footnote-def envelope) after the default clipboard
// serialization.
const FootnoteClipboardConfig = configExtension(GetClipboardDataExtension, {
  $exportMimeType: {
    'text/html': [
      (selection, $next) => {
        const html = $next();
        if (html === null || html === '' || selection === null) {
          return html;
        }
        const labels = new Set(
          selection
            .getNodes()
            .filter($isFootnoteRefNode)
            .map(node => normalizeLabel(node.getLabel())),
        );
        const footnotes = $getSlot($getRoot(), FOOTNOTES_SLOT);
        if (labels.size === 0 || !$isFootnotesNode(footnotes)) {
          return html;
        }
        const container = $getDocument().createElement('div');
        for (const definition of footnotes.getChildren()) {
          if (
            $isFootnoteDefinitionNode(definition) &&
            labels.has(normalizeLabel(definition.getLabel()))
          ) {
            $generateDOMFromRoot(container, definition);
          }
        }
        return html + container.innerHTML;
      },
    ],
  },
});

/* -------------------------------------------------------------------------- *
 * The `[^label]` typing shortcut                                             *
 * -------------------------------------------------------------------------- */

// micromark only tokenizes `[^label]` as a footnote reference when the
// label is already defined in the parsed document, so the streaming
// shortcut engine's fragment re-parse can never recognize one (the same
// reason the package special-cases task-list checkboxes). A small update
// listener handles it instead: typing `]` after `[^label` materializes the
// reference and creates the (empty) definition when it doesn't exist yet.
const SHORTCUT_RE = /\[\^([^\s[\]^]+)\]$/;
export const FOOTNOTE_SHORTCUT_TAG = 'footnote-shortcut';

function registerFootnoteShortcut(editor: LexicalEditor): () => void {
  return editor.registerUpdateListener(({editorState, dirtyLeaves, tags}) => {
    if (
      dirtyLeaves.size === 0 ||
      tags.has(FOOTNOTE_SHORTCUT_TAG) ||
      tags.has(HISTORIC_TAG) ||
      tags.has(COLLABORATION_TAG) ||
      !editor.isEditable()
    ) {
      return;
    }
    const match = editorState.read(
      () => {
        const selection = $getSelection();
        if (
          !$isRangeSelection(selection) ||
          !selection.isCollapsed() ||
          selection.anchor.type !== 'text'
        ) {
          return null;
        }
        const node = selection.anchor.getNode();
        const offset = selection.anchor.offset;
        if (
          !$isTextNode(node) ||
          !node.isSimpleText() ||
          node.hasFormat('code') ||
          !dirtyLeaves.has(node.getKey()) ||
          node.getTextContent().charAt(offset - 1) !== ']'
        ) {
          return null;
        }
        const found = SHORTCUT_RE.exec(node.getTextContent().slice(0, offset));
        return found === null
          ? null
          : {
              end: offset,
              key: node.getKey(),
              label: found[1],
              start: offset - found[0].length,
            };
      },
      {editor},
    );
    if (match === null) {
      return;
    }
    editor.update(
      () => {
        const node = $getNodeByKey(match.key);
        if (!$isTextNode(node)) {
          return;
        }
        let target;
        if (match.start <= 0) {
          [target] = node.splitText(match.end);
        } else {
          const parts = node.splitText(match.start, match.end);
          target = parts.length === 3 ? parts[1] : parts[parts.length - 1];
        }
        // The ref inherits the typed text's format, like the typed
        // characters it replaces.
        const ref = $createFootnoteRefNode(match.label).setFormat(
          target.getFormat(),
        );
        target.replace(ref);
        $ensureFootnoteDefinition(match.label);
        // Caret lands after the new reference (an element point on the
        // parent, so it works whether or not a sibling follows).
        const offset = ref.getIndexWithinParent() + 1;
        ref.getParentOrThrow().select(offset, offset);
      },
      {tag: FOOTNOTE_SHORTCUT_TAG},
    );
  });
}

/* -------------------------------------------------------------------------- *
 * The extension                                                              *
 * -------------------------------------------------------------------------- */

/**
 * Inserts a footnote reference at the selection (auto-numbered label),
 * creates its empty definition, and moves the caret into the definition
 * body to type the note.
 */
export const INSERT_FOOTNOTE_COMMAND: LexicalCommand<void> = createCommand(
  'INSERT_FOOTNOTE_COMMAND',
);

/**
 * GFM footnotes for the Markdown pipeline, demonstrating begin/end-of-document
 * data managed outside the children channel:
 *
 * - `[^label]` references are inline {@link FootnoteRefNode} decorators; the
 *   definitions live in a {@link FootnotesNode} held in a `footnotes` slot on
 *   the RootNode and rendered at the bottom of the editor via a RootNode
 *   render override.
 * - Import uses the GFM footnote grammar; imported definitions relocate from
 *   the flow into the slot by node transform. Export appends the definitions
 *   from the slot to the document end via a contributed to-markdown `root`
 *   handler (the slot is outside the export walk).
 * - Typing `[^label]` materializes a reference (and its definition) — a
 *   bespoke trigger, since micromark only recognizes references whose
 *   definition exists in the parsed text.
 */
export const MdastFootnoteExtension = defineExtension({
  dependencies: [
    // FootnoteRefNode extends DecoratorTextNode: refs participate in
    // FORMAT_TEXT_COMMAND and format alignment like the text around them.
    DecoratorTextExtension,
    FootnoteClipboardConfig,
    configExtension(DOMImportExtension, {
      rules: [FootnoteRefDOMImportRule, FootnoteDefDOMImportRule],
    }),
    configExtension(DOMRenderExtension, {
      overrides: [FootnotesRenderOverride],
    }),
    configExtension(MdastImportExtension, {
      exportRules: [
        {$export: $exportFootnoteRef, type: 'footnote-ref'},
        {$export: $exportFootnoteDefinition, type: 'footnote-def'},
      ],
      importRules: [
        {$import: $importFootnoteReference, type: 'footnoteReference'},
        {$import: $importFootnoteDefinition, type: 'footnoteDefinition'},
      ],
      mdastExtensions: [gfmFootnoteFromMarkdown()],
      micromarkExtensions: [gfmFootnote()],
      toMarkdownExtensions: [gfmFootnoteToMarkdown(), footnotesRootHandler],
    }),
  ],
  name: '@lexical/dev-mdast-editor-example/MdastFootnote',
  nodes: [FootnoteRefNode, FootnoteDefinitionNode, FootnotesNode],
  register: editor =>
    mergeRegister(
      registerFootnoteShortcut(editor),
      registerFootnoteBacklinks(editor),
      editor.registerCommand(
        KEY_DOWN_COMMAND,
        event => {
          if (
            isExactShortcutMatch(event, 'f', {
              altKey: true,
              ctrlKey: !IS_APPLE,
              metaKey: IS_APPLE,
            })
          ) {
            event.preventDefault();
            event.stopPropagation();
            editor.dispatchCommand(INSERT_FOOTNOTE_COMMAND, undefined);
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_BEFORE_EDITOR,
      ),
      // Slots are a separate channel from the children that
      // CLEAR_EDITOR_COMMAND's default handler clears, so clearing the
      // editor participates here: drop the footnotes section, then fall
      // through (return false) to the ClearEditorExtension handler.
      editor.registerCommand(
        CLEAR_EDITOR_COMMAND,
        () => {
          $clearFootnotes();
          return false;
        },
        COMMAND_PRIORITY_BEFORE_EDITOR,
      ),
      editor.registerCommand(
        INSERT_FOOTNOTE_COMMAND,
        () => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return false;
          }
          let label = selection.getTextContent().trim();
          if (!label) {
            // Smallest unused numeric label.
            const footnotes = $getSlot($getRoot(), FOOTNOTES_SLOT);
            const used = new Set(
              ($isFootnotesNode(footnotes) ? footnotes.getChildren() : [])
                .filter($isFootnoteDefinitionNode)
                .map(definition => normalizeLabel(definition.getLabel())),
            );
            let n = 1;
            while (used.has(String(n))) {
              n++;
            }
            label = String(n);
          }
          selection.insertNodes([$createFootnoteRefNode(label)]);
          // Jump into the new definition to type the note.
          $ensureFootnoteDefinition(label).selectEnd();
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
    ),
});

export {
  $clearFootnotes,
  $findFootnoteDefinition,
  $getFootnotesNode,
} from './FootnoteNodes';
