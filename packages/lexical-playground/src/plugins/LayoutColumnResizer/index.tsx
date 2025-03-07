/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './index.css';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {calculateZoomLevel} from '@lexical/utils';
import {$getNearestNodeFromDOMNode, LexicalEditor} from 'lexical';
import * as React from 'react';
import {createPortal} from 'react-dom';

import {
  $findLayoutItemIndexGivenLayoutContainerNode,
  $getLayoutContainerNodeIfLayoutItemNodeOrThrow,
} from '../../nodes/LayoutContainerNode';
import {$isLayoutItemNode} from '../../nodes/LayoutItemNode';

export const MIN_LAYOUT_COLUMN_WIDTH = 100;

interface Props {
  editor: LexicalEditor;
}

type MousePosition = {
  x: number;
  y: number;
};

type MouseDraggingDirection = 'right' | 'bottom';

const LayoutColumnResizer: React.FC<Props> = (props) => {
  const {editor} = props;
  const [mouseCurrentPos, updateMouseCurrentPos] =
    React.useState<MousePosition | null>(null);

  const [activeCell, updateActiveCell] = React.useState<HTMLElement | null>(
    null,
  );
  const [isMouseDown, updateIsMouseDown] = React.useState<boolean>(false);
  const [draggingDirection, updateDraggingDirection] =
    React.useState<MouseDraggingDirection | null>(null);

  // refs
  const mouseStartPosRef = React.useRef<MousePosition | null>(null);
  const targetRef = React.useRef<HTMLElement | null>(null);
  const resizerRef = React.useRef<HTMLDivElement | null>(null);
  const layoutRectRef = React.useRef<ClientRect | null>(null);

  // actions
  const resetState = React.useCallback(() => {
    updateActiveCell(null);
    targetRef.current = null;
    updateDraggingDirection(null);
    mouseStartPosRef.current = null;
    layoutRectRef.current = null;
  }, []);

  const isMouseDownOnEvent = React.useCallback((event: MouseEvent) => {
    return (event.buttons & 1) === 1;
  }, []);

  const isWidthChanging = (direction: MouseDraggingDirection) => {
    if (direction === 'right') {
      return true;
    }
    return false;
  };

  const updateColumnWidth = React.useCallback(
    (widthChange: number) => {
      if (!activeCell) {
        throw new Error('LayoutColumnResizer: Expected active cell.');
      }

      editor.update(
        () => {
          const layoutItemNode = $getNearestNodeFromDOMNode(activeCell);
          if (!$isLayoutItemNode(layoutItemNode)) {
            throw new Error('LayoutColumnResizer: Expected layout item node.');
          }

          const layoutContainerNode =
            $getLayoutContainerNodeIfLayoutItemNodeOrThrow(layoutItemNode);

          const layoutItemsCount = layoutContainerNode.getChildrenSize();
          const layoutItemIndex =
            $findLayoutItemIndexGivenLayoutContainerNode(layoutItemNode);

          if (layoutItemIndex < 0 || layoutItemIndex >= layoutItemsCount) {
            throw new Error('LayoutColumnResizer: Invalid layout item index.');
          }

          const columnWidth = activeCell.offsetWidth; // (width + padding + border)

          const newWidth = Math.max(
            widthChange + columnWidth,
            MIN_LAYOUT_COLUMN_WIDTH,
          );
          layoutContainerNode.updateTemplateColumnWithIndex(
            layoutItemIndex,
            `${newWidth}px`,
          );

          const nextSiblingLayoutItemElement =
            activeCell.nextElementSibling as HTMLElement;

          if (nextSiblingLayoutItemElement) {
            const nextSiblingWidth = nextSiblingLayoutItemElement.offsetWidth;

            const nextSiblingNewWidth = Math.max(
              nextSiblingWidth - widthChange,
              MIN_LAYOUT_COLUMN_WIDTH,
            );

            layoutContainerNode.updateTemplateColumnWithIndex(
              layoutItemIndex + 1,
              `${nextSiblingNewWidth}px`,
            );
          }
        },
        {discrete: true, tag: 'skip-scroll-into-view'},
      );
    },
    [activeCell, editor],
  );

  const mouseUpHandler = React.useCallback(
    (direction: MouseDraggingDirection) => {
      const handler = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        if (!activeCell) {
          throw new Error('LayoutColumnResizer: Expected active cell.');
        }

        if (mouseStartPosRef.current) {
          const {x} = mouseStartPosRef.current;

          if (activeCell === null) {
            return;
          }
          const zoom = calculateZoomLevel(event.target as Element);

          if (isWidthChanging(direction)) {
            const widthChange = (event.clientX - x) / zoom;
            updateColumnWidth(widthChange);
          }

          resetState();
          document.removeEventListener('mouseup', handler);
        }
      };
      return handler;
    },
    [activeCell, resetState, updateColumnWidth],
  );

  const toggleResize = React.useCallback(
    (
        direction: MouseDraggingDirection,
      ): React.MouseEventHandler<HTMLDivElement> =>
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (!activeCell) {
          throw new Error('TableCellResizer: Expected active cell.');
        }

        mouseStartPosRef.current = {
          x: event.clientX,
          y: event.clientY,
        };

        updateMouseCurrentPos(mouseStartPosRef.current);
        updateDraggingDirection(direction);

        document.addEventListener('mouseup', mouseUpHandler(direction));
      },
    [activeCell, mouseUpHandler],
  );

  const getResizers = React.useCallback(() => {
    if (activeCell) {
      const {height, width, top, left} = activeCell.getBoundingClientRect();
      const zoom = calculateZoomLevel(activeCell);
      const zoneWidth = 10; // Pixel width of the zone where you can drag the edge
      const styles = {
        backgroundColor: 'none',
        cursor: 'col-resize',
        height: `${height}px`,
        left: `${window.pageXOffset + left + width - zoneWidth / 2}px`,
        top: `${window.pageYOffset + top}px`,
        width: `${zoneWidth}px`,
      };

      const layoutRect = layoutRectRef.current;

      if (draggingDirection && mouseCurrentPos && layoutRect) {
        styles.top = `${window.pageYOffset + layoutRect.top}px`;
        styles.left = `${window.pageXOffset + mouseCurrentPos.x / zoom}px`;
        styles.width = '3px';
        styles.height = `${layoutRect.height}px`;
        styles.backgroundColor = '#adf';
      }

      return styles;
    }

    return undefined;
  }, [activeCell, draggingDirection, mouseCurrentPos]);

  // effects
  React.useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      setTimeout(() => {
        const target = event.target as HTMLElement;

        if (draggingDirection) {
          updateMouseCurrentPos({
            x: event.clientX,
            y: event.clientY,
          });
          return;
        }

        updateIsMouseDown(isMouseDownOnEvent(event));

        if (resizerRef.current && resizerRef.current.contains(target as Node)) {
          return;
        }

        if (targetRef.current !== target) {
          targetRef.current = target;

          if (target && target !== activeCell) {
            editor.update(() => {
              const targetLayoutItemNode = $getNearestNodeFromDOMNode(target);

              if (!$isLayoutItemNode(targetLayoutItemNode)) {
                return;
              }

              const layoutContainerNode =
                $getLayoutContainerNodeIfLayoutItemNodeOrThrow(
                  targetLayoutItemNode,
                );
              const targetLayoutItemIndex =
                $findLayoutItemIndexGivenLayoutContainerNode(
                  targetLayoutItemNode,
                );
              const layoutItemsCount = layoutContainerNode.getChildrenSize();

              if (targetLayoutItemIndex === layoutItemsCount - 1) {
                resetState();
                return;
              }

              const layoutContainerDomElement = editor.getElementByKey(
                layoutContainerNode.getKey(),
              );

              if (!layoutContainerDomElement) {
                throw new Error(
                  'LayoutColumnResizer: Expected layout container Not Found.',
                );
              }

              targetRef.current = target;
              layoutRectRef.current =
                layoutContainerDomElement.getBoundingClientRect();
              updateActiveCell(target);
            });
          } else if (target === null) {
            resetState();
          }
        }
      }, 0);
    };

    const onMouseDown = (event: MouseEvent) => {
      setTimeout(() => {
        updateIsMouseDown(true);
      }, 0);
    };

    const onMouseUp = (event: MouseEvent) => {
      setTimeout(() => {
        updateIsMouseDown(false);
      }, 0);
    };

    const removeRootListener = editor.registerRootListener(
      (rootElement, prevRootElement) => {
        prevRootElement?.removeEventListener('mousemove', onMouseMove);
        prevRootElement?.removeEventListener('mousedown', onMouseDown);
        prevRootElement?.removeEventListener('mouseup', onMouseUp);
        rootElement?.addEventListener('mousemove', onMouseMove);
        rootElement?.addEventListener('mousedown', onMouseDown);
        rootElement?.addEventListener('mouseup', onMouseUp);
      },
    );

    return () => {
      removeRootListener();
    };
  }, [activeCell, draggingDirection, editor, isMouseDownOnEvent, resetState]);

  const resizerStyles = getResizers();

  return (
    <div ref={resizerRef}>
      {activeCell != null && !isMouseDown && (
        <div
          className="PlaygroundEditorTheme__resizer"
          style={resizerStyles}
          onMouseDown={toggleResize('right')}
        />
      )}
    </div>
  );
};

function LayoutColumnResizerPlugin(): null | React.ReactPortal {
  const [editor] = useLexicalComposerContext();
  const isEditable = editor.isEditable();

  return React.useMemo(
    () =>
      createPortal(
        isEditable ? <LayoutColumnResizer editor={editor} /> : null,
        document.body,
      ),
    [editor, isEditable],
  );
}

export default LayoutColumnResizerPlugin;
