// @flow

import type {OutlineEditor} from 'outline';

import React, {useCallback, useEffect, useRef, useState} from 'react';
// $FlowFixMe
import {createPortal} from 'react-dom';
import {
  FORMAT_BOLD,
  FORMAT_CODE,
  FORMAT_ITALIC,
  FORMAT_STRIKETHROUGH,
} from 'plugin-shared';

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

function getSelectedNode(selection) {
  const anchorNode = selection.getAnchorNode();
  const focusNode = selection.getFocusNode();
  if (anchorNode === focusNode) {
    return anchorNode;
  }
  return anchorNode.isBefore(focusNode) ? anchorNode : focusNode;
}

function Toolbar({editor}: {editor: null | OutlineEditor}): React$Node {
  const toolbarRef = useRef(null);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);

  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (editor !== null && toolbar !== null) {
      const updateButtonStates = (selection) => {
        const node = getSelectedNode(selection);
        setIsBold(node.isBold());
        setIsItalic(node.isItalic());
        setIsStrikethrough(node.isStrikethrough());
        setIsCode(node.isCode());
      };

      const selectionChangeHandler = () => {
        editor.read((view) => {
          const selection = view.getSelection();
          const nativeSelection = window.getSelection();
          if (selection !== null && !nativeSelection.isCollapsed) {
            const domRange = nativeSelection.getRangeAt(0);
            const rect = domRange.getBoundingClientRect();
            positionToolbar(toolbar, rect);
            updateButtonStates(selection);
          } else {
            positionToolbar(toolbar, null);
          }
        });
      };
      const checkForChanges = () => {
        editor.read((view) => {
          const selection = view.getSelection();
          if (selection !== null) {
            updateButtonStates(selection);
          }
        });
      };

      document.addEventListener('selectionchange', selectionChangeHandler);
      const removeUpdateListener = editor.addUpdateListener(checkForChanges);
      return () => {
        document.removeEventListener(
          'selectionChangeHandler',
          selectionChangeHandler,
        );
        removeUpdateListener();
      };
    }
  }, [editor]);

  const formatText = useCallback(
    (formatType: 0 | 1 | 2 | 3 | 4) => {
      if (editor !== null) {
        const viewModel = editor.draft((view) => {
          const selection = view.getSelection();
          if (selection !== null) {
            selection.formatText(formatType);
          }
        });
        editor.update(viewModel);
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
    // TODO
  }, []);

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
      <Button className="link" onClick={link} active={false} />
    </div>
  );
}

export function useToolbarPlugin(editor: OutlineEditor | null): React$Node {
  return createPortal(<Toolbar editor={editor} />, document.body);
}
