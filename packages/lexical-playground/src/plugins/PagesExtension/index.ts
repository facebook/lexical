/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {effect} from '@lexical/extension';
import {ReactExtension} from '@lexical/react/ReactExtension';
import {$wrapNodeInElement} from '@lexical/utils';
import {
  $addUpdateTag,
  $createParagraphNode,
  $getNearestNodeFromDOMNode,
  $getNearestRootOrShadowRoot,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $getStateChange,
  $isLeafNode,
  $isRangeSelection,
  $isRootNode,
  COMMAND_PRIORITY_LOW,
  defineExtension,
  DELETE_CHARACTER_COMMAND,
  HISTORY_MERGE_TAG,
  mergeRegister,
  NodeKey,
  RootNode,
  SELECTION_CHANGE_COMMAND,
  SKIP_SCROLL_INTO_VIEW_TAG,
} from 'lexical';

import {$isPageBreakNode, PageBreakNode} from '../../nodes/PageBreakNode';
import {
  $createPageNode,
  $getPageSetup,
  $isPageNode,
  PAGE_SIZES,
  PageNode,
  pageSetupState,
} from '../../nodes/PageNode';
import {
  $createPageContentNode,
  $isPageContentNode,
  PageContentNode,
} from '../../nodes/PageNode/PageContentNode';
import {PageSetupDropdownComponent} from './PageSetupDropdown';

export const PagesExtension = defineExtension({
  build: () => {
    const fixedPageHeights = new Map<NodeKey, number>();
    const pagesMarkedForMeasurement = new Set<NodeKey>();

    return {
      $getPagesMarkedForMeasurement: (): PageNode[] => {
        const pages = [];
        for (const key of pagesMarkedForMeasurement) {
          const page = $getNodeByKey(key);
          if ($isPageNode(page) && page.isAttached()) {
            pages.push(page);
          }
        }
        return pages;
      },
      Component: PageSetupDropdownComponent,
      clearFixedHeight: (node: PageNode) =>
        fixedPageHeights.delete(node.getKey()),
      clearMeasurementFlag: (node: PageNode) => {
        pagesMarkedForMeasurement.delete(node.getKey());
      },
      clearMeasurementFlags: (): void => {
        fixedPageHeights.clear();
        pagesMarkedForMeasurement.clear();
      },
      getFixedHeight: (node: PageNode): number | undefined =>
        fixedPageHeights.get(node.getKey()),
      isMarkedForMeasurement: (node: PageNode) =>
        pagesMarkedForMeasurement.has(node.getKey()),
      markForMeasurement: (node: PageNode) => {
        pagesMarkedForMeasurement.add(node.getKey());
      },
      markForMeasurementByKey: (key: NodeKey) => {
        pagesMarkedForMeasurement.add(key);
      },
      setFixedHeight: (node: PageNode, height: number) =>
        fixedPageHeights.set(node.getKey(), height),
    };
  },
  dependencies: [ReactExtension],
  name: '@lexical/playground/Pages',
  nodes: () => [PageNode, PageContentNode],
  register: (editor, config, state) => {
    let isTouched = false;
    let rafId: number | null = null;
    let previousPageKey: NodeKey | null = null;
    const {
      $getPagesMarkedForMeasurement,
      markForMeasurement,
      isMarkedForMeasurement,
      markForMeasurementByKey,
      clearMeasurementFlags,
      clearFixedHeight,
    } = state.getOutput();

    const updateZoom = () => {
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
    };

    const updatePageDimensions = () => {
      editor.getEditorState().read(() => {
        const pageSetup = $getPageSetup();
        const rootElement = editor.getRootElement();
        if (!rootElement) return;
        if (pageSetup) {
          const {pageSize, orientation, margins} = pageSetup;
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
    };

    const schedulePageMeasurement = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(() => {
        editor.update(() => {
          const pages = $getPagesMarkedForMeasurement();
          if (pages.length === 0) {
            return;
          }
          $addUpdateTag(SKIP_SCROLL_INTO_VIEW_TAG);
          $addUpdateTag(HISTORY_MERGE_TAG);
          for (const page of pages) {
            page.fixFlow();
          }
        });
      });
    };

    const fixPageStructure = () => {
      editor.update(
        () => {
          const root = $getRoot();
          const children = root.getChildren();
          const pages = [] as Array<PageNode | PageBreakNode>;
          for (const child of children) {
            if ($isPageNode(child) || $isPageBreakNode(child)) {
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
          root.splice(0, root.getChildrenSize(), pages);
          for (const page of pages) {
            if ($isPageNode(page)) {
              markForMeasurement(page);
            }
          }
          if (!pages.some($isPageNode)) {
            const newPage = $createPageNode();
            const paragraph = $createParagraphNode();
            newPage.getContentNode().append(paragraph);
            root.append(newPage);
            paragraph.selectStart();
            markForMeasurement(newPage);
          }

          isTouched = true;
          schedulePageMeasurement();
        },
        {
          discrete: true,
          tag: HISTORY_MERGE_TAG,
        },
      );
    };

    const resizePages = () => {
      editor.read(() => {
        const root = $getRoot();
        const children = root.getChildren();
        clearMeasurementFlags();
        for (let i = 0; i < children.length; i++) {
          const child = children[i];
          if (!$isPageNode(child)) continue;
          if ($isPageNode(child.getPreviousSibling())) continue;
          markForMeasurement(child);
        }
        isTouched = true;
        schedulePageMeasurement();
      });
    };

    const destroyPageStructure = () => {
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
    };

    return editor.registerRootListener((rootElement) => {
      if (!rootElement) {
        return;
      }
      return effect(() => {
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
              clearFixedHeight(previousPage);
              markForMeasurement(previousPage);
            }
            markForMeasurement(pageNode);
            schedulePageMeasurement();
          });
        });

        rootObserver.observe(rootElement);

        const $enforcePageStructure = () => {
          const isEditable = editor.isEditable();
          if (!isEditable || $getPageSetup() === null) return;
          const root = $getRoot();
          const children = root.getChildren();
          const isInvalid =
            !children.some($isPageNode) ||
            children.some(
              (child) => !$isPageNode(child) && !$isPageBreakNode(child),
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
                strayChildren.push(
                  $wrapNodeInElement(child, $createParagraphNode),
                );
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
            if (!isTouched) return;
            if (isMarkedForMeasurement(pageNode)) return;
            markForMeasurement(pageNode);
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
            if (!isTouched) return;
            const pageNode = node.getParent();
            if (!$isPageNode(pageNode)) return;
            if (isMarkedForMeasurement(pageNode)) return;
            markForMeasurement(pageNode);
            schedulePageMeasurement();
          },
        );

        const removeCommandListeners = mergeRegister(
          editor.registerCommand(
            SELECTION_CHANGE_COMMAND,
            () => {
              isTouched = true;
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
              const oldPreviousPageKey = previousPageKey;
              const pageContentElement = currentPage.getPageContentElement();
              if (!pageContentElement) return false;
              previousPageKey = currentPageKey;
              pageObserver.observe(pageContentElement);
              if (
                oldPreviousPageKey === null ||
                oldPreviousPageKey === currentPageKey
              )
                return false;
              const previousPage = $getNodeByKey(oldPreviousPageKey);
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
                const indexWithinParent =
                  topLevelElement.getIndexWithinParent();
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
                const indexWithinParent =
                  topLevelElement.getIndexWithinParent();
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
          editor.registerMutationListener(
            RootNode,
            (_mutations, {prevEditorState}) => {
              const change = $getStateChange(
                editor.getEditorState().read($getRoot),
                prevEditorState.read($getRoot),
                pageSetupState,
              );
              if (!change) {
                return;
              }
              const [pageState, _prevPageState] = change;
              if (!pageState) {
                destroyPageStructure();
                return;
              }
              updatePageDimensions();
              resizePages();
            },
          ),
          editor.registerMutationListener(PageNode, (mutations) => {
            if (!isTouched) return;
            for (const [key, mutation] of mutations) {
              if (mutation === 'created' || mutation === 'destroyed') {
                markForMeasurementByKey(key);
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
          isTouched = false;
          if (rafId !== null) {
            cancelAnimationFrame(rafId);
          }
          clearMeasurementFlags();
          removeCommandListeners();
          removePageTransform();
          removeRootTransform();
          removePageContentTransform();
          removeMutationListeners();
          window.removeEventListener('beforeprint', handleBeforePrint);
          window.removeEventListener('afterprint', handleAfterPrint);
        };
      });
    });
  },
});
