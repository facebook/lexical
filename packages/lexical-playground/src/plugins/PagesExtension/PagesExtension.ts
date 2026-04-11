/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {effect, watchedSignal} from '@lexical/extension';
import {
  $addUpdateTag,
  $createParagraphNode,
  $getNearestNodeFromDOMNode,
  $getNearestRootOrShadowRoot,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $getStateChange,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  defineExtension,
  DELETE_CHARACTER_COMMAND,
  HISTORY_MERGE_TAG,
  mergeRegister,
  NodeKey,
  RootNode,
  safeCast,
  SELECTION_CHANGE_COMMAND,
  SKIP_SCROLL_INTO_VIEW_TAG,
} from 'lexical';

import {$isPageBreakNode, PageBreakNode} from '../../nodes/PageBreakNode';
import {PageBreakExtension} from '../PageBreakExtension';
import {PageSetupDropdownComponent} from '../PagesReactExtension/PageSetupDropdown';
import {PAGE_SIZES} from './constants';
import {
  $createPageContentNode,
  $isPageContentNode,
  PageContentNode,
} from './PageContentNode';
import {$createPageNode, $isPageNode, PageNode} from './PageNode';
import {$getPageSetup, pageSetupState} from './pageSetup';

export interface PagesConfig {
  pageContentClass: string;
  pageClass: string;
}

export const PagesExtension = defineExtension({
  build: (editor) => {
    const fixedPageHeights = new Map<NodeKey, number>();
    const pagesMarkedForMeasurement = new Set<NodeKey>();
    const getPageSetup = () => editor.getEditorState().read($getPageSetup);

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
      pageSetup: watchedSignal(getPageSetup, (pageSetupSignal) =>
        editor.registerMutationListener(RootNode, () => {
          pageSetupSignal.value = getPageSetup();
        }),
      ),
      setFixedHeight: (node: PageNode, height: number) =>
        fixedPageHeights.set(node.getKey(), height),
    };
  },
  config: safeCast<PagesConfig>({
    pageClass: 'PlaygroundEditorTheme__page',
    pageContentClass: 'PlaygroundEditorTheme__pageContent',
  }),
  dependencies: [PageBreakExtension],
  name: '@lexical/playground/Pages',
  nodes: () => [PageNode, PageContentNode],
  register: (editor, config, state) => {
    let rafId: number | null = null;
    let previousPageKey: NodeKey | null = null;
    const {
      $getPagesMarkedForMeasurement,
      markForMeasurement,
      isMarkedForMeasurement,
      clearMeasurementFlags,
      clearFixedHeight,
    } = state.getOutput();

    // Scales the editor so that pages fit within the available root width
    // without horizontal scrolling, capped at 1x zoom.
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

    // Reads the current page setup (size, orientation, margins) and applies
    // the corresponding CSS custom properties to the root element, or removes
    // them when paged mode is disabled.
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

    // Debounces page re-flow via requestAnimationFrame: on the next frame,
    // runs fixFlow() on every page marked for measurement to redistribute
    // content that overflows or underflows a page's available height.
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

    // Ensures all root-level children are properly wrapped in PageNodes.
    // Moves stray content into the nearest page, handles PageBreakNodes by
    // splitting content across pages, and creates a default empty page if none exist.
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

          schedulePageMeasurement();
        },
        {
          discrete: true,
        },
      );
    };

    // Marks the first page of each page-break group for measurement and
    // schedules re-flow, used when page dimensions change and all pages
    // need to be re-measured.
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
        schedulePageMeasurement();
      });
    };

    // Removes all PageNode wrappers, moving their content back to the root
    // as direct children. Used when paged mode is turned off.
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

        // Root transform callback: checks whether the root's children are
        // valid (all PageNodes, no stray content, no PageBreakNodes inside
        // PageContentNodes). If invalid, queues fixPageStructure as a microtask.
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

        // Normalizes a PageNode so it has exactly one PageContentNode child.
        // Any stray children (e.g. from paste) are moved into the content node,
        const $ensurePageNodeChildren = (pageNode: PageNode) => {
          const children = pageNode.getChildren();
          let content: PageContentNode | undefined;
          const strayChildren: typeof children = [];

          for (const child of children) {
            if ($isPageContentNode(child)) {
              content = child;
            } else {
              strayChildren.push(child);
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

        // When a PageNode changes, ensure its structure is valid and
        // schedule measurement to fix overflow/underflow before next paint.
        const removePageTransform = editor.registerNodeTransform(
          PageNode,
          (pageNode) => {
            $ensurePageNodeChildren(pageNode);
            if (isMarkedForMeasurement(pageNode)) return;
            markForMeasurement(pageNode);
            schedulePageMeasurement();
          },
        );

        const removeRootTransform = editor.registerNodeTransform(
          RootNode,
          $enforcePageStructure,
        );

        // When PageContentNode content changes, mark its parent page for
        // re-measurement so overflow/underflow is corrected.
        const removePageContentTransform = editor.registerNodeTransform(
          PageContentNode,
          (node) => {
            const pageNode = node.getPageNode();
            if (isMarkedForMeasurement(pageNode)) return;
            markForMeasurement(pageNode);
            schedulePageMeasurement();
          },
        );

        const removeCommandListeners = mergeRegister(
          // Tracks the currently focused page so a ResizeObserver can watch
          // only its content element, avoiding unnecessary observation of
          // every page. Unobserves the previous page when focus moves.
          editor.registerCommand(
            SELECTION_CHANGE_COMMAND,
            () => {
              const selection = $getSelection();
              if (!$isRangeSelection(selection)) return false;
              const anchorNode = selection.anchor.getNode();
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
          // Handles character deletion at page boundaries: backspace at the
          // start of a page merges content into the previous page, and forward
          // delete at the end pulls content from the next page. Also handles
          // removing an empty page on backspace.
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
          // Watches for page setup changes on the root node. When setup is
          // removed, destroys the page structure; when it changes, updates
          // CSS dimensions and triggers a full page resize.
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
              } else {
                updatePageDimensions();
                resizePages();
              }
            },
          ),
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

        // Copies page CSS custom properties to :root so CSS @page rules
        // (which can't read properties from arbitrary elements) pick them up.
        const handleBeforePrint = () => {
          if (rootElement.dataset.paged !== 'true') return;
          for (const prop of PAGE_PROPS) {
            const val = rootElement.style.getPropertyValue(prop);
            if (val) document.documentElement.style.setProperty(prop, val);
          }
        };

        // Cleans up :root CSS custom properties after printing completes.
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
