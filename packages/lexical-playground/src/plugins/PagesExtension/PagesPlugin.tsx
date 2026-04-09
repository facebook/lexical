/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$wrapNodeInElement} from '@lexical/utils';
import {
  $addUpdateTag,
  $createParagraphNode,
  $getNearestNodeFromDOMNode,
  $getNearestRootOrShadowRoot,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isLeafNode,
  $isRangeSelection,
  $isRootNode,
  COMMAND_PRIORITY_LOW,
  DELETE_CHARACTER_COMMAND,
  HISTORY_MERGE_TAG,
  mergeRegister,
  NodeKey,
  RootNode,
  SELECTION_CHANGE_COMMAND,
  SKIP_SCROLL_INTO_VIEW_TAG,
} from 'lexical';
import {useCallback, useEffect, useRef} from 'react';

import {$isPageBreakNode, PageBreakNode} from '../../nodes/PageBreakNode';
import {
  $createPageNode,
  $getPageSetupNode,
  $isPageNode,
  $isPageSetupNode,
  PAGE_SIZES,
  PageNode,
  PageSetupNode,
} from '../../nodes/PageNode';
import {
  $createPageContentNode,
  $isPageContentNode,
  PageContentNode,
} from '../../nodes/PageNode/PageContentNode';

export function PagesPlugin(): null {
  const [editor] = useLexicalComposerContext();
  const isMountedRef = useRef(false);
  const isTouchedRef = useRef(false);

  const rafIdRef = useRef<number | null>(null);

  const previousPageKeyRef = useRef<NodeKey | null>(null);

  const updateZoom = useCallback(() => {
    const rootElement = editor.getRootElement();
    if (!rootElement) return;
    const PAGE_WIDTH = parseInt(
      rootElement.style.getPropertyValue('--page-width'),
      10,
    );
    if (!PAGE_WIDTH) return;
    const prevZoom = rootElement.style.zoom || '1';
    const rootWidth = rootElement.getBoundingClientRect().width;
    const rootPadding =
      parseFloat(getComputedStyle(rootElement).paddingLeft) * 2;
    const nextZoom = Math.min(
      rootWidth / (PAGE_WIDTH + rootPadding),
      1,
    ).toFixed(6);
    if (nextZoom === prevZoom) return;
    rootElement.style.zoom = nextZoom;
  }, [editor]);

  const updatePageDimensions = useCallback(() => {
    editor.getEditorState().read(() => {
      const pageSetupNode = $getPageSetupNode();
      const rootElement = editor.getRootElement();
      if (!rootElement) return;
      if (pageSetupNode) {
        const {pageSize, orientation, margins} = pageSetupNode.getPageSetup();
        rootElement.dataset.paged = 'true';
        const pageWidth =
          PAGE_SIZES[pageSize][
            orientation === 'portrait' ? 'width' : 'height'
          ] + 'px';
        const pageHeight =
          PAGE_SIZES[pageSize][
            orientation === 'portrait' ? 'height' : 'width'
          ] + 'px';
        rootElement.style.setProperty('--page-width', pageWidth);
        rootElement.style.setProperty('--page-height', pageHeight);
        const marginTop = (margins.top * 96).toFixed(1) + 'px';
        const marginRight = (margins.right * 96).toFixed(1) + 'px';
        const marginBottom = (margins.bottom * 96).toFixed(1) + 'px';
        const marginLeft = (margins.left * 96).toFixed(1) + 'px';
        rootElement.style.setProperty('--page-margin-top', marginTop);
        rootElement.style.setProperty('--page-margin-right', marginRight);
        rootElement.style.setProperty('--page-margin-bottom', marginBottom);
        rootElement.style.setProperty('--page-margin-left', marginLeft);
        updateZoom();
      } else {
        rootElement.style.removeProperty('--page-width');
        rootElement.style.removeProperty('--page-height');
        rootElement.style.removeProperty('--page-margin-top');
        rootElement.style.removeProperty('--page-margin-right');
        rootElement.style.removeProperty('--page-margin-bottom');
        rootElement.style.removeProperty('--page-margin-left');
        rootElement.style.zoom = '';
      }
    });
  }, [editor, updateZoom]);

  const schedulePageMeasurement = useCallback(() => {
    rafIdRef.current = requestAnimationFrame(() => {
      editor.update(
        () => {
          $addUpdateTag(SKIP_SCROLL_INTO_VIEW_TAG);
          const root = $getRoot();
          const children = root.getChildren();
          for (const child of children) {
            if ($isPageNode(child) && child.isMarkedForMeasurement()) {
              child.fixFlow();
            }
          }
        },
        {tag: HISTORY_MERGE_TAG},
      );
    });
  }, [editor]);

  const fixPageStructure = useCallback(() => {
    editor.update(
      () => {
        const pageSetupNode = $getPageSetupNode();
        if (!pageSetupNode) return;
        const root = $getRoot();
        const children = root.getChildren();
        const pages = [] as Array<PageNode | PageBreakNode | PageSetupNode>;
        for (const child of children) {
          if (
            $isPageNode(child) ||
            $isPageBreakNode(child) ||
            $isPageSetupNode(child)
          ) {
            if ($isPageNode(child)) {
              pages.push(child);
              const contentNode = child.getContentNode();
              const pageBreakNode = contentNode
                .getChildren()
                .find($isPageBreakNode);
              if (pageBreakNode) {
                pages.push(pageBreakNode);
                const nextSiblings = pageBreakNode?.getNextSiblings() ?? [];
                const nextPage = child.getNextPage();
                if (nextPage) {
                  for (let i = nextSiblings.length - 1; i >= 0; i--) {
                    nextPage
                      .getContentNode()
                      .getFirstChild()
                      ?.insertBefore(nextSiblings[i]);
                  }
                } else {
                  const newPage = $createPageNode();
                  pages.push(newPage);
                  if (nextSiblings.length > 0) {
                    for (const sibling of nextSiblings) {
                      newPage.getContentNode().append(sibling);
                    }
                  } else {
                    newPage.getContentNode().append($createParagraphNode());
                  }
                }
              }
            } else {
              pages.push(child);
            }
          } else {
            const lastPage = pages[pages.length - 1];
            if ($isPageNode(lastPage)) {
              lastPage.getContentNode().append(child);
            } else {
              const newPage = $createPageNode();
              newPage.getContentNode().append(child);
              pages.push(newPage);
            }
          }
        }
        root.clear();
        root.append(...pages);
        for (const page of pages) {
          if ($isPageNode(page)) {
            page.markForMeasurement();
          }
        }
        if (!pages.some($isPageNode)) {
          const newPage = $createPageNode();
          const paragraph = $createParagraphNode();
          newPage.getContentNode().append(paragraph);
          root.append(newPage);
          paragraph.selectStart();
          newPage.markForMeasurement();
        }
        isTouchedRef.current = true;
        schedulePageMeasurement();
      },
      {
        discrete: true,
        tag: HISTORY_MERGE_TAG,
      },
    );
  }, [editor, schedulePageMeasurement]);

  const resizePages = useCallback(() => {
    editor.read(() => {
      const root = $getRoot();
      const children = root.getChildren();
      PageNode.clearMeasurementFlags();
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (!$isPageNode(child)) continue;
        if ($isPageNode(child.getPreviousSibling())) continue;
        child.markForMeasurement();
      }
      isTouchedRef.current = true;
      schedulePageMeasurement();
    });
  }, [editor, schedulePageMeasurement]);

  const destroyPageStructure = useCallback(() => {
    editor.update(
      () => {
        const root = $getRoot();
        const children = root.getChildren();
        for (const child of children) {
          if ($isPageNode(child)) {
            const contentNode = child.getContentNode();
            contentNode.getChildren().forEach((c) => {
              child.insertBefore(c);
            });
            child.remove();
          }
        }
      },
      {tag: HISTORY_MERGE_TAG},
    );
  }, [editor]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!editor.hasNodes([PageNode])) {
      throw new Error('PagesPlugin: PageNode is not registered on editor');
    }
    if (!editor.hasNodes([PageBreakNode])) {
      throw new Error('PagesPlugin: PageBreakNode is not registered on editor');
    }

    const rootElement = editor.getRootElement();
    if (!rootElement) return;

    const rootObserver = new ResizeObserver(updateZoom);

    const pageObserver = new ResizeObserver((entries) => {
      const pageContent = entries[0].target as HTMLElement;
      const isPaged = rootElement.dataset.paged === 'true';
      if (!isPaged) return;
      editor.read(() => {
        const pageContentNode = $getNearestNodeFromDOMNode(pageContent);
        if (!$isPageContentNode(pageContentNode)) return;
        const pageNode = pageContentNode.getParent();
        if (!$isPageNode(pageNode)) return;
        const previousPage = pageNode.getPreviousPage();
        if (previousPage) {
          previousPage.clearFixedHeight();
          previousPage.markForMeasurement();
        }
        pageNode.markForMeasurement();
        schedulePageMeasurement();
      });
    });

    rootObserver.observe(rootElement);

    const $enforcePageStructure = () => {
      const isEditable = editor.isEditable();
      if (!isEditable) return;
      const pageSetupNode = $getPageSetupNode();
      if (!pageSetupNode) return;
      const root = $getRoot();
      const children = root.getChildren();
      const isInvalid =
        !children.some($isPageNode) ||
        children.some(
          (child) =>
            !$isPageNode(child) &&
            !$isPageBreakNode(child) &&
            !$isPageSetupNode(child),
        ) ||
        children.some(
          (child) =>
            $isPageNode(child) &&
            child.getContentNode().getChildren().some($isPageBreakNode),
        );
      if (isInvalid) {
        queueMicrotask(fixPageStructure);
      }
    };

    const $ensurePageNodeChildren = (pageNode: PageNode) => {
      const children = pageNode.getChildren();
      let content: PageContentNode | undefined;
      const strayChildren: typeof children = [];

      for (const child of children) {
        if ($isPageContentNode(child)) {
          content = child;
        } else {
          if ($isLeafNode(child)) {
            strayChildren.push($wrapNodeInElement(child, $createParagraphNode));
          } else {
            strayChildren.push(child);
          }
        }
      }

      if (content && strayChildren.length === 0) return;

      if (!content) {
        content = $createPageContentNode();
      }
      if (strayChildren.length > 0) {
        content.append(...strayChildren);
      } else {
        content.append($createParagraphNode());
      }
      pageNode.clear();
      pageNode.append(content);
    };

    const removePageTransform = editor.registerNodeTransform(
      PageNode,
      (pageNode) => {
        $ensurePageNodeChildren(pageNode);
        if (!isTouchedRef.current) return;
        const pageSetupNode = $getPageSetupNode();
        if (!pageSetupNode) return;
        if (pageNode.isMarkedForMeasurement()) return;
        pageNode.markForMeasurement();
        schedulePageMeasurement();
      },
    );

    const removeRootTransform = editor.registerNodeTransform(
      RootNode,
      $enforcePageStructure,
    );

    const removePageContentTransform = editor.registerNodeTransform(
      PageContentNode,
      (node) => {
        if (!isTouchedRef.current) return;
        const pageSetupNode = $getPageSetupNode();
        if (!pageSetupNode) return;
        const pageNode = node.getParent();
        if (!$isPageNode(pageNode)) return;
        if (pageNode.isMarkedForMeasurement()) return;
        pageNode.markForMeasurement();
        schedulePageMeasurement();
      },
    );

    const removeCommandListeners = mergeRegister(
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          isTouchedRef.current = true;
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) return false;
          const anchorNode = selection.anchor.getNode();
          if ($isRootNode(anchorNode)) {
            const firstPage = anchorNode.getFirstChild()?.getNextSibling();
            if (!$isPageNode(firstPage)) return false;
            const pageContentKey = firstPage.getContentNode().getKey();
            const isCollapsed = selection.isCollapsed();
            if (selection.anchor.offset === 0) {
              selection.anchor.set(pageContentKey, 0, 'element');
              if (isCollapsed)
                selection.focus.set(pageContentKey, 0, 'element');
            }
            return false;
          }
          const nearestRoot =
            anchorNode.getKey() === 'root'
              ? anchorNode
              : $getNearestRootOrShadowRoot(anchorNode);
          if (!$isPageContentNode(nearestRoot)) return false;
          const currentPage = nearestRoot.getPageNode();
          const currentPageKey = currentPage.getKey();
          const previousPageKey = previousPageKeyRef.current;
          const pageContentElement = currentPage.getPageContentElement();
          if (!pageContentElement) return false;
          previousPageKeyRef.current = currentPageKey;
          pageObserver.observe(pageContentElement);
          if (previousPageKey === null || previousPageKey === currentPageKey)
            return false;
          const previousPage = $getNodeByKey(previousPageKey);
          if (!$isPageNode(previousPage)) return false;
          const previousPageContent = previousPage.getPageContentElement();
          if (!previousPageContent) return false;
          pageObserver.unobserve(previousPageContent);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        DELETE_CHARACTER_COMMAND,
        (isBackward: boolean) => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
            return false;
          }

          const anchorNode = selection.anchor.getNode();
          const nearestRoot =
            anchorNode.getKey() === 'root'
              ? anchorNode
              : $getNearestRootOrShadowRoot(anchorNode);
          if (!$isPageContentNode(nearestRoot)) return false;

          const contentChildrenSize = nearestRoot.getChildrenSize() ?? 0;
          const isEmpty =
            contentChildrenSize === 1 &&
            (nearestRoot.getTextContentSize() ?? 0) === 0;
          if (isEmpty && isBackward) {
            const pageNode = nearestRoot.getPageNode();
            const previousPage = pageNode.getPreviousPage();
            if (!previousPage) return false;
            pageNode.remove();
            previousPage.getContentNode().selectEnd();
            return true;
          }

          if (isBackward && selection.anchor.offset === 0) {
            const topLevelElement = anchorNode.getTopLevelElement();
            if (topLevelElement === null) return false;
            const indexWithinParent = topLevelElement.getIndexWithinParent();
            if (indexWithinParent !== 0) return false;
            const previousSibling = nearestRoot
              .getPageNode()
              .getPreviousSibling();
            if (!$isPageNode(previousSibling)) return false;
            previousSibling.getContentNode().append(topLevelElement);
            topLevelElement.selectStart().deleteCharacter(true);
            return true;
          } else if (
            !isBackward &&
            selection.anchor.offset === anchorNode.getTextContentSize()
          ) {
            const topLevelElement = anchorNode.getTopLevelElement();
            if (topLevelElement === null) return false;
            const indexWithinParent = topLevelElement.getIndexWithinParent();
            if (indexWithinParent !== contentChildrenSize - 1) return false;
            const nextSibling = nearestRoot.getPageNode().getNextSibling();
            if (!$isPageNode(nextSibling)) return false;
            const nextPageContent = nextSibling.getContentNode();
            const nextPageFirstChild = nextPageContent.getFirstChild();
            if (!nextPageFirstChild) return false;
            nearestRoot.append(nextPageFirstChild);
            nextPageFirstChild.selectStart().deleteCharacter(true);
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );

    const removeMutationListeners = mergeRegister(
      editor.registerMutationListener(PageSetupNode, (mutations) => {
        updatePageDimensions();
        const mutation = mutations.values().toArray()[0];
        if (mutation === 'destroyed') destroyPageStructure();
        if (mutation !== 'updated') return;
        const pageSetup = editor.getEditorState().read(() => {
          const node = $getPageSetupNode();
          if (!node) return null;
          return node.getPageSetup();
        });
        if (!pageSetup) return;
        resizePages();
      }),
      editor.registerMutationListener(PageNode, (mutations) => {
        if (!isTouchedRef.current) return;
        for (const [key, mutation] of mutations) {
          if (mutation === 'created' || mutation === 'destroyed') {
            PageNode.markForMeasurement(key);
          }
        }
        schedulePageMeasurement();
      }),
    );

    // Copy page properties to :root before printing so @page can use them
    const PAGE_PROPS = [
      '--page-width',
      '--page-height',
      '--page-margin-top',
      '--page-margin-right',
      '--page-margin-bottom',
      '--page-margin-left',
    ];

    const handleBeforePrint = () => {
      if (rootElement.dataset.paged !== 'true') return;
      for (const prop of PAGE_PROPS) {
        const val = rootElement.style.getPropertyValue(prop);
        if (val) document.documentElement.style.setProperty(prop, val);
      }
    };

    const handleAfterPrint = () => {
      for (const prop of PAGE_PROPS) {
        document.documentElement.style.removeProperty(prop);
      }
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      rootObserver.disconnect();
      pageObserver.disconnect();
      isTouchedRef.current = false;
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      PageNode.clearMeasurementFlags();
      removeCommandListeners();
      removePageTransform();
      removeRootTransform();
      removePageContentTransform();
      removeMutationListeners();
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [
    editor,
    schedulePageMeasurement,
    updateZoom,
    fixPageStructure,
    destroyPageStructure,
    updatePageDimensions,
    resizePages,
  ]);

  return null;
}
