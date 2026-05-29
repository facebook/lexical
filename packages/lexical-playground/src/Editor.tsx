/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import {batch, SelectionAlwaysOnDisplayExtension} from '@lexical/extension';
import {
  ClickableLinkExtension,
  LinkAttributes,
  LinkExtension,
} from '@lexical/link';
import {CheckListExtension, ListExtension} from '@lexical/list';
import {CharacterLimitPlugin} from '@lexical/react/LexicalCharacterLimitPlugin';
import {
  CollaborationPlugin,
  CollaborationPluginV2__EXPERIMENTAL,
} from '@lexical/react/LexicalCollaborationPlugin';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {TabIndentationPlugin} from '@lexical/react/LexicalTabIndentationPlugin';
import {useOptionalExtensionDependency} from '@lexical/react/useExtensionComponent';
import {useLexicalEditable} from '@lexical/react/useLexicalEditable';
import {TableExtension} from '@lexical/table';
import {CAN_USE_DOM} from '@lexical/utils';
import {useEffect, useMemo, useState} from 'react';
import {Doc} from 'yjs';

import {
  createWebsocketProvider,
  createWebsocketProviderWithDoc,
} from './collaboration';
import {useSettings} from './context/SettingsContext';
import ActionsPlugin from './plugins/ActionsPlugin';
import {AutocompleteExtension} from './plugins/AutocompleteExtension';
import AutoEmbedPlugin from './plugins/AutoEmbedPlugin';
import CodeActionMenuPlugin from './plugins/CodeActionMenuPlugin';
import {CodeHighlightExtension} from './plugins/CodeHighlightExtension';
import CommentPlugin from './plugins/CommentPlugin';
import ComponentPickerPlugin from './plugins/ComponentPickerPlugin';
import ContextMenuPlugin from './plugins/ContextMenuPlugin';
import DraggableBlockPlugin from './plugins/DraggableBlockPlugin';
import EmojiPickerPlugin from './plugins/EmojiPickerPlugin';
import {ExcalidrawPlugin} from './plugins/ExcalidrawExtension';
import FloatingLinkEditorPlugin from './plugins/FloatingLinkEditorPlugin';
import FloatingTextFormatToolbarPlugin from './plugins/FloatingTextFormatToolbarPlugin';
import {MaxLengthExtension} from './plugins/MaxLengthPlugin';
import {MentionsPlugin} from './plugins/MentionsExtension';
import ShortcutsPlugin from './plugins/ShortcutsPlugin';
import {SpecialTextExtension} from './plugins/SpecialTextExtension';
import SpeechToTextPlugin from './plugins/SpeechToTextPlugin';
import TableCellActionMenuPlugin from './plugins/TableActionMenuPlugin';
import TableCellResizer from './plugins/TableCellResizer';
import TableFitNestedTablePlugin from './plugins/TableFitNestedTablePlugin';
import TableHoverActionsV2Plugin from './plugins/TableHoverActionsV2Plugin';
import TableOfContentsPlugin from './plugins/TableOfContentsPlugin';
import TableScrollShadowPlugin from './plugins/TableScrollShadowPlugin';
import ToolbarPlugin from './plugins/ToolbarPlugin';
import TreeViewPlugin from './plugins/TreeViewPlugin';
import {VersionsPlugin} from './plugins/VersionsPlugin';
import {VisibleLineBreakExtension} from './plugins/VisibleLineBreakExtension';
import ContentEditable from './ui/ContentEditable';

const COLLAB_DOC_ID = 'main';

const skipCollaborationInit =
  // @ts-expect-error
  window.parent != null && window.parent.frames.right === window;

const DEFAULT_LINK_ATTRIBUTES: LinkAttributes = {
  rel: 'noopener noreferrer',
  target: '_blank',
};

export default function Editor(): JSX.Element {
  const {
    settings: {
      isCodeHighlighted,
      isCodeShiki,
      isCollab,
      useCollabV2,
      isMaxLength,
      isCharLimit,
      hasLinkAttributes,
      hasFitNestedTables,
      tableCellMerge,
      tableCellBackgroundColor,
      tableHorizontalScroll,
      hasNestedTables,
      isCharLimitUtf8,
      isRichText,
      showTreeView,
      showTableOfContents,
      shouldUseLexicalContextMenu,
      shouldPreserveNewLinesInMarkdown,
      shouldAllowHighlightingWithBrackets,
      selectionAlwaysOnDisplay,
      listStrictIndent,
      shouldDisableFocusOnClickChecklist,
      isAutocomplete,
      isVisibleLineBreak,
    },
  } = useSettings();
  const isEditable = useLexicalEditable();
  const placeholder = isCollab
    ? 'Enter some collaborative rich text...'
    : isRichText
      ? 'Enter some rich text...'
      : 'Enter some plain text...';
  const [floatingAnchorElem, setFloatingAnchorElem] =
    useState<HTMLDivElement | null>(null);
  const [isSmallWidthViewport, setIsSmallWidthViewport] =
    useState<boolean>(false);
  const [editor] = useLexicalComposerContext();
  const [activeEditor, setActiveEditor] = useState(editor);
  const [isLinkEditMode, setIsLinkEditMode] = useState<boolean>(false);

  const onRef = (_floatingAnchorElem: HTMLDivElement) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem);
    }
  };

  // Settings that a live editor can react to are mirrored into their
  // extensions' reactive config signals here — NOT in App.tsx's
  // DynamicSettings, which would tear down and rebuild the whole editor on
  // every change. A @preact/signals-core write is a no-op when the value is
  // unchanged (strict `!==`), so toggling one setting only does work for the
  // signal that changed, and `batch` coalesces the resulting extension effects
  // (e.g. TableExtension's reconcile) into a single flush.
  const autocomplete = useOptionalExtensionDependency(
    AutocompleteExtension,
  )?.output;
  const visibleLineBreak = useOptionalExtensionDependency(
    VisibleLineBreakExtension,
  )?.output;
  const maxLength = useOptionalExtensionDependency(MaxLengthExtension)?.output;
  const codeHighlight = useOptionalExtensionDependency(
    CodeHighlightExtension,
  )?.output;
  const specialText =
    useOptionalExtensionDependency(SpecialTextExtension)?.output;
  const link = useOptionalExtensionDependency(LinkExtension)?.output;
  const list = useOptionalExtensionDependency(ListExtension)?.output;
  const table = useOptionalExtensionDependency(TableExtension)?.output;
  const checkList = useOptionalExtensionDependency(CheckListExtension)?.output;
  const clickableLink = useOptionalExtensionDependency(
    ClickableLinkExtension,
  )?.output;
  const selectionDisplay = useOptionalExtensionDependency(
    SelectionAlwaysOnDisplayExtension,
  )?.output;

  useEffect(() => {
    batch(() => {
      if (autocomplete) {
        autocomplete.disabled.value = !isAutocomplete;
      }
      if (visibleLineBreak) {
        visibleLineBreak.disabled.value = !isVisibleLineBreak;
      }
      if (maxLength) {
        maxLength.disabled.value = !isMaxLength;
      }
      if (codeHighlight) {
        codeHighlight.mode.value = !isCodeHighlighted
          ? 'off'
          : isCodeShiki
            ? 'shiki'
            : 'prism';
      }
      if (specialText) {
        specialText.disabled.value = !shouldAllowHighlightingWithBrackets;
      }
      if (link) {
        link.attributes.value = hasLinkAttributes
          ? DEFAULT_LINK_ATTRIBUTES
          : undefined;
      }
      if (list) {
        list.hasStrictIndent.value = listStrictIndent;
      }
      if (table) {
        table.hasCellMerge.value = tableCellMerge;
        table.hasCellBackgroundColor.value = tableCellBackgroundColor;
        table.hasHorizontalScroll.value =
          tableHorizontalScroll && !hasFitNestedTables;
        table.hasNestedTables.value = hasNestedTables;
      }
      if (checkList) {
        checkList.disableTakeFocusOnClick.value =
          shouldDisableFocusOnClickChecklist;
      }
      if (clickableLink) {
        clickableLink.disabled.value = isEditable;
      }
      if (selectionDisplay) {
        selectionDisplay.disabled.value = !selectionAlwaysOnDisplay;
      }
    });
  }, [
    autocomplete,
    visibleLineBreak,
    maxLength,
    codeHighlight,
    specialText,
    link,
    list,
    table,
    checkList,
    clickableLink,
    selectionDisplay,
    isAutocomplete,
    isVisibleLineBreak,
    isMaxLength,
    isCodeHighlighted,
    isCodeShiki,
    shouldAllowHighlightingWithBrackets,
    hasLinkAttributes,
    listStrictIndent,
    tableCellMerge,
    tableCellBackgroundColor,
    tableHorizontalScroll,
    hasNestedTables,
    hasFitNestedTables,
    shouldDisableFocusOnClickChecklist,
    isEditable,
    selectionAlwaysOnDisplay,
  ]);

  useEffect(() => {
    const updateViewPortWidth = () => {
      const isNextSmallWidthViewport =
        CAN_USE_DOM && window.matchMedia('(max-width: 1025px)').matches;

      if (isNextSmallWidthViewport !== isSmallWidthViewport) {
        setIsSmallWidthViewport(isNextSmallWidthViewport);
      }
    };
    updateViewPortWidth();
    window.addEventListener('resize', updateViewPortWidth);

    return () => {
      window.removeEventListener('resize', updateViewPortWidth);
    };
  }, [isSmallWidthViewport]);

  return (
    <>
      {isRichText && (
        <ToolbarPlugin
          editor={editor}
          activeEditor={activeEditor}
          setActiveEditor={setActiveEditor}
          setIsLinkEditMode={setIsLinkEditMode}
        />
      )}
      {isRichText && (
        <ShortcutsPlugin
          editor={activeEditor}
          setIsLinkEditMode={setIsLinkEditMode}
        />
      )}
      <div
        className={`editor-container ${showTreeView ? 'tree-view' : ''} ${
          !isRichText ? 'plain-text' : ''
        }`}>
        <ComponentPickerPlugin />
        <EmojiPickerPlugin />
        <AutoEmbedPlugin />
        <MentionsPlugin />
        <SpeechToTextPlugin />
        {!(isCollab && useCollabV2) && (
          <CommentPlugin
            providerFactory={isCollab ? createWebsocketProvider : undefined}
          />
        )}
        {isRichText ? (
          <>
            {isCollab ? (
              useCollabV2 ? (
                <>
                  <CollabV2
                    id={COLLAB_DOC_ID}
                    shouldBootstrap={!skipCollaborationInit}
                  />
                  <VersionsPlugin id={COLLAB_DOC_ID} />
                </>
              ) : (
                <CollaborationPlugin
                  id={COLLAB_DOC_ID}
                  providerFactory={createWebsocketProvider}
                  shouldBootstrap={!skipCollaborationInit}
                />
              )
            ) : null}
            <div className="editor-scroller">
              <div className="editor" ref={onRef}>
                <ContentEditable placeholder={placeholder} />
              </div>
            </div>
            {hasFitNestedTables ? <TableFitNestedTablePlugin /> : null}
            <TableCellResizer />
            <TableScrollShadowPlugin />
            <ExcalidrawPlugin />
            <TabIndentationPlugin maxIndent={7} />
            {floatingAnchorElem && (
              <>
                <FloatingLinkEditorPlugin
                  anchorElem={floatingAnchorElem}
                  isLinkEditMode={isLinkEditMode}
                  setIsLinkEditMode={setIsLinkEditMode}
                />
                <TableCellActionMenuPlugin
                  anchorElem={floatingAnchorElem}
                  cellMerge={true}
                />
              </>
            )}
            {floatingAnchorElem && !isSmallWidthViewport && (
              <>
                <DraggableBlockPlugin anchorElem={floatingAnchorElem} />
                <CodeActionMenuPlugin anchorElem={floatingAnchorElem} />
                <TableHoverActionsV2Plugin anchorElem={floatingAnchorElem} />
                <FloatingTextFormatToolbarPlugin
                  anchorElem={floatingAnchorElem}
                  setIsLinkEditMode={setIsLinkEditMode}
                />
              </>
            )}
          </>
        ) : (
          <ContentEditable placeholder={placeholder} />
        )}
        {(isCharLimit || isCharLimitUtf8) && (
          <CharacterLimitPlugin
            charset={isCharLimit ? 'UTF-16' : 'UTF-8'}
            maxLength={5}
          />
        )}
        <div>{showTableOfContents && <TableOfContentsPlugin />}</div>
        {shouldUseLexicalContextMenu && <ContextMenuPlugin />}
        <ActionsPlugin
          shouldPreserveNewLinesInMarkdown={shouldPreserveNewLinesInMarkdown}
          useCollabV2={useCollabV2}
        />
      </div>
      {showTreeView && <TreeViewPlugin />}
    </>
  );
}

function CollabV2({
  id,
  shouldBootstrap,
}: {
  id: string;
  shouldBootstrap: boolean;
}) {
  // VersionsPlugin needs GC disabled.
  const doc = useMemo(() => new Doc({gc: false}), []);

  const provider = useMemo(() => {
    return createWebsocketProviderWithDoc('main', doc);
  }, [doc]);

  return (
    <CollaborationPluginV2__EXPERIMENTAL
      id={id}
      doc={doc}
      provider={provider}
      __shouldBootstrapUnsafe={shouldBootstrap}
    />
  );
}
