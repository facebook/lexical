/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorConfig, LexicalEditor, LexicalNode, NodeKey} from 'lexical';

import './ImageNode.css';

import {
  CollaborationPlugin,
  useCollaborationContext,
} from '@lexical/react/LexicalCollaborationPlugin';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import HashtagsPlugin from '@lexical/react/LexicalHashtagPlugin';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import LinkPlugin from '@lexical/react/LexicalLinkPlugin';
import LexicalNestedComposer from '@lexical/react/LexicalNestedComposer';
import RichTextPlugin from '@lexical/react/LexicalRichTextPlugin';
import TablesPlugin from '@lexical/react/LexicalTablePlugin';
import useLexicalNodeSelection from '@lexical/react/useLexicalNodeSelection';
import {mergeRegister} from '@lexical/utils';
import {
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  createEditor,
  DecoratorNode,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
} from 'lexical';
import * as React from 'react';
import {Suspense, useCallback, useEffect, useRef, useState} from 'react';

import {createWebsocketProvider} from '../collaboration';
import {useSettings} from '../context/SettingsContext';
import {useSharedHistoryContext} from '../context/SharedHistoryContext';
import EmojisPlugin from '../plugins/EmojisPlugin';
import ImagesPlugin from '../plugins/ImagesPlugin';
import KeywordsPlugin from '../plugins/KeywordsPlugin';
import MentionsPlugin from '../plugins/MentionsPlugin';
import TableCellActionMenuPlugin from '../plugins/TableActionMenuPlugin';
import TreeViewPlugin from '../plugins/TreeViewPlugin';
import ContentEditable from '../ui/ContentEditable';
import Placeholder from '../ui/Placeholder';

const imageCache = new Set();

function useSuspenseImage(src: string) {
  if (!imageCache.has(src)) {
    throw new Promise((resolve) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        imageCache.add(src);
        resolve();
      };
    });
  }
}

function LazyImage({
  altText,
  className,
  imageRef,
  src,
  width,
  height,
  maxWidth,
}: {
  altText: string,
  className: ?string,
  height: 'inherit' | number,
  imageRef: {current: null | HTMLElement},
  maxWidth: number,
  src: string,
  width: 'inherit' | number,
}): React.Node {
  useSuspenseImage(src);
  return (
    <img
      className={className}
      src={src}
      alt={altText}
      ref={imageRef}
      style={{
        height,
        maxWidth,
        width,
      }}
    />
  );
}

function ImageResizer({
  onResizeStart,
  onResizeEnd,
  imageRef,
  editor,
  showCaption,
  setShowCaption,
}: {
  editor: LexicalEditor,
  imageRef: {current: null | HTMLElement},
  onResizeEnd: ('inherit' | number, 'inherit' | number) => void,
  onResizeStart: () => void,
  setShowCaption: (boolean) => void,
  showCaption: boolean,
}): React.Node {
  const buttonRef = useRef(null);
  const positioningRef = useRef<{
    currentHeight: 'inherit' | number,
    currentWidth: 'inherit' | number,
    direction: 0 | 1 | 2 | 3,
    isResizing: boolean,
    ratio: number,
    startHeight: number,
    startWidth: number,
    startX: number,
    startY: number,
  }>({
    currentHeight: 0,
    currentWidth: 0,
    direction: 0,
    isResizing: false,
    ratio: 0,
    startHeight: 0,
    startWidth: 0,
    startX: 0,
    startY: 0,
  });
  const editorRootElement = editor.getRootElement();
  // Find max width, accounting for editor padding.
  const maxWidthContainer =
    editorRootElement !== null
      ? editorRootElement.getBoundingClientRect().width - 20
      : 100;

  const handlePointerDown = (event: PointerEvent, direction: 0 | 1 | 2 | 3) => {
    const image = imageRef.current;
    if (image !== null) {
      const {width, height} = image.getBoundingClientRect();
      const positioning = positioningRef.current;
      positioning.startWidth = width;
      positioning.startHeight = height;
      positioning.ratio = width / height;
      positioning.currentWidth = 'inherit';
      positioning.currentHeight = 'inherit';
      positioning.startX = event.clientX;
      positioning.startY = event.clientY;
      positioning.isResizing = true;
      positioning.direction = direction;
      onResizeStart();
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
    }
  };
  const handlePointerMove = (event: PointerEvent) => {
    const image = imageRef.current;
    const positioning = positioningRef.current;

    if (image !== null && positioning.isResizing) {
      if (positioning.direction === 3) {
        const diff = Math.floor(positioning.startY - event.clientY) * 2;
        const minHeight = 150 * positioning.ratio;
        const maxHeight = maxWidthContainer / positioning.ratio;
        let height = positioning.startHeight + diff;
        if (height < minHeight) {
          height = minHeight;
        } else if (height > maxHeight) {
          height = maxHeight;
        }
        image.style.width = `inherit`;
        image.style.height = `${height}px`;
        positioning.currentHeight = height;
      } else if (positioning.direction === 2) {
        const diff = Math.floor(event.clientY - positioning.startY);
        const minHeight = 150 * positioning.ratio;
        const maxHeight = maxWidthContainer / positioning.ratio;
        let height = positioning.startHeight + diff;
        if (height < minHeight) {
          height = minHeight;
        } else if (height > maxHeight) {
          height = maxHeight;
        }
        image.style.width = `inherit`;
        image.style.height = `${height}px`;
        positioning.currentHeight = height;
      } else {
        const diff = Math.floor(event.clientX - positioning.startX);
        const minWidth = 150 * positioning.ratio;
        const maxWidth = maxWidthContainer;
        let width = positioning.startWidth + diff;
        if (width < minWidth) {
          width = minWidth;
        } else if (width > maxWidth) {
          width = maxWidth;
        }
        image.style.width = `${width}px`;
        image.style.height = `inherit`;
        positioning.currentWidth = width;
      }
    }
  };
  const handlePointerUp = (_event: PointerEvent) => {
    const image = imageRef.current;
    const positioning = positioningRef.current;
    if (image !== null && positioning.isResizing) {
      const width = positioning.currentWidth;
      const height = positioning.currentHeight;
      positioning.startWidth = 0;
      positioning.startHeight = 0;
      positioning.ratio = 0;
      positioning.startX = 0;
      positioning.startY = 0;
      positioning.currentWidth = 0;
      positioning.currentHeight = 0;
      positioning.isResizing = false;
      onResizeEnd(width, height);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    }
  };
  return (
    <>
      {!showCaption && (
        <button
          className="image-caption-button"
          ref={buttonRef}
          onClick={() => {
            setShowCaption(!showCaption);
          }}>
          Add Caption
        </button>
      )}
      <div
        className="image-resizer-ne"
        onPointerDown={(event) => {
          handlePointerDown(event, 0);
        }}
      />
      <div
        className="image-resizer-se"
        onPointerDown={(event) => {
          handlePointerDown(event, 1);
        }}
      />
      <div
        className="image-resizer-sw"
        onPointerDown={(event) => {
          handlePointerDown(event, 2);
        }}
      />
      <div
        className="image-resizer-nw"
        onPointerDown={(event) => {
          handlePointerDown(event, 3);
        }}
      />
    </>
  );
}

function ImageComponent({
  src,
  altText,
  nodeKey,
  width,
  height,
  maxWidth,
  resizable,
  showCaption,
  caption,
}: {
  altText: string,
  caption: LexicalEditor,
  height: 'inherit' | number,
  maxWidth: number,
  nodeKey: NodeKey,
  resizable: boolean,
  showCaption: boolean,
  src: string,
  width: 'inherit' | number,
}): React.Node {
  const ref = useRef(null);
  const [isSelected, setSelected, clearSelection] =
    useLexicalNodeSelection(nodeKey);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const {yjsDocMap} = useCollaborationContext();
  const [editor] = useLexicalComposerContext();
  const isCollab = yjsDocMap.get('main') !== undefined;
  const [selection, setSelection] = useState(null);

  const onDelete = useCallback(
    (payload) => {
      if (isSelected && $isNodeSelection($getSelection())) {
        const event: KeyboardEvent = payload;
        event.preventDefault();
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if ($isImageNode(node)) {
            node.remove();
          }
          setSelected(false);
        });
        URL.revokeObjectURL(src);
      }
      return false;
    },
    [editor, isSelected, nodeKey, setSelected, src],
  );

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({editorState}) => {
        setSelection(editorState.read(() => $getSelection()));
      }),
      editor.registerCommand(
        CLICK_COMMAND,
        (payload) => {
          const event: MouseEvent = payload;

          if (isResizing) {
            return true;
          }
          if (event.target === ref.current) {
            if (!event.shiftKey) {
              clearSelection();
            }
            setSelected(!isSelected);
            return true;
          }

          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_DELETE_COMMAND,
        onDelete,
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        onDelete,
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [
    clearSelection,
    editor,
    isResizing,
    isSelected,
    nodeKey,
    onDelete,
    setSelected,
  ]);

  const setShowCaption = useCallback(() => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isImageNode(node)) {
        node.setShowCaption(true);
      }
    });
  }, [editor, nodeKey]);

  const onResizeEnd = useCallback(
    (nextWidth, nextHeight) => {
      const rootElement = editor.getRootElement();
      if (rootElement !== null) {
        rootElement.style.setProperty('cursor', 'default');
      }

      // Delay hiding the resize bars for click case
      setTimeout(() => {
        setIsResizing(false);
      }, 200);

      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isImageNode(node)) {
          node.setWidthAndHeight(nextWidth, nextHeight);
        }
      });
    },
    [editor, nodeKey],
  );

  const onResizeStart = useCallback(() => {
    const rootElement = editor.getRootElement();
    if (rootElement !== null) {
      rootElement.style.setProperty('cursor', 'nwse-resize', 'important');
    }
    setIsResizing(true);
  }, [editor]);

  const {historyState} = useSharedHistoryContext();
  const {
    settings: {showNestedEditorTreeView},
  } = useSettings();

  return (
    <Suspense fallback={null}>
      <>
        <LazyImage
          className={isSelected || isResizing ? 'focused' : null}
          src={src}
          altText={altText}
          imageRef={ref}
          width={width}
          height={height}
          maxWidth={maxWidth}
        />
        {showCaption && (
          <div className="image-caption-container">
            <LexicalNestedComposer initialEditor={caption}>
              <MentionsPlugin />
              <TablesPlugin />
              <TableCellActionMenuPlugin />
              <ImagesPlugin />
              <LinkPlugin />
              <EmojisPlugin />
              <HashtagsPlugin />
              <KeywordsPlugin />
              {isCollab ? (
                <CollaborationPlugin
                  id={caption.getKey()}
                  providerFactory={createWebsocketProvider}
                  shouldBootstrap={true}
                />
              ) : (
                <HistoryPlugin externalHistoryState={historyState} />
              )}
              <RichTextPlugin
                contentEditable={
                  <ContentEditable className="ImageNode__contentEditable" />
                }
                placeholder={
                  <Placeholder className="ImageNode__placeholder">
                    Enter a caption...
                  </Placeholder>
                }
                initialEditorState={null}
              />
              {showNestedEditorTreeView && <TreeViewPlugin />}
            </LexicalNestedComposer>
          </div>
        )}
        {resizable &&
          $isNodeSelection(selection) &&
          (isSelected || isResizing) && (
            <ImageResizer
              showCaption={showCaption}
              setShowCaption={setShowCaption}
              editor={editor}
              imageRef={ref}
              onResizeStart={onResizeStart}
              onResizeEnd={onResizeEnd}
            />
          )}
      </>
    </Suspense>
  );
}

export class ImageNode extends DecoratorNode<React$Node> {
  __src: string;
  __altText: string;
  __width: 'inherit' | number;
  __height: 'inherit' | number;
  __maxWidth: number;
  __showCaption: boolean;
  __caption: LexicalEditor;

  static getType(): string {
    return 'image';
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__maxWidth,
      node.__width,
      node.__height,
      node.__showCaption,
      node.__caption,
      node.__key,
    );
  }

  constructor(
    src: string,
    altText: string,
    maxWidth: number,
    width?: 'inherit' | number,
    height?: 'inherit' | number,
    showCaption?: boolean,
    caption?: LexicalEditor,
    key?: NodeKey,
  ) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__maxWidth = maxWidth;
    this.__width = width || 'inherit';
    this.__height = height || 'inherit';
    this.__showCaption = showCaption || false;
    this.__caption = caption || createEditor();
  }

  setWidthAndHeight(
    width: 'inherit' | number,
    height: 'inherit' | number,
  ): void {
    const writable = this.getWritable();
    writable.__width = width;
    writable.__height = height;
  }

  setShowCaption(showCaption: boolean): void {
    const writable = this.getWritable();
    writable.__showCaption = showCaption;
  }

  // View

  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const span = document.createElement('span');
    const theme = config.theme;
    const className = theme.image;
    if (className !== undefined) {
      span.className = className;
    }
    return span;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): React$Node {
    return (
      <ImageComponent
        src={this.__src}
        altText={this.__altText}
        width={this.__width}
        height={this.__height}
        maxWidth={this.__maxWidth}
        nodeKey={this.getKey()}
        showCaption={this.__showCaption}
        caption={this.__caption}
        resizable={true}
      />
    );
  }
}

export function $createImageNode(
  src: string,
  altText: string,
  maxWidth: number,
): ImageNode {
  return new ImageNode(src, altText, maxWidth);
}

export function $isImageNode(node: ?LexicalNode): boolean %checks {
  return node instanceof ImageNode;
}
