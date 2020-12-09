// @flow

import type {OutlineEditor, Selection} from 'outline';

import {TextNode} from 'outline';
import React, {useCallback, useEffect, useRef, useState} from 'react';
// $FlowFixMe
import {unstable_batchedUpdates, createPortal} from 'react-dom';

const FORMAT_BOLD = 0;
const FORMAT_ITALIC = 1;
const FORMAT_STRIKETHROUGH = 2;
const FORMAT_CODE = 4;
const FORMAT_LINK = 5;

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

function getSelectedNode(selection: Selection): TextNode {
  const anchorNode = selection.getAnchorNode();
  const focusNode = selection.getFocusNode();
  if (anchorNode === focusNode) {
    return anchorNode;
  }
  return anchorNode.isBefore(focusNode) ? anchorNode : focusNode;
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
          if (editor !== null && lastSelection !== null) {
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
      <a href={linkUrl} target="_blank" rel="noopener">
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

function Toolbar({editor}: {editor: null | OutlineEditor}): React$Node {
  const toolbarRef = useRef(null);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [isEditMode, setEditMode] = useState(false);
  const [lastSelection, setLastSelection] = useState(null);
  const mouseDownRef = useRef(false);

  const moveToolbar = useCallback((selection) => {
    const toolbar = toolbarRef.current;
    const nativeSelection = window.getSelection();
    const activeElement = document.activeElement;

    if (toolbar === null) {
      return;
    }

    if (selection !== null && !nativeSelection.isCollapsed) {
      const domRange = nativeSelection.getRangeAt(0);
      const rect = domRange.getBoundingClientRect();
      if (!mouseDownRef.current) {
        positionToolbar(toolbar, rect);
      }
      setLastSelection(selection);
    } else if (!activeElement || activeElement.className !== 'link-input') {
      // eslint-disable-next-line no-debugger
      positionToolbar(toolbar, null);
      setLastSelection(null);
      setEditMode(false);
      setLinkUrl('');
    }
  }, []);

  useEffect(() => {
    if (editor !== null) {
      editor.getViewModel().read((view) => {
        const selection = view.getSelection();
        moveToolbar(selection);
      });
    }
  });

  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (editor !== null && toolbar !== null) {
      const updateButtonStates = (selection) => {
        const activeElement = document.activeElement;
        if (
          selection !== null &&
          (!activeElement || activeElement.className !== 'link-input')
        ) {
          const node = getSelectedNode(selection);
          unstable_batchedUpdates(() => {
            setIsBold(node.isBold());
            setIsItalic(node.isItalic());
            setIsStrikethrough(node.isStrikethrough());
            setIsCode(node.isCode());
            setIsLink(node.isLink());
            setLinkUrl(node.getURL() || '');
          });
        }
      };

      const selectionChangeHandler = () => {
        editor.getViewModel().read((view) => {
          const selection = view.getSelection();
          updateButtonStates(selection);
          moveToolbar(selection);
        });
      };
      const checkForChanges = () => {
        editor.getViewModel().read((view) => {
          const selection = view.getSelection();
          updateButtonStates(selection);
          moveToolbar(selection);
        });
      };
      const mouseDownHandler = () => {
        mouseDownRef.current = true;
      };
      const mouseUpHandler = () => {
        mouseDownRef.current = false;
        if (editor !== null) {
          editor.getViewModel().read((view) => {
            const selection = view.getSelection();
            moveToolbar(selection);
          });
        }
      };

      document.addEventListener('selectionchange', selectionChangeHandler);
      document.addEventListener('mousedown', mouseDownHandler);
      document.addEventListener('mouseup', mouseUpHandler);
      const removeUpdateListener = editor.addUpdateListener(checkForChanges);
      return () => {
        document.removeEventListener('mousedown', mouseDownHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
        document.removeEventListener(
          'selectionChangeHandler',
          selectionChangeHandler,
        );
        removeUpdateListener();
      };
    }
  }, [editor, isEditMode, isLink, moveToolbar]);

  const updateSelectedLinks = useCallback(
    (url: null | string, selection: null | Selection) => {
      if (editor !== null) {
        editor.update((view) => {
          if (selection !== null) {
            view.setSelection(selection);
          }
          const sel = view.getSelection();
          if (sel !== null) {
            const nodes = sel.getNodes();
            nodes.forEach((node) => {
              if (node instanceof TextNode && !node.isImmutable()) {
                node.setURL(url);
              }
            });
            if (url !== null) {
              sel.formatText(FORMAT_LINK, true);
            }
          }
        });
      }
    },
    [editor],
  );

  const formatText = useCallback(
    (formatType: 0 | 1 | 2 | 3 | 4 | 5) => {
      if (editor !== null) {
        editor.update((view) => {
          const selection = view.getSelection();
          if (selection !== null) {
            selection.formatText(formatType);
          }
        });
      }
    },
    [editor],
  );

  const bold = useCallback(() => formatText(FORMAT_BOLD), [formatText]);
  const italic = useCallback(() => formatText(FORMAT_ITALIC), [formatText]);
  const code = useCallback(() => formatText(FORMAT_CODE), [formatText]);
  const strikethrough = useCallback(() => formatText(FORMAT_STRIKETHROUGH), [
    formatText,
  ]);
  const link = useCallback(() => {
    if (!isLink) {
      setEditMode(true);
      updateSelectedLinks('http://', null);
    } else {
      formatText(FORMAT_LINK);
      updateSelectedLinks(null, null);
    }
  }, [formatText, isLink, updateSelectedLinks]);

  return (
    <div ref={toolbarRef} id="toolbar">
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
  );
}

export default function useToolbar(editor: OutlineEditor | null): React$Node {
  return createPortal(<Toolbar editor={editor} />, document.body);
}
