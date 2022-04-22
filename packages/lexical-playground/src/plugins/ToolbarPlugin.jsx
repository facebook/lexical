/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {InsertImagePayload} from './ImagesPlugin';
import type {LexicalEditor, RangeSelection} from 'lexical';

import './ToolbarPlugin.css';

import {
  $createCodeNode,
  $isCodeNode,
  getCodeLanguages,
  getDefaultCodeLanguage,
} from '@lexical/code';
import {$isLinkNode, TOGGLE_LINK_COMMAND} from '@lexical/link';
import {
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListNode,
  REMOVE_LIST_COMMAND,
} from '@lexical/list';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {INSERT_HORIZONTAL_RULE_COMMAND} from '@lexical/react/LexicalHorizontalRuleNode';
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
} from '@lexical/rich-text';
import {
  $getSelectionStyleValueForProperty,
  $isAtNodeEnd,
  $isParentElementRTL,
  $patchStyleText,
  $wrapLeafNodesInElements,
} from '@lexical/selection';
import {INSERT_TABLE_COMMAND} from '@lexical/table';
import {$getNearestNodeOfType, mergeRegister} from '@lexical/utils';
import {
  $createParagraphNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_LOW,
  ElementNode,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  TextNode,
  UNDO_COMMAND,
} from 'lexical';
import * as React from 'react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
// $FlowFixMe
import {createPortal} from 'react-dom';
import {IS_APPLE} from 'shared/environment';

import useModal from '../hooks/useModal';
import catTypingGif from '../images/cat-typing.gif';
import yellowFlowerImage from '../images/yellow-flower.jpg';
import {$createStickyNode} from '../nodes/StickyNode';
import Button from '../ui/Button';
import DropDown from '../ui/DropDown';
import FileInput from '../ui/FileInput.jsx';
import KatexEquationAlterer from '../ui/KatexEquationAlterer';
import LinkPreview from '../ui/LinkPreview';
import TextInput from '../ui/TextInput';
import {INSERT_EQUATION_COMMAND} from './EquationsPlugin';
import {INSERT_EXCALIDRAW_COMMAND} from './ExcalidrawPlugin';
import {INSERT_IMAGE_COMMAND} from './ImagesPlugin';
import {INSERT_POLL_COMMAND} from './PollPlugin';
import {INSERT_TWEET_COMMAND} from './TwitterPlugin';
import {INSERT_YOUTUBE_COMMAND} from './YouTubePlugin';

const supportedBlockTypes = new Set([
  'paragraph',
  'quote',
  'code',
  'h1',
  'h2',
  'h3',
  'ul',
  'ol',
]);

const blockTypeToBlockName = {
  code: 'Code Block',
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
  h4: 'Heading 4',
  h5: 'Heading 5',
  ol: 'Numbered List',
  paragraph: 'Normal',
  quote: 'Quote',
  ul: 'Bulleted List',
};

function getSelectedNode(selection: RangeSelection): TextNode | ElementNode {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = selection.anchor.getNode();
  const focusNode = selection.focus.getNode();
  if (anchorNode === focusNode) {
    return anchorNode;
  }
  const isBackward = selection.isBackward();
  if (isBackward) {
    return $isAtNodeEnd(focus) ? anchorNode : focusNode;
  } else {
    return $isAtNodeEnd(anchor) ? focusNode : anchorNode;
  }
}

function positionEditorElement(editor, rect) {
  if (rect === null) {
    editor.style.opacity = '0';
    editor.style.top = '-1000px';
    editor.style.left = '-1000px';
  } else {
    editor.style.opacity = '1';
    editor.style.top = `${rect.top + rect.height + window.pageYOffset + 10}px`;
    editor.style.left = `${
      rect.left + window.pageXOffset - editor.offsetWidth / 2 + rect.width / 2
    }px`;
  }
}

function FloatingLinkEditor({editor}: {editor: LexicalEditor}): React$Node {
  const editorRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef(null);
  const mouseDownRef = useRef(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [isEditMode, setEditMode] = useState(false);
  const [lastSelection, setLastSelection] = useState(null);

  const updateLinkEditor = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const node = getSelectedNode(selection);
      const parent = node.getParent();
      if ($isLinkNode(parent)) {
        setLinkUrl(parent.getURL());
      } else if ($isLinkNode(node)) {
        setLinkUrl(node.getURL());
      } else {
        setLinkUrl('');
      }
    }
    const editorElem = editorRef.current;
    const nativeSelection = window.getSelection();
    const activeElement = document.activeElement;

    if (editorElem === null) {
      return;
    }

    const rootElement = editor.getRootElement();
    if (
      selection !== null &&
      !nativeSelection.isCollapsed &&
      rootElement !== null &&
      rootElement.contains(nativeSelection.anchorNode)
    ) {
      const domRange = nativeSelection.getRangeAt(0);
      let rect;
      if (nativeSelection.anchorNode === rootElement) {
        let inner = rootElement;
        while (inner.firstElementChild != null) {
          inner = inner.firstElementChild;
        }
        rect = inner.getBoundingClientRect();
      } else {
        rect = domRange.getBoundingClientRect();
      }

      if (!mouseDownRef.current) {
        positionEditorElement(editorElem, rect);
      }
      setLastSelection(selection);
    } else if (!activeElement || activeElement.className !== 'link-input') {
      positionEditorElement(editorElem, null);
      setLastSelection(null);
      setEditMode(false);
      setLinkUrl('');
    }

    return true;
  }, [editor]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({editorState}) => {
        editorState.read(() => {
          updateLinkEditor();
        });
      }),

      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateLinkEditor();
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, updateLinkEditor]);

  useEffect(() => {
    editor.getEditorState().read(() => {
      updateLinkEditor();
    });
  }, [editor, updateLinkEditor]);

  useEffect(() => {
    if (isEditMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditMode]);

  return (
    <div ref={editorRef} className="link-editor">
      {isEditMode ? (
        <input
          ref={inputRef}
          className="link-input"
          value={linkUrl}
          onChange={(event) => {
            setLinkUrl(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              if (lastSelection !== null) {
                if (linkUrl !== '') {
                  editor.dispatchCommand(TOGGLE_LINK_COMMAND, linkUrl);
                }
                setEditMode(false);
              }
            } else if (event.key === 'Escape') {
              event.preventDefault();
              setEditMode(false);
            }
          }}
        />
      ) : (
        <>
          <div className="link-input">
            <a href={linkUrl} target="_blank" rel="noopener noreferrer">
              {linkUrl}
            </a>
            <div
              className="link-edit"
              role="button"
              tabIndex={0}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setEditMode(true);
              }}
            />
          </div>
          <LinkPreview url={linkUrl} />
        </>
      )}
    </div>
  );
}

function InsertImageUriDialogBody({
  onClick,
}: {
  onClick: (payload: InsertImagePayload) => void,
}) {
  const [src, setSrc] = useState('');
  const [altText, setAltText] = useState('');

  const isDisabled = src === '';

  return (
    <>
      <TextInput
        label="Image URL"
        placeholder="i.e. https://source.unsplash.com/random"
        onChange={setSrc}
        value={src}
        data-test-id="image-modal-url-input"
      />
      <TextInput
        label="Alt Text"
        placeholder="Random unsplash image"
        onChange={setAltText}
        value={altText}
        data-test-id="image-modal-alt-text-input"
      />
      <div className="ToolbarPlugin__dialogActions">
        <Button
          data-test-id="image-modal-confirm-btn"
          disabled={isDisabled}
          onClick={() => onClick({altText, src})}>
          Confirm
        </Button>
      </div>
    </>
  );
}

function InsertImageUploadedDialogBody({
  onClick,
}: {
  onClick: (payload: InsertImagePayload) => void,
}) {
  const [src, setSrc] = useState('');
  const [altText, setAltText] = useState('');

  const isDisabled = src === '';

  const loadImage = (files: File[]) => {
    const reader = new FileReader();
    reader.onload = function () {
      if (typeof reader.result === 'string') {
        setSrc(reader.result);
      }
      return '';
    };
    reader.readAsDataURL(files[0]);
  };

  return (
    <>
      <FileInput
        label="Image Upload"
        onChange={loadImage}
        accept="image/*"
        data-test-id="image-modal-file-upload"
      />
      <TextInput
        label="Alt Text"
        placeholder="Descriptive alternative text"
        onChange={setAltText}
        value={altText}
        data-test-id="image-modal-alt-text-input"
      />
      <div className="ToolbarPlugin__dialogActions">
        <Button
          data-test-id="image-modal-file-upload-btn"
          disabled={isDisabled}
          onClick={() => onClick({altText, src})}>
          Confirm
        </Button>
      </div>
    </>
  );
}

function InsertImageDialog({
  activeEditor,
  onClose,
}: {
  activeEditor: LexicalEditor,
  onClose: () => void,
}): React$Node {
  const [mode, setMode] = useState<null | 'url' | 'file'>(null);

  const onClick = (payload: InsertImagePayload) => {
    activeEditor.dispatchCommand(INSERT_IMAGE_COMMAND, payload);
    onClose();
  };

  return (
    <>
      {!mode && (
        <div className="ToolbarPlugin__dialogButtonsList">
          <Button
            data-test-id="image-modal-option-sample"
            onClick={() =>
              onClick({
                altText: 'Yellow flower in tilt shift lens',
                src: yellowFlowerImage,
              })
            }>
            Sample
          </Button>
          <Button
            data-test-id="image-modal-option-url"
            onClick={() => setMode('url')}>
            URL
          </Button>
          <Button
            data-test-id="image-modal-option-file"
            onClick={() => setMode('file')}>
            File
          </Button>
        </div>
      )}
      {mode === 'url' && <InsertImageUriDialogBody onClick={onClick} />}
      {mode === 'file' && <InsertImageUploadedDialogBody onClick={onClick} />}
    </>
  );
}

function InsertTableDialog({
  activeEditor,
  onClose,
}: {
  activeEditor: LexicalEditor,
  onClose: () => void,
}): React$Node {
  const [rows, setRows] = useState('5');
  const [columns, setColumns] = useState('5');

  const onClick = () => {
    activeEditor.dispatchCommand(INSERT_TABLE_COMMAND, {columns, rows});
    onClose();
  };

  return (
    <>
      <TextInput label="No of rows" onChange={setRows} value={rows} />
      <TextInput label="No of columns" onChange={setColumns} value={columns} />
      <div
        className="ToolbarPlugin__dialogActions"
        data-test-id="table-model-confirm-insert">
        <Button onClick={onClick}>Confirm</Button>
      </div>
    </>
  );
}

function InsertPollDialog({
  activeEditor,
  onClose,
}: {
  activeEditor: LexicalEditor,
  onClose: () => void,
}): React$Node {
  const [question, setQuestion] = useState('');

  const onClick = () => {
    activeEditor.dispatchCommand(INSERT_POLL_COMMAND, question);
    onClose();
  };

  return (
    <>
      <TextInput
        label="Poll Question"
        onChange={setQuestion}
        value={question}
      />
      <div className="ToolbarPlugin__dialogActions">
        <Button disabled={question.trim() === ''} onClick={onClick}>
          Confirm
        </Button>
      </div>
    </>
  );
}

const VALID_TWITTER_URL = /twitter.com\/[0-9a-zA-Z]{1,20}\/status\/([0-9]*)/g;

function InsertTweetDialog({
  activeEditor,
  onClose,
}: {
  activeEditor: LexicalEditor,
  onClose: () => void,
}): React$Node {
  const [text, setText] = useState('');

  const onClick = () => {
    const tweetID = text.split('status/')?.[1]?.split('?')?.[0];
    activeEditor.dispatchCommand(INSERT_TWEET_COMMAND, tweetID);
    onClose();
  };

  const isDisabled = text === '' || !text.match(VALID_TWITTER_URL);

  return (
    <>
      <TextInput
        label="Tweet URL"
        placeholder="i.e. https://twitter.com/jack/status/20"
        onChange={setText}
        value={text}
      />
      <div className="ToolbarPlugin__dialogActions">
        <Button disabled={isDisabled} onClick={onClick}>
          Confirm
        </Button>
      </div>
    </>
  );
}

// Taken from https://stackoverflow.com/a/9102270
const YOUTUBE_ID_PARSER =
  /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;

const parseYouTubeVideoID = (url: string) => {
  const urlMatches = url.match(YOUTUBE_ID_PARSER);

  return urlMatches?.[2].length === 11 ? urlMatches[2] : null;
};

function InsertYouTubeDialog({
  activeEditor,
  onClose,
}: {
  activeEditor: LexicalEditor,
  onClose: () => void,
}): React$Node {
  const [text, setText] = useState('');

  const onClick = () => {
    const videoID = parseYouTubeVideoID(text);
    if (videoID) {
      activeEditor.dispatchCommand(INSERT_YOUTUBE_COMMAND, videoID);
    }
    onClose();
  };

  const isDisabled = text === '' || !parseYouTubeVideoID(text);

  return (
    <>
      <TextInput
        data-test-id="youtube-embed-modal-url"
        label="YouTube URL"
        placeholder="i.e. https://www.youtube.com/watch?v=jNQXAC9IVRw"
        onChange={setText}
        value={text}
      />
      <div className="ToolbarPlugin__dialogActions">
        <Button
          data-test-id="youtube-embed-modal-submit-btn"
          disabled={isDisabled}
          onClick={onClick}>
          Confirm
        </Button>
      </div>
    </>
  );
}

function InsertEquationDialog({
  activeEditor,
  onClose,
}: {
  activeEditor: LexicalEditor,
  onClose: () => void,
}): React$Node {
  const onEquationConfirm = useCallback(
    (equation: string, inline: boolean) => {
      activeEditor.dispatchCommand(INSERT_EQUATION_COMMAND, {equation, inline});
      onClose();
    },
    [activeEditor, onClose],
  );

  return <KatexEquationAlterer onConfirm={onEquationConfirm} />;
}

function BlockFormatDropDown({
  editor,
  blockType,
}: {
  blockType: string,
  editor: LexicalEditor,
}): React$Node {
  const formatParagraph = () => {
    if (blockType !== 'paragraph') {
      editor.update(() => {
        const selection = $getSelection();

        if ($isRangeSelection(selection)) {
          $wrapLeafNodesInElements(selection, () => $createParagraphNode());
        }
      });
    }
  };

  const formatHeading = (headingSize) => {
    if (blockType !== headingSize) {
      editor.update(() => {
        const selection = $getSelection();

        if ($isRangeSelection(selection)) {
          $wrapLeafNodesInElements(selection, () =>
            $createHeadingNode(headingSize),
          );
        }
      });
    }
  };

  const formatBulletList = () => {
    if (blockType !== 'ul') {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND);
    } else {
      editor.dispatchCommand(REMOVE_LIST_COMMAND);
    }
  };

  const formatNumberedList = () => {
    if (blockType !== 'ol') {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND);
    } else {
      editor.dispatchCommand(REMOVE_LIST_COMMAND);
    }
  };

  const formatQuote = () => {
    if (blockType !== 'quote') {
      editor.update(() => {
        const selection = $getSelection();

        if ($isRangeSelection(selection)) {
          $wrapLeafNodesInElements(selection, () => $createQuoteNode());
        }
      });
    }
  };

  const formatCode = () => {
    if (blockType !== 'code') {
      editor.update(() => {
        const selection = $getSelection();

        if ($isRangeSelection(selection)) {
          if (selection.isCollapsed()) {
            $wrapLeafNodesInElements(selection, () => $createCodeNode());
          } else {
            const textContent = selection.getTextContent();
            const codeNode = $createCodeNode();
            selection.removeText();
            selection.insertNodes([codeNode]);
            selection.insertRawText(textContent);
          }
        }
      });
    }
  };

  return (
    <DropDown
      buttonClassName="toolbar-item block-controls"
      buttonIconClassName={'icon block-type ' + blockType}
      buttonLabel={blockTypeToBlockName[blockType]}
      buttonAriaLabel="Formatting options for text style">
      <button className="item" onClick={formatParagraph}>
        <span className="icon paragraph" />
        <span className="text">Normal</span>
        {blockType === 'paragraph' && <span className="active" />}
      </button>
      <button className="item" onClick={() => formatHeading('h1')}>
        <span className="icon h1" />
        <span className="text">Heading 1</span>
        {blockType === 'h1' && <span className="active" />}
      </button>
      <button className="item" onClick={() => formatHeading('h2')}>
        <span className="icon h2" />
        <span className="text">Heading 2</span>
        {blockType === 'h2' && <span className="active" />}
      </button>
      <button className="item" onClick={() => formatHeading('h3')}>
        <span className="icon h3" />
        <span className="text">Heading 3</span>
        {blockType === 'h3' && <span className="active" />}
      </button>
      <button className="item" onClick={formatBulletList}>
        <span className="icon bullet-list" />
        <span className="text">Bullet List</span>
        {blockType === 'ul' && <span className="active" />}
      </button>
      <button className="item" onClick={formatNumberedList}>
        <span className="icon numbered-list" />
        <span className="text">Numbered List</span>
        {blockType === 'ol' && <span className="active" />}
      </button>
      <button className="item" onClick={formatQuote}>
        <span className="icon quote" />
        <span className="text">Quote</span>
        {blockType === 'quote' && <span className="active" />}
      </button>
      <button className="item" onClick={formatCode}>
        <span className="icon code" />
        <span className="text">Code Block</span>
        {blockType === 'code' && <span className="active" />}
      </button>
    </DropDown>
  );
}

function Divider(): React$Node {
  return <div className="divider" />;
}

function Select({
  onChange,
  className,
  options,
  value,
}: {
  className: string,
  onChange: (event: {target: {value: string}}) => void,
  options: Array<string>,
  value: string,
}): React$Node {
  return (
    <select className={className} onChange={onChange} value={value}>
      <option hidden={true} value="" />
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

export default function ToolbarPlugin(): React$Node {
  const [editor] = useLexicalComposerContext();
  const [activeEditor, setActiveEditor] = useState(editor);
  const [blockType, setBlockType] = useState('paragraph');
  const [selectedElementKey, setSelectedElementKey] = useState(null);
  const [fontSize, setFontSize] = useState<string>('15px');
  const [fontFamily, setFontFamily] = useState<string>('Arial');
  const [isLink, setIsLink] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [modal, showModal] = useModal();
  const [isRTL, setIsRTL] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState<string>('');

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const anchorNode = selection.anchor.getNode();
      const element =
        anchorNode.getKey() === 'root'
          ? anchorNode
          : anchorNode.getTopLevelElementOrThrow();
      const elementKey = element.getKey();
      const elementDOM = activeEditor.getElementByKey(elementKey);

      // Update text format
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
      setIsCode(selection.hasFormat('code'));
      setIsRTL($isParentElementRTL(selection));

      // Update links
      const node = getSelectedNode(selection);
      const parent = node.getParent();
      if ($isLinkNode(parent) || $isLinkNode(node)) {
        setIsLink(true);
      } else {
        setIsLink(false);
      }

      if (elementDOM !== null) {
        setSelectedElementKey(elementKey);
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType(anchorNode, ListNode);
          const type = parentList ? parentList.getTag() : element.getTag();
          setBlockType(type);
        } else {
          const type = $isHeadingNode(element)
            ? element.getTag()
            : element.getType();
          setBlockType(type);
          if ($isCodeNode(element)) {
            setCodeLanguage(element.getLanguage() || getDefaultCodeLanguage());
            return;
          }
        }
      }
      // Hande buttons
      setFontSize(
        $getSelectionStyleValueForProperty(selection, 'font-size', '15px'),
      );
      setFontFamily(
        $getSelectionStyleValueForProperty(selection, 'font-family', 'Arial'),
      );
    }
  }, [activeEditor]);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      (_payload, newEditor) => {
        updateToolbar();
        setActiveEditor(newEditor);
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );
  }, [editor, updateToolbar]);

  useEffect(() => {
    return mergeRegister(
      activeEditor.registerUpdateListener(({editorState}) => {
        editorState.read(() => {
          updateToolbar();
        });
      }),
      activeEditor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      activeEditor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    );
  }, [activeEditor, updateToolbar]);

  const applyStyleText = useCallback(
    (styles: {[string]: string}) => {
      activeEditor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $patchStyleText(selection, styles);
        }
      });
    },
    [activeEditor],
  );

  const onFontSizeSelect = useCallback(
    (e) => {
      applyStyleText({'font-size': e.target.value});
    },
    [applyStyleText],
  );

  const onFontFamilySelect = useCallback(
    (e) => {
      applyStyleText({'font-family': e.target.value});
    },
    [applyStyleText],
  );

  const insertLink = useCallback(() => {
    if (!isLink) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, 'https://');
    } else {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  }, [editor, isLink]);

  const codeLanguges = useMemo(() => getCodeLanguages(), []);
  const onCodeLanguageSelect = useCallback(
    (e) => {
      activeEditor.update(() => {
        if (selectedElementKey !== null) {
          const node = $getNodeByKey(selectedElementKey);
          if ($isCodeNode(node)) {
            node.setLanguage(e.target.value);
          }
        }
      });
    },
    [activeEditor, selectedElementKey],
  );
  const insertGifOnClick = (payload: InsertImagePayload) => {
    activeEditor.dispatchCommand(INSERT_IMAGE_COMMAND, payload);
  };

  return (
    <div className="toolbar">
      <button
        disabled={!canUndo}
        onClick={() => {
          activeEditor.dispatchCommand(UNDO_COMMAND);
        }}
        title={IS_APPLE ? 'Undo (⌘Z)' : 'Undo (Ctrl+Z)'}
        className="toolbar-item spaced"
        aria-label="Undo">
        <i className="format undo" />
      </button>
      <button
        disabled={!canRedo}
        onClick={() => {
          activeEditor.dispatchCommand(REDO_COMMAND);
        }}
        title={IS_APPLE ? 'Redo (⌘Y)' : 'Undo (Ctrl+Y)'}
        className="toolbar-item"
        aria-label="Redo">
        <i className="format redo" />
      </button>
      <Divider />
      {supportedBlockTypes.has(blockType) && activeEditor === editor && (
        <>
          <BlockFormatDropDown blockType={blockType} editor={editor} />
          <Divider />
        </>
      )}
      {blockType === 'code' ? (
        <>
          <Select
            className="toolbar-item code-language"
            onChange={onCodeLanguageSelect}
            options={codeLanguges}
            value={codeLanguage}
          />
          <i className="chevron-down inside" />
        </>
      ) : (
        <>
          <>
            <Select
              className="toolbar-item font-family"
              onChange={onFontFamilySelect}
              options={[
                'Arial',
                'Courier New',
                'Georgia',
                'Times New Roman',
                'Trebuchet MS',
                'Verdana',
              ]}
              value={fontFamily}
            />
            <i className="chevron-down inside" />
          </>
          <>
            <Select
              className="toolbar-item font-size"
              onChange={onFontSizeSelect}
              options={[
                '10px',
                '11px',
                '12px',
                '13px',
                '14px',
                '15px',
                '16px',
                '17px',
                '18px',
                '19px',
                '20px',
              ]}
              value={fontSize}
            />
            <i className="chevron-down inside" />
          </>
          <Divider />
          <button
            onClick={() => {
              activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
            }}
            className={'toolbar-item spaced ' + (isBold ? 'active' : '')}
            title={IS_APPLE ? 'Bold (⌘B)' : 'Bold (Ctrl+B)'}
            aria-label={`Format text as bold. Shortcut: ${
              IS_APPLE ? '⌘B' : 'Ctrl+B'
            }`}>
            <i className="format bold" />
          </button>
          <button
            onClick={() => {
              activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
            }}
            className={'toolbar-item spaced ' + (isItalic ? 'active' : '')}
            title={IS_APPLE ? 'Italic (⌘I)' : 'Italic (Ctrl+I)'}
            aria-label={`Format text as italics. Shortcut: ${
              IS_APPLE ? '⌘I' : 'Ctrl+I'
            }`}>
            <i className="format italic" />
          </button>
          <button
            onClick={() => {
              activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
            }}
            className={'toolbar-item spaced ' + (isUnderline ? 'active' : '')}
            title={IS_APPLE ? 'Underline (⌘U)' : 'Underline (Ctrl+U)'}
            aria-label={`Format text to underlined. Shortcut: ${
              IS_APPLE ? '⌘U' : 'Ctrl+U'
            }`}>
            <i className="format underline" />
          </button>
          <button
            onClick={() => {
              activeEditor.dispatchCommand(
                FORMAT_TEXT_COMMAND,
                'strikethrough',
              );
            }}
            className={
              'toolbar-item spaced ' + (isStrikethrough ? 'active' : '')
            }
            title="Strikethrough"
            aria-label="Format text with a strikethrough">
            <i className="format strikethrough" />
          </button>
          <button
            onClick={() => {
              activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code');
            }}
            className={'toolbar-item spaced ' + (isCode ? 'active' : '')}
            title="Insert code block"
            aria-label="Insert code block">
            <i className="format code" />
          </button>
          <button
            onClick={insertLink}
            className={'toolbar-item spaced ' + (isLink ? 'active' : '')}
            aria-label="Insert link"
            type="Insert link">
            <i className="format link" />
          </button>
          {isLink &&
            createPortal(
              <FloatingLinkEditor editor={activeEditor} />,
              document.body,
            )}
          <Divider />
          <DropDown
            buttonClassName="toolbar-item spaced"
            buttonLabel="Insert"
            buttonAriaLabel="Insert specialized editor node"
            buttonIconClassName="icon plus">
            <button
              onClick={() => {
                activeEditor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND);
              }}
              className="item">
              <i className="icon horizontal-rule" />
              <span className="text">Horizontal Rule</span>
            </button>
            <button
              onClick={() => {
                showModal('Insert Image', (onClose) => (
                  <InsertImageDialog
                    activeEditor={activeEditor}
                    onClose={onClose}
                  />
                ));
              }}
              className="item">
              <i className="icon image" />
              <span className="text">Image</span>
            </button>
            <button
              onClick={() =>
                insertGifOnClick({
                  altText: 'Cat typing on a laptop',
                  src: catTypingGif,
                })
              }
              className="item">
              <i className="icon gif" />
              <span className="text">GIF</span>
            </button>
            <button
              onClick={() => {
                activeEditor.dispatchCommand(INSERT_EXCALIDRAW_COMMAND);
              }}
              className="item">
              <i className="icon diagram-2" />
              <span className="text">Excalidraw</span>
            </button>
            <button
              onClick={() => {
                showModal('Insert Table', (onClose) => (
                  <InsertTableDialog
                    activeEditor={activeEditor}
                    onClose={onClose}
                  />
                ));
              }}
              className="item">
              <i className="icon table" />
              <span className="text">Table</span>
            </button>
            <button
              onClick={() => {
                showModal('Insert Poll', (onClose) => (
                  <InsertPollDialog
                    activeEditor={activeEditor}
                    onClose={onClose}
                  />
                ));
              }}
              className="item">
              <i className="icon poll" />
              <span className="text">Poll</span>
            </button>
            <button
              onClick={() => {
                showModal('Insert Tweet', (onClose) => (
                  <InsertTweetDialog
                    activeEditor={activeEditor}
                    onClose={onClose}
                  />
                ));
              }}
              className="item">
              <i className="icon tweet" />
              <span className="text">Tweet</span>
            </button>
            <button
              onClick={() => {
                showModal('Insert YouTube Video', (onClose) => (
                  <InsertYouTubeDialog
                    activeEditor={activeEditor}
                    onClose={onClose}
                  />
                ));
              }}
              className="item">
              <i className="icon youtube" />
              <span className="text">YouTube Video</span>
            </button>
            <button
              onClick={() => {
                showModal('Insert Equation', (onClose) => (
                  <InsertEquationDialog
                    activeEditor={activeEditor}
                    onClose={onClose}
                  />
                ));
              }}
              className="item">
              <i className="icon equation" />
              <span className="text">Equation</span>
            </button>
            <button
              onClick={() => {
                editor.update(() => {
                  const root = $getRoot();
                  const stickyNode = $createStickyNode(0, 0);
                  root.append(stickyNode);
                });
              }}
              className="item">
              <i className="icon sticky" />
              <span className="text">Sticky Note</span>
            </button>
          </DropDown>
        </>
      )}
      <Divider />
      <DropDown
        buttonLabel="Align"
        buttonIconClassName="icon left-align"
        buttonClassName="toolbar-item spaced"
        buttonAriaLabel="Formatting options for text alignment">
        <button
          onClick={() => {
            activeEditor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left');
          }}
          className="item">
          <i className="icon left-align" />
          <span className="text">Left Align</span>
        </button>
        <button
          onClick={() => {
            activeEditor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
          }}
          className="item">
          <i className="icon center-align" />
          <span className="text">Center Align</span>
        </button>
        <button
          onClick={() => {
            activeEditor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right');
          }}
          className="item">
          <i className="icon right-align" />
          <span className="text">Right Align</span>
        </button>
        <button
          onClick={() => {
            activeEditor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify');
          }}
          className="item">
          <i className="icon justify-align" />
          <span className="text">Justify Align</span>
        </button>
        <Divider />
        <button
          onClick={() => {
            activeEditor.dispatchCommand(OUTDENT_CONTENT_COMMAND);
          }}
          className="item">
          <i className={'icon ' + (isRTL ? 'indent' : 'outdent')} />
          <span className="text">Outdent</span>
        </button>
        <button
          onClick={() => {
            activeEditor.dispatchCommand(INDENT_CONTENT_COMMAND);
          }}
          className="item">
          <i className={'icon ' + (isRTL ? 'outdent' : 'indent')} />
          <span className="text">Indent</span>
        </button>
      </DropDown>

      {modal}
    </div>
  );
}
