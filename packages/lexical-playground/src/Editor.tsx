/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import {$insertDataTransferForRichText} from '@lexical/clipboard';
import {AutoFocusPlugin} from '@lexical/react/LexicalAutoFocusPlugin';
import {CharacterLimitPlugin} from '@lexical/react/LexicalCharacterLimitPlugin';
import {CheckListPlugin} from '@lexical/react/LexicalCheckListPlugin';
import {ClearEditorPlugin} from '@lexical/react/LexicalClearEditorPlugin';
import {ClickableLinkPlugin} from '@lexical/react/LexicalClickableLinkPlugin';
import {CollaborationPlugin} from '@lexical/react/LexicalCollaborationPlugin';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {HashtagPlugin} from '@lexical/react/LexicalHashtagPlugin';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {HorizontalRulePlugin} from '@lexical/react/LexicalHorizontalRulePlugin';
import {ListPlugin} from '@lexical/react/LexicalListPlugin';
import {PlainTextPlugin} from '@lexical/react/LexicalPlainTextPlugin';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {SelectionAlwaysOnDisplay} from '@lexical/react/LexicalSelectionAlwaysOnDisplay';
import {TabIndentationPlugin} from '@lexical/react/LexicalTabIndentationPlugin';
import {TablePlugin} from '@lexical/react/LexicalTablePlugin';
import {useLexicalEditable} from '@lexical/react/useLexicalEditable';
import {CAN_USE_DOM} from '@lexical/utils';
import {$getSelection, COMMAND_PRIORITY_NORMAL, PASTE_COMMAND} from 'lexical';
import {useEffect, useState} from 'react';

import {createWebsocketProvider} from './collaboration';
import {useSettings} from './context/SettingsContext';
import {useSharedHistoryContext} from './context/SharedHistoryContext';
import ActionsPlugin from './plugins/ActionsPlugin';
import AutocompletePlugin from './plugins/AutocompletePlugin';
import AutoEmbedPlugin from './plugins/AutoEmbedPlugin';
import AutoLinkPlugin from './plugins/AutoLinkPlugin';
import CodeActionMenuPlugin from './plugins/CodeActionMenuPlugin';
import CodeHighlightPlugin from './plugins/CodeHighlightPlugin';
import CollapsiblePlugin from './plugins/CollapsiblePlugin';
import CommentPlugin from './plugins/CommentPlugin';
import ComponentPickerPlugin from './plugins/ComponentPickerPlugin';
import ContextMenuPlugin from './plugins/ContextMenuPlugin';
import DragDropPaste from './plugins/DragDropPastePlugin';
import DraggableBlockPlugin from './plugins/DraggableBlockPlugin';
import EmojiPickerPlugin from './plugins/EmojiPickerPlugin';
import EmojisPlugin from './plugins/EmojisPlugin';
import EquationsPlugin from './plugins/EquationsPlugin';
import ExcalidrawPlugin from './plugins/ExcalidrawPlugin';
import FigmaPlugin from './plugins/FigmaPlugin';
import FloatingLinkEditorPlugin from './plugins/FloatingLinkEditorPlugin';
import FloatingTextFormatToolbarPlugin from './plugins/FloatingTextFormatToolbarPlugin';
import ImagesPlugin from './plugins/ImagesPlugin';
import InlineImagePlugin from './plugins/InlineImagePlugin';
import KeywordsPlugin from './plugins/KeywordsPlugin';
import {LayoutPlugin} from './plugins/LayoutPlugin/LayoutPlugin';
import LinkPlugin from './plugins/LinkPlugin';
import MarkdownShortcutPlugin from './plugins/MarkdownShortcutPlugin';
import {MaxLengthPlugin} from './plugins/MaxLengthPlugin';
import MentionsPlugin from './plugins/MentionsPlugin';
import PageBreakPlugin from './plugins/PageBreakPlugin';
import PollPlugin from './plugins/PollPlugin';
import ShortcutsPlugin from './plugins/ShortcutsPlugin';
import SpecialTextPlugin from './plugins/SpecialTextPlugin';
import SpeechToTextPlugin from './plugins/SpeechToTextPlugin';
import TabFocusPlugin from './plugins/TabFocusPlugin';
import TableCellActionMenuPlugin from './plugins/TableActionMenuPlugin';
import TableCellResizer from './plugins/TableCellResizer';
import TableHoverActionsPlugin from './plugins/TableHoverActionsPlugin';
import TableOfContentsPlugin from './plugins/TableOfContentsPlugin';
import ToolbarPlugin from './plugins/ToolbarPlugin';
import TreeViewPlugin from './plugins/TreeViewPlugin';
import TwitterPlugin from './plugins/TwitterPlugin';
import YouTubePlugin from './plugins/YouTubePlugin';
import ContentEditable from './ui/ContentEditable';

const skipCollaborationInit =
  // @ts-expect-error
  window.parent != null && window.parent.frames.right === window;

function fixMsListMarkup(html: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const lists: Record<string, Array<{wrapper: Element; level: number}>> = {};

  doc.querySelectorAll('.ListContainerWrapper').forEach((wrapper) => {
    const li = wrapper.querySelector('li[data-listid]');
    const listId = (li as HTMLElement)?.dataset.listid;

    if (listId) {
      lists[listId] ??= [];
      lists[listId].push({
        level: parseInt(li.dataset.ariaLevel, 10),
        wrapper,
      });
    }
  });

  if (Object.keys(lists).length < 1) {
    return html;
  }

  Object.values(lists).forEach((list) => {
    const {wrapper: parentWrapper} = list.shift();

    let parent = parentWrapper.querySelector('ol, ul');
    parentWrapper.replaceWith(parent);

    let currentLevel = 1;
    let documentCurrentLevel = 1;
    list.forEach(({wrapper, level}) => {
      const listElement = wrapper.querySelector('ol, ul');
      if (!listElement) {
        return;
      }

      if (level > documentCurrentLevel) {
        let target = null;
        while (level > documentCurrentLevel) {
          documentCurrentLevel += 1;
          if (parent.lastElementChild) {
            currentLevel += 1;
            target = parent.lastElementChild;
          }
        }

        target.append(listElement);
        parent = listElement;
      } else {
        if (level < currentLevel) {
          while (level < documentCurrentLevel) {
            documentCurrentLevel -= 1;
            const candidate = parent.parentNode.closest('ol, ul');
            if (candidate) {
              currentLevel -= 1;
              parent = candidate;
            }
          }
        }
        parent.append(...listElement.querySelectorAll('li'));
        listElement.remove();
      }

      wrapper.remove();
    });
  });

  return doc.body.innerHTML;
}

function fixMsParaStylesMarkup(htmlString: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  const PARA_STYLE_TO_TAG = {
    Subtitle: 'h2',
    Title: 'h1',
    'heading 1': 'h1',
    'heading 2': 'h2',
    'heading 3': 'h3',
    'heading 4': 'h4',
    'heading 5': 'h5',
    'heading 6': 'h6',
  };
  const PARA_STYLE_DATA_IDENTIFIER = 'data-ccp-parastyle';
  const DATA_IDENTIFIERS_TO_SKIP = ['data-ccp-props'];

  const elementsWithParaStyle = doc.querySelectorAll(
    `[${PARA_STYLE_DATA_IDENTIFIER}]`,
  );

  elementsWithParaStyle.forEach((element) => {
    const paraStyle = element.getAttribute(PARA_STYLE_DATA_IDENTIFIER);

    if (
      paraStyle &&
      !DATA_IDENTIFIERS_TO_SKIP.some((identifier) =>
        element.getAttribute(identifier),
      )
    ) {
      // Normalize the style name (trim whitespace and convert to lowercase)
      const normalizedStyle = paraStyle.trim().toLowerCase();

      // Check if we have a mapping for this style
      const targetTag = PARA_STYLE_TO_TAG[normalizedStyle];

      if (targetTag && element.tagName.toLowerCase() !== targetTag) {
        // Create the new element with the target tag
        const newElement = doc.createElement(targetTag);

        // Copy all attributes except the paragraph style identifier
        Array.from(element.attributes).forEach((attr) => {
          if (attr.name !== PARA_STYLE_DATA_IDENTIFIER) {
            newElement.setAttribute(attr.name, attr.value);
          }
        });

        // Copy all child nodes
        while (element.firstChild) {
          newElement.appendChild(element.firstChild);
        }

        // Replace the original element with the new one
        element.parentNode?.replaceChild(newElement, element);
      }
    }
  });

  return doc.body.innerHTML;
}

function fixMSOfficeStyles(htmlString: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  function calculateInheritedStyles(
    element: HTMLElement,
    parentStyles: Record<string, string> = {},
  ) {
    const computedStyles = window.getComputedStyle(element);
    const inheritedStyles: Record<string, string> = {...parentStyles};

    const formatProps = [
      'fontWeight',
      'fontStyle',
      'fontSize',
      'color',
      'textDecoration',
      'textTransform',
      'background',
      'margin',
      'padding',
    ];

    formatProps.forEach((prop: string) => {
      const computedValue = computedStyles.getPropertyValue(prop);
      const inlineValue =
        element.style.getPropertyValue(prop) || element.style[prop];
      const value = inlineValue || computedValue;

      if (
        value &&
        ![
          'normal',
          'initial',
          'inherit',
          'unset',
          'auto',
          'none',
          'transparent',
        ].includes(value.trim())
      ) {
        inheritedStyles[prop] = value;
      }
    });

    Object.keys(inheritedStyles).forEach((prop) => {
      element.style[prop] = inheritedStyles[prop];
    });

    Array.from(element.children).forEach((child) => {
      calculateInheritedStyles(child as HTMLElement, inheritedStyles);
    });
  }

  const allSpans = doc.querySelectorAll('span:not(span span)');
  allSpans.forEach((span) => {
    calculateInheritedStyles(span as HTMLElement);
  });

  return doc.body.innerHTML;
}

function processHtmlPipeline(
  html: string,
  steps: Array<(input: string) => string>,
): string {
  return steps.reduce((currentHtml, step) => step(currentHtml), html);
}

export default function Editor(): JSX.Element {
  const {historyState} = useSharedHistoryContext();
  const {
    settings: {
      isCollab,
      isAutocomplete,
      isMaxLength,
      isCharLimit,
      hasLinkAttributes,
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

  useEffect(() => {
    return editor.registerCommand(
      PASTE_COMMAND,
      (event: ClipboardEvent) => {
        const clipboard = event.clipboardData;
        if (!clipboard) {
          return false;
        }

        const pastedHtml = clipboard.getData('text/html');

        const fixSteps = [
          fixMSOfficeStyles,
          fixMsListMarkup,
          fixMsParaStylesMarkup,
        ];

        const processedHtml = processHtmlPipeline(pastedHtml, fixSteps);

        const modifiedDataTransfer = new DataTransfer();
        modifiedDataTransfer.setData('text/html', processedHtml);

        const modifiedClipboardEvent = new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: modifiedDataTransfer,
        });

        $insertDataTransferForRichText(
          modifiedClipboardEvent.clipboardData,
          $getSelection(),
          editor,
        );

        return true;
      },
      COMMAND_PRIORITY_NORMAL,
    );
  }, [editor]);

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
        {isMaxLength && <MaxLengthPlugin maxLength={30} />}
        <DragDropPaste />
        <AutoFocusPlugin />
        {selectionAlwaysOnDisplay && <SelectionAlwaysOnDisplay />}
        <ClearEditorPlugin />
        <ComponentPickerPlugin />
        <EmojiPickerPlugin />
        <AutoEmbedPlugin />
        <MentionsPlugin />
        <EmojisPlugin />
        <HashtagPlugin />
        <KeywordsPlugin />
        <SpeechToTextPlugin />
        <AutoLinkPlugin />
        <CommentPlugin
          providerFactory={isCollab ? createWebsocketProvider : undefined}
        />
        {isRichText ? (
          <>
            {isCollab ? (
              <CollaborationPlugin
                id="main"
                providerFactory={createWebsocketProvider}
                shouldBootstrap={!skipCollaborationInit}
              />
            ) : (
              <HistoryPlugin externalHistoryState={historyState} />
            )}
            <RichTextPlugin
              contentEditable={
                <div className="editor-scroller">
                  <div className="editor" ref={onRef}>
                    <ContentEditable placeholder={placeholder} />
                  </div>
                </div>
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
            <MarkdownShortcutPlugin />
            <CodeHighlightPlugin />
            <ListPlugin hasStrictIndent={listStrictIndent} />
            <CheckListPlugin />
            <TablePlugin
              hasCellMerge={tableCellMerge}
              hasCellBackgroundColor={tableCellBackgroundColor}
              hasHorizontalScroll={tableHorizontalScroll}
            />
            <TableCellResizer />
            <ImagesPlugin />
            <InlineImagePlugin />
            <LinkPlugin hasLinkAttributes={hasLinkAttributes} />
            <PollPlugin />
            <TwitterPlugin />
            <YouTubePlugin />
            <FigmaPlugin />
            <ClickableLinkPlugin disabled={isEditable} />
            <HorizontalRulePlugin />
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
                <TableHoverActionsPlugin anchorElem={floatingAnchorElem} />
                <FloatingTextFormatToolbarPlugin
                  anchorElem={floatingAnchorElem}
                  setIsLinkEditMode={setIsLinkEditMode}
                />
              </>
            )}
          </>
        ) : (
          <>
            <PlainTextPlugin
              contentEditable={<ContentEditable placeholder={placeholder} />}
              ErrorBoundary={LexicalErrorBoundary}
            />
            <HistoryPlugin externalHistoryState={historyState} />
          </>
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
          isRichText={isRichText}
          shouldPreserveNewLinesInMarkdown={shouldPreserveNewLinesInMarkdown}
        />
      </div>
      {showTreeView && <TreeViewPlugin />}
    </>
  );
}
