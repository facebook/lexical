/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  OutlineEditor,
  CommandListenerLowPriority,
  ElementNode,
  TextNode,
  Selection,
  OutlineNode,
} from 'outline';
import type {ListItemNode} from 'outline/ListItemNode';
import type {ListNode} from 'outline/ListNode';

import * as React from 'react';
import {useCallback, useEffect, useRef, useState} from 'react';

import {useOutlineComposerContext} from 'outline-react/OutlineComposerContext';
import {$isHeadingNode} from 'outline/HeadingNode';
import {$createParagraphNode} from 'outline/ParagraphNode';
import {$createHeadingNode} from 'outline/HeadingNode';
import {$createListNode, $isListNode} from 'outline/ListNode';
import {$createListItemNode, $isListItemNode} from 'outline/ListItemNode';
import {$createQuoteNode} from 'outline/QuoteNode';
import {$createCodeNode} from 'outline/CodeNode';
import {
  $log,
  $getSelection,
  $setSelection,
  $isLineBreakNode,
  createEditorStateRef,
  $isRootNode,
  $isLeafNode,
  $isElementNode,
} from 'outline';
import {$createLinkNode, $isLinkNode} from 'outline/LinkNode';
import {
  $wrapLeafNodesInElements,
  $patchStyleText,
  $getSelectionStyleValueForProperty,
  $isAtNodeEnd,
} from 'outline/selection';

import {$createTableNodeWithDimensions, $getTopListNode} from 'outline/nodes';
// $FlowFixMe
import {createPortal} from 'react-dom';

import yellowFlowerImage from '../images/image/yellow-flower.jpg';

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

function FloatingLinkEditor({editor}: {editor: OutlineEditor}): React$Node {
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
    const removeUpdateListener = editor.addListener(
      'update',
      ({editorState}) => {
        editorState.read(() => {
          updateLinkEditor();
        });
      },
    );

    const removeCommandListener = editor.addListener(
      'command',
      (type, payload) => {
        if (type === 'selectionChange') {
          updateLinkEditor();
        }
        return false;
      },
      LowPriority,
    );

    return () => {
      removeUpdateListener();
      removeCommandListener();
    };
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
  editor: OutlineEditor,
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
      editor.update((state) => {
        $log('formatSmallHeading');
        const selection = $getSelection();

        if (selection !== null) {
          $wrapLeafNodesInElements(selection, () => $createHeadingNode('h2'));
        }
      });
    }
    setShowBlockOptionsDropDown(false);
  };

  const findNearestListItemNode = (node: OutlineNode): ListItemNode | null => {
    if ($isListItemNode(node)) {
      return node;
    }
    let parent = node.getParent();
    while (!$isRootNode(parent) && parent != null) {
      if ($isListItemNode(parent)) {
        return parent;
      }
      parent = parent.getParent();
    }
    return null;
  };

  const getAllListItems = (node: ListNode): Array<ListItemNode> => {
    let listItemNodes: Array<ListItemNode> = [];
    //$FlowFixMe - the result of this will always be an array of ListItemNodes.
    const listChildren: Array<ListItemNode> = node
      .getChildren()
      .filter($isListItemNode);
    for (let i = 0; i < listChildren.length; i++) {
      const listItemNode = listChildren[i];
      const firstChild = listItemNode.getFirstChild();
      if ($isListNode(firstChild)) {
        listItemNodes = listItemNodes.concat(getAllListItems(firstChild));
      } else {
        listItemNodes.push(listItemNode);
      }
    }
    return listItemNodes;
  };

  const removeList = () => {
    editor.update(() => {
      $log('removeList');
      const selection = $getSelection();
      if (selection !== null) {
        const listNodes = new Set();
        const nodes = selection.getNodes();
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          if ($isLeafNode(node)) {
            const listItemNode = findNearestListItemNode(node);
            if (listItemNode != null) {
              listNodes.add($getTopListNode(listItemNode));
            }
          }
        }
        listNodes.forEach((listNode) => {
          let insertionPoint = listNode;
          const listItems = getAllListItems(listNode);
          listItems.forEach((listItemNode, index) => {
            if (listItemNode != null) {
              const paragraph = $createParagraphNode();
              paragraph.append(...listItemNode.getChildren());
              insertionPoint.insertAfter(paragraph);
              insertionPoint = paragraph;
              listItemNode.remove();
            }
          });
          listNode.remove();
        });
      }
    });
  };

  const createListOrMerge = (
    node: ElementNode,
    listType: 'ul' | 'ol',
  ): ListNode => {
    if ($isListNode(node)) {
      return node;
    }
    const previousSibling = node.getPreviousSibling();
    const nextSibling = node.getNextSibling();
    const listItem = $createListItemNode();
    if ($isListNode(previousSibling)) {
      listItem.append(node);
      previousSibling.append(listItem);
      // if there are lists on both sides, merge them.
      if ($isListNode(nextSibling)) {
        previousSibling.append(...nextSibling.getChildren());
        nextSibling.remove();
      }
      return previousSibling;
    } else if ($isListNode(nextSibling)) {
      listItem.append(node);
      nextSibling.getFirstChildOrThrow().insertBefore(listItem);
      return nextSibling;
    } else {
      const list = $createListNode(listType);
      list.append(listItem);
      node.replace(list);
      listItem.append(node);
      return list;
    }
  };

  const insertList = (listType: 'ul' | 'ol') => {
    editor.update(() => {
      $log('formatList');
      const selection = $getSelection();
      if (selection !== null) {
        const nodes = selection.getNodes();
        const anchor = selection.anchor;
        const anchorNode = anchor.getNode();
        const anchorNodeParent = anchorNode.getParent();
        // This is a special case for when there's nothing selected
        if (nodes.length === 0) {
          const list = $createListNode(listType);
          const listItem = $createListItemNode();
          list.append(listItem);
          if ($isRootNode(anchorNodeParent)) {
            anchorNode.replace(list);
          } else if ($isListItemNode(anchorNode)) {
            const parent = anchorNode.getParentOrThrow();
            parent.replace(list);
          }
          listItem.select();
          return;
        } else {
          const handled = new Set();
          for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (
              $isElementNode(node) &&
              node.isEmpty() &&
              !handled.has(node.getKey())
            ) {
              createListOrMerge(node, listType);
              continue;
            }
            if ($isLeafNode(node)) {
              let parent = node.getParent();
              while (parent != null) {
                const parentKey = parent.getKey();
                if ($isListNode(parent)) {
                  if (!handled.has(parentKey)) {
                    const newListNode = $createListNode(listType);
                    newListNode.append(...parent.getChildren());
                    parent.replace(newListNode);
                    handled.add(parentKey);
                  }
                  break;
                } else {
                  const nextParent = parent.getParent();
                  const parentKey = parent.getKey();
                  if ($isRootNode(nextParent) && !handled.has(parentKey)) {
                    handled.add(parentKey);
                    createListOrMerge(parent, listType);
                    break;
                  }
                  parent = nextParent;
                }
              }
            }
          }
        }
      }
    });
  };

  const formatBulletList = () => {
    if (blockType !== 'ul') {
      insertList('ul');
    } else {
      removeList();
    }
    setShowBlockOptionsDropDown(false);
  };

  const formatNumberedList = () => {
    if (blockType !== 'ol') {
      insertList('ol');
    } else {
      removeList();
    }
    setShowBlockOptionsDropDown(false);
  };

  const formatQuote = () => {
    if (blockType !== 'quote') {
      editor.update((state) => {
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
      editor.update((state) => {
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

function toggleLinksOnSelection(editor: OutlineEditor, url: null | string) {
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
  const [editor] = useOutlineComposerContext();
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

  function getParentList(node: OutlineNode): ListNode | null {
    let parent = node;
    while (parent != null) {
      if ($isListNode(parent)) {
        return parent;
      }
      parent = parent.getParent();
    }
    return parent;
  }

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
          const parentList = getParentList(anchorNode);
          const type = parentList ? parentList.getTag() : element.getTag();
          setBlockType(type);
        } else {
          const type = $isHeadingNode(element)
            ? element.getTag()
            : element.getType();
          setBlockType(type);
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
  }, [activeEditor, selectedElementKey]);

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
        className={'toolbar-item spaced ' + (isStrikethrough ? 'active' : '')}
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
