/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  LexicalEditor,
  CommandListenerLowPriority,
  ElementNode,
  TextNode,
  Selection,
} from 'lexical';

import * as React from 'react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {useLexicalComposerContext} from 'lexical-react/LexicalComposerContext';
import {$isHeadingNode} from 'lexical/HeadingNode';
import {$createParagraphNode} from 'lexical/ParagraphNode';
import {$createHeadingNode} from 'lexical/HeadingNode';
import {$isListNode, ListNode} from 'lexical/ListNode';
import {$createQuoteNode} from 'lexical/QuoteNode';
import {$createCodeNode, $isCodeNode} from 'lexical/CodeNode';
import {$log, $getNodeByKey, $getSelection, $setSelection} from 'lexical';
import {$createLinkNode, $isLinkNode} from 'lexical/LinkNode';
import {
  $wrapLeafNodesInElements,
  $patchStyleText,
  $getSelectionStyleValueForProperty,
  $isAtNodeEnd,
} from 'lexical/selection';
import withSubscriptions from 'lexical-react/withSubscriptions';
import {getCodeLanguages, getDefaultCodeLanguage} from './CodeHighlightPlugin';

import {$getNearestNodeOfType} from 'lexical/nodes';
// $FlowFixMe
import {createPortal} from 'react-dom';

const LowPriority: CommandListenerLowPriority = 1;

const supportedBlockTypes = new Set([
  'paragraph',
  'quote',
  'code',
  'h1',
  'h2',
  'ul',
  'ol',
]);

const blockTypeToBlockName = {
  paragraph: 'Normal',
  quote: 'Quote',
  code: 'Code Block',
  h1: 'Large Heading',
  h2: 'Small Heading',
  h3: 'Heading',
  h4: 'Heading',
  h5: 'Heading',
  ul: 'Bulleted List',
  ol: 'Numbered List',
};

function getSelectedNode(selection: Selection): TextNode | ElementNode {
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
    editor.style.top = `${
      rect.top + window.pageYOffset - editor.offsetHeight
    }px`;
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
    if (selection !== null) {
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
      const rect = domRange.getBoundingClientRect();
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
  }, [editor]);

  useEffect(() => {
    return withSubscriptions(
      editor.addListener('update', ({editorState}) => {
        editorState.read(() => {
          updateLinkEditor();
        });
      }),

      editor.addListener(
        'command',
        (type) => {
          if (type === 'selectionChange') {
            updateLinkEditor();
          }
          return false;
        },
        LowPriority,
      ),
    );
  }, [editor, updateLinkEditor]);

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
                  toggleLinksOnSelection(editor, linkUrl);
                }
                setEditMode(false);
              }
            }
          }}
        />
      ) : (
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
      )}
    </div>
  );
}

function BlockOptionsDropdownList({
  editor,
  blockType,
  toolbarRef,
  setShowBlockOptionsDropDown,
}: {
  editor: LexicalEditor,
  blockType: string,
  toolbarRef: {current: null | HTMLElement},
  setShowBlockOptionsDropDown: (boolean) => void,
}): React$Node {
  const dropDownRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const toolbar = toolbarRef.current;
    const dropDown = dropDownRef.current;

    if (toolbar !== null && dropDown !== null) {
      const {top, left} = toolbar.getBoundingClientRect();
      dropDown.style.top = `${top + 40}px`;
      dropDown.style.left = `${left}px`;
    }
  }, [dropDownRef, toolbarRef]);

  useEffect(() => {
    const dropDown = dropDownRef.current;
    const toolbar = toolbarRef.current;

    if (dropDown !== null && toolbar !== null) {
      const handle = (event: MouseEvent) => {
        // $FlowFixMe: no idea why flow is complaining
        const target: HTMLElement = event.target;

        if (!dropDown.contains(target) && !toolbar.contains(target)) {
          setShowBlockOptionsDropDown(false);
        }
      };
      document.addEventListener('click', handle);

      return () => {
        document.removeEventListener('click', handle);
      };
    }
  }, [dropDownRef, setShowBlockOptionsDropDown, toolbarRef]);

  const formatParagraph = () => {
    if (blockType !== 'paragraph') {
      editor.update(() => {
        $log('formatParagraph');
        const selection = $getSelection();

        if (selection !== null) {
          $wrapLeafNodesInElements(selection, () => $createParagraphNode());
        }
      });
    }
    setShowBlockOptionsDropDown(false);
  };

  const formatLargeHeading = () => {
    if (blockType !== 'h1') {
      editor.update(() => {
        $log('formatLargeHeading');
        const selection = $getSelection();

        if (selection !== null) {
          $wrapLeafNodesInElements(selection, () => $createHeadingNode('h1'));
        }
      });
    }
    setShowBlockOptionsDropDown(false);
  };

  const formatSmallHeading = () => {
    if (blockType !== 'h2') {
      editor.update(() => {
        $log('formatSmallHeading');
        const selection = $getSelection();

        if (selection !== null) {
          $wrapLeafNodesInElements(selection, () => $createHeadingNode('h2'));
        }
      });
    }
    setShowBlockOptionsDropDown(false);
  };

  const formatBulletList = () => {
    if (blockType !== 'ul') {
      editor.execCommand('insertUnorderedList');
    } else {
      editor.execCommand('removeList');
    }
    setShowBlockOptionsDropDown(false);
  };

  const formatNumberedList = () => {
    if (blockType !== 'ol') {
      editor.execCommand('insertOrderedList');
    } else {
      editor.execCommand('removeList');
    }
    setShowBlockOptionsDropDown(false);
  };

  const formatQuote = () => {
    if (blockType !== 'quote') {
      editor.update(() => {
        $log('formatQuote');
        const selection = $getSelection();

        if (selection !== null) {
          $wrapLeafNodesInElements(selection, () => $createQuoteNode());
        }
      });
    }
    setShowBlockOptionsDropDown(false);
  };

  const formatCode = () => {
    if (blockType !== 'code') {
      editor.update(() => {
        $log('formatCode');
        const selection = $getSelection();

        if (selection !== null) {
          $wrapLeafNodesInElements(selection, () => $createCodeNode());
        }
      });
    }
    setShowBlockOptionsDropDown(false);
  };

  return (
    <div className="dropdown" ref={dropDownRef}>
      <button className="item" onClick={formatParagraph}>
        <span className="icon paragraph" />
        <span className="text">Normal</span>
        {blockType === 'paragraph' && <span className="active" />}
      </button>
      <button className="item" onClick={formatLargeHeading}>
        <span className="icon large-heading" />
        <span className="text">Large Heading</span>
        {blockType === 'h1' && <span className="active" />}
      </button>
      <button className="item" onClick={formatSmallHeading}>
        <span className="icon small-heading" />
        <span className="text">Small Heading</span>
        {blockType === 'h2' && <span className="active" />}
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
    </div>
  );
}

function Divider(): React$Node {
  return <div className="divider"></div>;
}

function Select({
  onChange,
  className,
  options,
  value,
}: {
  onChange: (event: {target: {value: string}}) => void,
  className: string,
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

function toggleLinksOnSelection(editor: LexicalEditor, url: null | string) {
  editor.update(() => {
    const selection = $getSelection();
    $log('toggleLinksOnSelection');
    if (selection !== null) {
      $setSelection(selection);
    }
    const sel = $getSelection();
    if (sel !== null) {
      const nodes = sel.extract();
      if (url === null) {
        // Remove LinkNodes
        nodes.forEach((node) => {
          const parent = node.getParent();

          if ($isLinkNode(parent)) {
            const children = parent.getChildren();
            for (let i = 0; i < children.length; i++) {
              parent.insertBefore(children[i]);
            }
            parent.remove();
          }
        });
      } else {
        // Add or merge LinkNodes
        let prevParent = null;
        let linkNode = null;
        if (nodes.length === 1) {
          const firstNode = nodes[0];
          // if the first node is a LinkNode or if its
          // parent is a LinkNode, we update the URL.
          if ($isLinkNode(firstNode)) {
            firstNode.setURL(url);
            return;
          } else {
            const parent = firstNode.getParent();
            if ($isLinkNode(parent)) {
              // set parent to be the current linkNode
              // so that other nodes in the same parent
              // aren't handled separately below.
              linkNode = parent;
              parent.setURL(url);
              return;
            }
          }
        }
        nodes.forEach((node) => {
          const parent = node.getParent();
          if (parent === linkNode || parent === null) {
            return;
          }
          if (!parent.is(prevParent)) {
            prevParent = parent;
            linkNode = $createLinkNode(url);
            if ($isLinkNode(parent)) {
              if (node.getPreviousSibling() === null) {
                parent.insertBefore(linkNode);
              } else {
                parent.insertAfter(linkNode);
              }
            } else {
              node.insertBefore(linkNode);
            }
          }
          if ($isLinkNode(node)) {
            if (linkNode !== null) {
              const children = node.getChildren();
              for (let i = 0; i < children.length; i++) {
                linkNode.append(children[i]);
              }
            }
            node.remove();
            return;
          }
          if (linkNode !== null) {
            linkNode.append(node);
          }
        });
      }
    }
  });
}

export default function ToolbarPlugin(): React$Node {
  const [editor] = useLexicalComposerContext();
  const [activeEditor, setActiveEditor] = useState(editor);
  const toolbarRef = useRef(null);
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
  const [showBlockOptionsDropDown, setShowBlockOptionsDropDown] =
    useState(false);
  const [codeLanguage, setCodeLanguage] = useState<string>('');

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if (selection !== null) {
      const anchorNode = selection.anchor.getNode();
      const element =
        anchorNode.getKey() === 'root'
          ? anchorNode
          : anchorNode.getTopLevelElementOrThrow();
      const elementKey = element.getKey();
      const elementDOM = activeEditor.getElementByKey(elementKey);
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
      // Update text format
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
      setIsCode(selection.hasFormat('code'));

      // Update links
      const node = getSelectedNode(selection);
      const parent = node.getParent();
      if ($isLinkNode(parent) || $isLinkNode(node)) {
        setIsLink(true);
      } else {
        setIsLink(false);
      }
    }
  }, [activeEditor]);

  useEffect(() => {
    return activeEditor.addListener('update', ({editorState}) => {
      editorState.read(() => {
        updateToolbar();
      });
    });
  }, [activeEditor, updateToolbar]);

  useEffect(() => {
    const removeCommandListener = editor.addListener(
      'command',
      (type, payload, editor) => {
        if (type === 'selectionChange') {
          updateToolbar();
          setActiveEditor(editor);
        } else if (type === 'canUndo') {
          setCanUndo(payload);
        } else if (type === 'canRedo') {
          setCanRedo(payload);
        }
        return false;
      },
      LowPriority,
    );

    return () => {
      removeCommandListener();
    };
  }, [editor, selectedElementKey, updateToolbar]);

  const applyStyleText = useCallback(
    (styles: {[string]: string}) => {
      activeEditor.update(() => {
        $log('applyStyleText');
        const selection = $getSelection();
        if (selection !== null) {
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
      toggleLinksOnSelection(activeEditor, 'http://');
    } else {
      toggleLinksOnSelection(activeEditor, null);
    }
  }, [activeEditor, isLink]);

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

  return (
    <div className="toolbar" ref={toolbarRef}>
      <button
        disabled={!canUndo}
        onClick={() => {
          activeEditor.execCommand('undo');
        }}
        className="toolbar-item spaced"
        aria-label="Undo">
        <i className="format undo" />
      </button>
      <button
        disabled={!canRedo}
        onClick={() => {
          activeEditor.execCommand('redo');
        }}
        className="toolbar-item"
        aria-label="Redo">
        <i className="format redo" />
      </button>
      <Divider />
      {supportedBlockTypes.has(blockType) && activeEditor === editor && (
        <>
          <button
            className="toolbar-item block-controls"
            onClick={() =>
              setShowBlockOptionsDropDown(!showBlockOptionsDropDown)
            }
            aria-label="Formatting Options">
            <span className={'icon block-type ' + blockType} />
            <span className="text">{blockTypeToBlockName[blockType]}</span>
            <i className="chevron-down" />
          </button>
          {showBlockOptionsDropDown &&
            createPortal(
              <BlockOptionsDropdownList
                editor={activeEditor}
                blockType={blockType}
                toolbarRef={toolbarRef}
                setShowBlockOptionsDropDown={setShowBlockOptionsDropDown}
              />,
              document.body,
            )}
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
              activeEditor.execCommand('formatText', 'bold');
            }}
            className={'toolbar-item spaced ' + (isBold ? 'active' : '')}
            aria-label="Format Bold">
            <i className="format bold" />
          </button>
          <button
            onClick={() => {
              activeEditor.execCommand('formatText', 'italic');
            }}
            className={'toolbar-item spaced ' + (isItalic ? 'active' : '')}
            aria-label="Format Italics">
            <i className="format italic" />
          </button>
          <button
            onClick={() => {
              activeEditor.execCommand('formatText', 'underline');
            }}
            className={'toolbar-item spaced ' + (isUnderline ? 'active' : '')}
            aria-label="Format Underline">
            <i className="format underline" />
          </button>
          <button
            onClick={() => {
              activeEditor.execCommand('formatText', 'strikethrough');
            }}
            className={
              'toolbar-item spaced ' + (isStrikethrough ? 'active' : '')
            }
            aria-label="Format Strikethrough">
            <i className="format strikethrough" />
          </button>
          <button
            onClick={() => {
              activeEditor.execCommand('formatText', 'code');
            }}
            className={'toolbar-item spaced ' + (isCode ? 'active' : '')}
            aria-label="Insert Code">
            <i className="format code" />
          </button>
          <button
            onClick={insertLink}
            className={'toolbar-item spaced ' + (isLink ? 'active' : '')}
            aria-label="Insert Link">
            <i className="format link" />
          </button>
          {isLink &&
            createPortal(
              <FloatingLinkEditor editor={activeEditor} />,
              document.body,
            )}
          <button
            onClick={() => {
              activeEditor.execCommand('insertImage');
            }}
            className="toolbar-item spaced"
            aria-label="Insert Image">
            <i className="format image" />
          </button>
          <button
            onClick={() => {
              activeEditor.execCommand('insertTable');
            }}
            className="toolbar-item"
            aria-label="Insert Table">
            <i className="format table" />
          </button>
        </>
      )}

      <Divider />
      <button
        onClick={() => {
          activeEditor.execCommand('formatElement', 'left');
        }}
        className="toolbar-item spaced"
        aria-label="Left Align">
        <i className="format left-align" />
      </button>
      <button
        onClick={() => {
          activeEditor.execCommand('formatElement', 'center');
        }}
        className="toolbar-item spaced"
        aria-label="Center Align">
        <i className="format center-align" />
      </button>
      <button
        onClick={() => {
          activeEditor.execCommand('formatElement', 'right');
        }}
        className="toolbar-item spaced"
        aria-label="Right Align">
        <i className="format right-align" />
      </button>
      <button
        onClick={() => {
          activeEditor.execCommand('formatElement', 'justify');
        }}
        className="toolbar-item"
        aria-label="Justify Align">
        <i className="format justify-align" />
      </button>
      <Divider />
      <button
        onClick={() => {
          activeEditor.execCommand('outdentContent');
        }}
        className="toolbar-item spaced"
        aria-label="Outdent">
        <i className="format outdent" />
      </button>
      <button
        onClick={() => {
          activeEditor.execCommand('indentContent');
        }}
        className="toolbar-item"
        aria-label="Indent">
        <i className="format indent" />
      </button>
    </div>
  );
}
