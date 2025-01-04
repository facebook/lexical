/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$findMatchingParent, mergeRegister} from '@lexical/utils';
import {
  $createParagraphNode,
  $getNearestNodeFromDOMNode,
  NodeKey,
} from 'lexical';
import * as React from 'react';
import {createPortal} from 'react-dom';

import {
  $findLayoutItemIndexGivenLayoutContainerNode,
  $getGridTemplateColumnsWithEqualWidth,
  $isLayoutContainerNode,
  LayoutContainerNode,
} from '../../nodes/LayoutContainerNode';
import {
  $createLayoutItemNode,
  $isLayoutItemNode,
  LayoutItemNode,
} from '../../nodes/LayoutItemNode';
import {useDebounce} from '../CodeActionMenuPlugin/utils';

interface Props {
  anchorElem?: HTMLElement;
}

const BUTTON_WIDTH_PX = 20;

function getMouseInfo(event: MouseEvent): {
  layoutItemNode: HTMLElement | null;
  layoutContainerNode: HTMLElement | null;
  isOutside: boolean;
} {
  const target = event.target;

  if (target && target instanceof HTMLElement) {
    const layoutContainerNode = target.closest<HTMLElement>(
      '.PlaygroundEditorTheme__layoutContainer',
    );
    const layoutItemNode = target.closest<HTMLElement>(
      '.PlaygroundEditorTheme__layoutItem',
    );

    const isOutside = !(
      layoutContainerNode ||
      layoutItemNode ||
      target.closest<HTMLElement>(
        'button.PlaygroundEditorTheme__layoutAddColumns',
      ) ||
      target.closest<HTMLElement>('div.PlaygroundEditorTheme__resizer')
    );

    return {isOutside, layoutContainerNode, layoutItemNode};
  }

  return {isOutside: false, layoutContainerNode: null, layoutItemNode: null};
}

function LayoutColumnHoverActionsContainer(props: Props): JSX.Element | null {
  const {anchorElem} = props;

  // states
  const [editor] = useLexicalComposerContext();
  const [showColumnAction, setShowColumnAction] =
    React.useState<boolean>(false);
  const [posiitonStyles, setPosiitonStyles] = React.useState({});
  const [shouldListenMouseMove, setShouldListenMouseMove] =
    React.useState<boolean>(false);

  // refs
  const codeSetRef = React.useRef<Set<NodeKey>>(new Set());
  const layoutContainerNodeRef = React.useRef<HTMLElement | null>(null);
  const layoutItemNodeRef = React.useRef<HTMLElement | null>(null);

  // actions
  const debouncedOnMouseMove = useDebounce(
    (event: MouseEvent) => {
      const {isOutside, layoutContainerNode, layoutItemNode} =
        getMouseInfo(event);

      if (isOutside) {
        setShowColumnAction(false);
        return;
      }

      if (!layoutItemNode || !layoutContainerNode) {
        return;
      }

      layoutItemNodeRef.current = layoutItemNode;
      layoutContainerNodeRef.current = layoutContainerNode;

      let hoveredLyoutItemNode: LayoutItemNode | null = null;
      let layoutContainerDOMElement: HTMLElement | null = null;

      editor.update(() => {
        const maybeLayoutItemNode = $getNearestNodeFromDOMNode(layoutItemNode);

        if ($isLayoutItemNode(maybeLayoutItemNode)) {
          const maybeLayoutContainer = $findMatchingParent(
            maybeLayoutItemNode,
            $isLayoutContainerNode,
          );

          if (!$isLayoutContainerNode(maybeLayoutContainer)) {
            return;
          }

          layoutContainerDOMElement = editor.getElementByKey(
            maybeLayoutContainer.getKey(),
          );

          if (layoutContainerDOMElement) {
            const columnsCount = maybeLayoutContainer.getChildrenSize();

            const columnIndex =
              $findLayoutItemIndexGivenLayoutContainerNode(maybeLayoutItemNode);

            if (columnIndex === columnsCount - 1) {
              hoveredLyoutItemNode = maybeLayoutItemNode;
            }
          }
        }
      });

      if (layoutContainerDOMElement) {
        const {
          height: containerElemHeight,
          y: containerElemY,
          right: containerElemRight,
        } = (layoutContainerDOMElement as HTMLElement).getBoundingClientRect();

        const {y: editorElemY} = anchorElem!.getBoundingClientRect();

        if (hoveredLyoutItemNode) {
          setShowColumnAction(true);
          setPosiitonStyles({
            height: containerElemHeight,
            left: containerElemRight + 5,
            top: containerElemY - editorElemY,
            width: BUTTON_WIDTH_PX,
          });
        }
      }
    },
    50,
    250,
  );

  const insertAction = React.useCallback(() => {
    editor.update(() => {
      if (layoutContainerNodeRef.current) {
        const maybeLayoutContainerNode = $getNearestNodeFromDOMNode(
          layoutContainerNodeRef.current,
        );
        if ($isLayoutContainerNode(maybeLayoutContainerNode)) {
          maybeLayoutContainerNode.append(
            $createLayoutItemNode().append($createParagraphNode()),
          );

          const newGridTemplateColumnsValue =
            $getGridTemplateColumnsWithEqualWidth(
              maybeLayoutContainerNode.getChildrenSize(),
            );

          maybeLayoutContainerNode.setTemplateColumns(
            newGridTemplateColumnsValue,
          );
          maybeLayoutContainerNode.selectEnd();
        }
      }
      setShowColumnAction(false);
    });
  }, [editor]);

  // effects
  React.useEffect(() => {
    if (!shouldListenMouseMove) {
      return;
    }

    document.addEventListener('mousemove', debouncedOnMouseMove);

    return () => {
      setShowColumnAction(false);
      debouncedOnMouseMove.cancel();
      document.removeEventListener('mousemove', debouncedOnMouseMove);
    };
  }, [shouldListenMouseMove, debouncedOnMouseMove]);

  React.useEffect(() => {
    return mergeRegister(
      editor.registerMutationListener(
        LayoutContainerNode,
        (mutations) => {
          editor.getEditorState().read(() => {
            for (const [key, type] of mutations) {
              switch (type) {
                case 'created':
                  codeSetRef.current.add(key);
                  setShouldListenMouseMove(codeSetRef.current.size > 0);
                  break;

                case 'destroyed':
                  codeSetRef.current.delete(key);
                  setShouldListenMouseMove(codeSetRef.current.size > 0);
                  break;

                default:
                  break;
              }
            }
          });
        },
        {skipInitialization: false},
      ),
    );
  }, [editor]);

  if (!showColumnAction) {
    return null;
  }

  return (
    <button
      className="PlaygroundEditorTheme__layoutAddColumns"
      onClick={insertAction}
      style={posiitonStyles}
    />
  );
}

const LayoutColumnHoverActions = (props: Props) => {
  const {anchorElem = document.body} = props;

  return createPortal(
    <LayoutColumnHoverActionsContainer anchorElem={anchorElem} />,
    anchorElem,
  );
};

export default LayoutColumnHoverActions;
