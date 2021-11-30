/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import * as React from 'react';
import PlaygroundEditorContext from '../context/PlaygroundEditorContext';
import {useEditorContext} from 'outline-react/OutlineEditorContext';
import type {
  OutlineEditor,
  Selection,
  TextFormatType,
  TextNode,
  BlockNode,
  DecoratorNode,
  LineBreakNode,
} from 'outline';

import {isTextNode} from 'outline';
import {useCallback, useEffect, useRef, useState, useMemo} from 'react';
// $FlowFixMe
import {unstable_batchedUpdates, createPortal} from 'react-dom';
import {
  formatText,
  extractSelection,
  getSelectionStyleValueForProperty,
  patchStyleText,
  isAtNodeEnd,
} from 'outline/selection';
import {log, getSelection, setSelection} from 'outline';
import {createLinkNode, isLinkNode, LinkNode} from 'outline/LinkNode';

function positionToolbar(toolbar, rect) {
  if (rect === null) {
    toolbar.style.opacity = '0';
    toolbar.style.top = '-1000px';
    toolbar.style.left = '-1000px';
  } else {
    toolbar.style.opacity = '1';
    toolbar.style.top = `${
      rect.top + window.pageYOffset - toolbar.offsetHeight
    }px`;
    toolbar.style.left = `${
      rect.left + window.pageXOffset - toolbar.offsetWidth / 2 + rect.width / 2
    }px`;
  }
}

function Button({
  active,
  className,
  onClick,
}: {
  active: boolean,
  className: string,
  onClick: () => void,
}) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      className={
        'button ' + (active ? 'active ' : '') + (isHovered ? 'hovered' : '')
      }
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={(event) => {
        event.preventDefault();
      }}>
      <i className={className} />
    </div>
  );
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
}) {
  return (
    <select className={className} onChange={onChange} value={value}>
      <option hidden value=""></option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function getSelectedNode(
  selection: Selection,
): TextNode | BlockNode | DecoratorNode | LineBreakNode {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = selection.anchor.getNode();
  const focusNode = selection.focus.getNode();
  if (anchorNode === focusNode) {
    return anchorNode;
  }
  const isBackward = selection.isBackward();
  if (isBackward) {
    return isAtNodeEnd(focus) ? anchorNode : focusNode;
  } else {
    return isAtNodeEnd(anchor) ? focusNode : anchorNode;
  }
}

function LinkBar({
  lastSelection,
  editor,
  isEditMode,
  linkUrl,
  setLinkUrl,
  setEditMode,
  updateSelectedLinks,
}: {
  lastSelection: null | Selection,
  editor: null | OutlineEditor,
  isEditMode: boolean,
  linkUrl: string,
  setLinkUrl: (string) => void,
  setEditMode: (boolean) => void,
  updateSelectedLinks: (url: string, selection: null | Selection) => void,
}): React$Node {
  const inputRef = useRef(null);

  return isEditMode ? (
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
              updateSelectedLinks(linkUrl, lastSelection);
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
  );
}

function Toolbar({editor}: {editor: OutlineEditor}): React$Node {
  const toolbarRef = useRef(null);
  const [fontSize, setFontSize] = useState<string>('15px');
  const [fontFamily, setFontFamily] = useState<string>('Arial');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [isEditMode, setEditMode] = useState(false);
  const [lastSelection, setLastSelection] = useState(null);
  const mouseDownRef = useRef(false);

  const moveToolbar = useCallback(
    (selection) => {
      const toolbar = toolbarRef.current;
      const nativeSelection = window.getSelection();
      const activeElement = document.activeElement;

      if (toolbar === null) {
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
          positionToolbar(toolbar, rect);
        }
        setLastSelection(selection);
      } else if (!activeElement || activeElement.className !== 'link-input') {
        positionToolbar(toolbar, null);
        setLastSelection(null);
        setEditMode(false);
        setLinkUrl('');
      }
    },
    [editor],
  );

  useEffect(() => {
    editor.getEditorState().read(() => {
      const selection = getSelection();
      moveToolbar(selection);
    });
  });

  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (toolbar !== null) {
      const updateButtonStates = (selection) => {
        const activeElement = document.activeElement;
        if (
          selection !== null &&
          (!activeElement || activeElement.className !== 'link-input')
        ) {
          const node = getSelectedNode(selection);
          unstable_batchedUpdates(() => {
            setFontSize(
              getSelectionStyleValueForProperty(selection, 'font-size', '15px'),
            );
            setFontFamily(
              getSelectionStyleValueForProperty(
                selection,
                'font-family',
                'Arial',
              ),
            );
            setIsBold(isTextNode(node) && node.hasFormat('bold'));
            setIsItalic(isTextNode(node) && node.hasFormat('italic'));
            setIsStrikethrough(
              isTextNode(node) && node.hasFormat('strikethrough'),
            );
            setIsCode(isTextNode(node) && node.hasFormat('code'));
            const parent = node.getParent();
            if (isLinkNode(parent)) {
              setIsLink(true);
              setLinkUrl(parent.getURL());
            } else if (isLinkNode(node)) {
              setIsLink(true);
              setLinkUrl(node.getURL());
            } else {
              setIsLink(false);
              setLinkUrl('');
            }
          });
        }
      };

      const selectionChangeHandler = () => {
        editor.getEditorState().read(() => {
          const selection = getSelection();
          updateButtonStates(selection);
          moveToolbar(selection);
        });
      };
      const checkForChanges = () => {
        editor.getEditorState().read(() => {
          const selection = getSelection();
          updateButtonStates(selection);
          moveToolbar(selection);
        });
      };
      const mouseDownHandler = () => {
        mouseDownRef.current = true;
      };
      const mouseUpHandler = () => {
        mouseDownRef.current = false;
        editor.getEditorState().read(() => {
          const selection = getSelection();
          moveToolbar(selection);
        });
      };

      document.addEventListener('selectionchange', selectionChangeHandler);
      document.addEventListener('mousedown', mouseDownHandler);
      document.addEventListener('mouseup', mouseUpHandler);
      const removeUpdateListener = editor.addListener(
        'update',
        checkForChanges,
      );
      return () => {
        document.removeEventListener('mousedown', mouseDownHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
        document.removeEventListener('selectionchange', selectionChangeHandler);
        removeUpdateListener();
      };
    }
  }, [editor, isEditMode, isLink, moveToolbar]);

  const updateSelectedLinks = useCallback(
    (url: null | string, selection: null | Selection) => {
      editor.update(() => {
        log('useToolbar');
        if (selection !== null) {
          setSelection(selection);
        }
        const sel = getSelection();
        if (sel !== null) {
          const nodes = extractSelection(sel);
          if (url === null) {
            // Remove LinkNodes
            nodes.forEach((node) => {
              const parent = node.getParent();

              if (isLinkNode(parent)) {
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
              if (isLinkNode(firstNode)) {
                firstNode.setURL(url);
                return;
              } else {
                const parent = firstNode.getParent();
                if (isLinkNode(parent)) {
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
                linkNode = createLinkNode(url);
                if (isLinkNode(parent)) {
                  if (node.getPreviousSibling() === null) {
                    parent.insertBefore(linkNode);
                  } else {
                    parent.insertAfter(linkNode);
                  }
                } else {
                  node.insertBefore(linkNode);
                }
              }
              if (isLinkNode(node)) {
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
    },
    [editor],
  );

  const applyFormatText = useCallback(
    (formatType: TextFormatType) => {
      editor.update(() => {
        log('applyFormatText');
        const selection = getSelection();
        if (selection !== null) {
          formatText(selection, formatType);
        }
      });
    },
    [editor],
  );

  const applyStyleText = useCallback(
    (styles: {[string]: string}) => {
      editor.update(() => {
        log('applyStyleText');
        const selection = getSelection();
        if (selection !== null) {
          patchStyleText(selection, styles);
        }
      });
    },
    [editor],
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
  const bold = useCallback(() => applyFormatText('bold'), [applyFormatText]);
  const italic = useCallback(
    () => applyFormatText('italic'),
    [applyFormatText],
  );
  const code = useCallback(() => applyFormatText('code'), [applyFormatText]);
  const strikethrough = useCallback(
    () => applyFormatText('strikethrough'),
    [applyFormatText],
  );
  const link = useCallback(() => {
    if (!isLink) {
      setEditMode(true);
      updateSelectedLinks('http://', null);
    } else {
      updateSelectedLinks(null, null);
    }
  }, [isLink, updateSelectedLinks]);

  return (
    <div ref={toolbarRef} id="toolbar">
      <div className="font-size-wrapper">
        <Select
          className="font-size"
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
      </div>
      <div className="font-family-wrapper">
        <Select
          className="font-family"
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
      </div>
      <div>
        <Button className="bold" onClick={bold} active={isBold} />
        <Button className="italic" onClick={italic} active={isItalic} />
        <Button className="code" onClick={code} active={isCode} />
        <Button
          className="strikethrough"
          onClick={strikethrough}
          active={isStrikethrough}
        />
        <Button className="link" onClick={link} active={isLink} />
        {isLink ? (
          <LinkBar
            lastSelection={lastSelection}
            editor={editor}
            linkUrl={linkUrl}
            setLinkUrl={setLinkUrl}
            isEditMode={isEditMode}
            setEditMode={setEditMode}
            updateSelectedLinks={updateSelectedLinks}
          />
        ) : null}
      </div>
    </div>
  );
}

function useFloatingToolbar(editor: OutlineEditor): React$Node {
  useEffect(() => {
    return editor.registerNodes([LinkNode]);
  }, [editor]);
  return useMemo(
    () => createPortal(<Toolbar editor={editor} />, document.body),
    [editor],
  );
}

export default function FloatingToolbarPlugin(): React$Node {
  const [editor] = useEditorContext(PlaygroundEditorContext);
  return useFloatingToolbar(editor);
}
