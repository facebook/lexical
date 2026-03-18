/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import {
  SelectionAlwaysOnDisplayExtension,
  type Signal,
} from '@lexical/extension';
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
import {TablePlugin} from '@lexical/react/LexicalTablePlugin';
import {useOptionalExtensionDependency} from '@lexical/react/useExtensionComponent';
import {useLexicalEditable} from '@lexical/react/useLexicalEditable';
import {CAN_USE_DOM} from '@lexical/utils';
import {OutputExtension} from 'lexical';
import {useEffect, useMemo, useState} from 'react';
import {Doc} from 'yjs';

import {
  createWebsocketProvider,
  createWebsocketProviderWithDoc,
} from './collaboration';
import {useSettings} from './context/SettingsContext';
import ActionsPlugin from './plugins/ActionsPlugin';
import AutocompletePlugin from './plugins/AutocompletePlugin';
import AutoEmbedPlugin from './plugins/AutoEmbedPlugin';
import CodeActionMenuPlugin from './plugins/CodeActionMenuPlugin';
import CodeHighlightPrismPlugin from './plugins/CodeHighlightPrismPlugin';
import CodeHighlightShikiPlugin from './plugins/CodeHighlightShikiPlugin';
import CollapsiblePlugin from './plugins/CollapsiblePlugin';
import CommentPlugin from './plugins/CommentPlugin';
import ComponentPickerPlugin from './plugins/ComponentPickerPlugin';
import ContextMenuPlugin from './plugins/ContextMenuPlugin';
import DraggableBlockPlugin from './plugins/DraggableBlockPlugin';
import EmojiPickerPlugin from './plugins/EmojiPickerPlugin';
import EquationsPlugin from './plugins/EquationsPlugin';
import ExcalidrawPlugin from './plugins/ExcalidrawPlugin';
import FigmaPlugin from './plugins/FigmaPlugin';
import FloatingLinkEditorPlugin from './plugins/FloatingLinkEditorPlugin';
import FloatingTextFormatToolbarPlugin from './plugins/FloatingTextFormatToolbarPlugin';
import {LayoutPlugin} from './plugins/LayoutPlugin/LayoutPlugin';
import {MaxLengthExtension} from './plugins/MaxLengthPlugin';
import MentionsPlugin from './plugins/MentionsPlugin';
import PageBreakPlugin from './plugins/PageBreakPlugin';
import PollPlugin from './plugins/PollPlugin';
import ShortcutsPlugin from './plugins/ShortcutsPlugin';
import SpecialTextPlugin from './plugins/SpecialTextPlugin';
import SpeechToTextPlugin from './plugins/SpeechToTextPlugin';
import TabFocusPlugin from './plugins/TabFocusPlugin';
import TableCellActionMenuPlugin from './plugins/TableActionMenuPlugin';
import TableCellResizer from './plugins/TableCellResizer';
import TableFitNestedTablePlugin from './plugins/TableFitNestedTablePlugin';
import TableHoverActionsV2Plugin from './plugins/TableHoverActionsV2Plugin';
import TableOfContentsPlugin from './plugins/TableOfContentsPlugin';
import TableScrollShadowPlugin from './plugins/TableScrollShadowPlugin';
import ToolbarPlugin from './plugins/ToolbarPlugin';
import TreeViewPlugin from './plugins/TreeViewPlugin';
import TwitterPlugin from './plugins/TwitterPlugin';
import {VersionsPlugin} from './plugins/VersionsPlugin';
import YouTubePlugin from './plugins/YouTubePlugin';
import ContentEditable from './ui/ContentEditable';

const COLLAB_DOC_ID = 'main';

const skipCollaborationInit =
  // @ts-expect-error
  window.parent != null && window.parent.frames.right === window;

export function useSyncExtensionSignal<
  K extends string,
  V,
  Output extends {[Key in K]: Signal<V>},
>(extension: OutputExtension<Output>, prop: K, value: V) {
  const signal = useOptionalExtensionDependency(extension)?.output[prop];
  useEffect(() => {
    if (signal) {
      signal.value = value;
    }
  }, [signal, value]);
}

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
      isAutocomplete,
      isMaxLength,
      isCharLimit,
      hasLinkAttributes,
      hasNestedTables,
      hasFitNestedTables,
      isCharLimitUtf8,
      isRichText,
      showTreeView,
      showTableOfContents,
      shouldUseLexicalContextMenu,
      shouldPreserveNewLinesInMarkdown,
      tableCellMerge,
      tableCellBackgroundColor,
      tableHorizontalScroll,
      shouldAllowHighlightingWithBrackets,
      selectionAlwaysOnDisplay,
      listStrictIndent,
      shouldDisableFocusOnClickChecklist,
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

  useSyncExtensionSignal(MaxLengthExtension, 'disabled', !isMaxLength);
  useSyncExtensionSignal(
    LinkExtension,
    'attributes',
    hasLinkAttributes ? DEFAULT_LINK_ATTRIBUTES : undefined,
  );
  useSyncExtensionSignal(ListExtension, 'hasStrictIndent', listStrictIndent);
  useSyncExtensionSignal(
    CheckListExtension,
    'disableTakeFocusOnClick',
    shouldDisableFocusOnClickChecklist,
  );
  useSyncExtensionSignal(ClickableLinkExtension, 'disabled', isEditable);
  useSyncExtensionSignal(
    SelectionAlwaysOnDisplayExtension,
    'disabled',
    !selectionAlwaysOnDisplay,
  );

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
            {isCodeHighlighted &&
              (isCodeShiki ? (
                <CodeHighlightShikiPlugin />
              ) : (
                <CodeHighlightPrismPlugin />
              ))}
            <TablePlugin
              hasCellMerge={tableCellMerge}
              hasCellBackgroundColor={tableCellBackgroundColor}
              hasHorizontalScroll={tableHorizontalScroll && !hasFitNestedTables}
              hasNestedTables={hasNestedTables}
            />
            {hasFitNestedTables ? <TableFitNestedTablePlugin /> : null}
            <TableCellResizer />
            <TableScrollShadowPlugin />
            <PollPlugin />
            <TwitterPlugin />
            <YouTubePlugin />
            <FigmaPlugin />
            <EquationsPlugin />
            <ExcalidrawPlugin />
            <TabFocusPlugin />
            <TabIndentationPlugin maxIndent={7} />
            <CollapsiblePlugin />
            <PageBreakPlugin />
            <LayoutPlugin />
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
        {isAutocomplete && <AutocompletePlugin />}
        <div>{showTableOfContents && <TableOfContentsPlugin />}</div>
        {shouldUseLexicalContextMenu && <ContextMenuPlugin />}
        {shouldAllowHighlightingWithBrackets && <SpecialTextPlugin />}
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
