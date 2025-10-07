/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {$sliceSelectedTextNodeContent} from '@lexical/selection';
import {
  $getEditor,
  $getEditorDOMConfig,
  $getRoot,
  $isElementNode,
  $isTextNode,
  type BaseSelection,
  type EditorDOMConfig,
  isDocumentFragment,
  isHTMLElement,
  type LexicalEditor,
  type LexicalNode,
} from 'lexical';
import invariant from 'shared/invariant';

import {
  $withDOMContext,
  DOMContextExport,
  DOMContextRoot,
} from './ContextRecord';

export function $generateDOMFromNodes<T extends HTMLElement | DocumentFragment>(
  container: T,
  selection: null | BaseSelection = null,
  editor: LexicalEditor = $getEditor(),
): T {
  return $withDOMContext(
    [DOMContextExport.pair(true)],
    editor,
  )(() => {
    const root = $getRoot();
    const domConfig = $getEditorDOMConfig(editor);

    const parentElementAppend = container.append.bind(container);
    for (const topLevelNode of root.getChildren()) {
      $appendNodesToHTML(
        editor,
        topLevelNode,
        parentElementAppend,
        selection,
        domConfig,
      );
    }
    return container;
  });
}

export function $generateDOMFromRoot<T extends HTMLElement | DocumentFragment>(
  container: T,
  root: LexicalNode = $getRoot(),
): T {
  const editor = $getEditor();
  return $withDOMContext(
    [DOMContextExport.pair(true), DOMContextRoot.pair(true)],
    editor,
  )(() => {
    const selection = null;
    const domConfig = $getEditorDOMConfig(editor);
    const parentElementAppend = container.append.bind(container);
    $appendNodesToHTML(editor, root, parentElementAppend, selection, domConfig);
    return container;
  });
}
function $appendNodesToHTML(
  editor: LexicalEditor,
  currentNode: LexicalNode,
  parentElementAppend: (element: Node) => void,
  selection: BaseSelection | null = null,
  domConfig: EditorDOMConfig = $getEditorDOMConfig(editor),
): boolean {
  let shouldInclude = domConfig.$shouldInclude(currentNode, selection, editor);
  const shouldExclude = domConfig.$shouldExclude(
    currentNode,
    selection,
    editor,
  );
  let target = currentNode;

  if (selection !== null && $isTextNode(currentNode)) {
    target = $sliceSelectedTextNodeContent(selection, currentNode, 'clone');
  }
  const exportProps = domConfig.$exportDOM(target, editor);
  const {element, after, append, $getChildNodes} = exportProps;

  if (!element) {
    return false;
  }

  const fragment = document.createDocumentFragment();
  const children = $getChildNodes
    ? $getChildNodes()
    : $isElementNode(target)
      ? target.getChildren()
      : [];

  const fragmentAppend = fragment.append.bind(fragment);
  for (const childNode of children) {
    const shouldIncludeChild = $appendNodesToHTML(
      editor,
      childNode,
      fragmentAppend,
      selection,
      domConfig,
    );

    if (
      !shouldInclude &&
      shouldIncludeChild &&
      domConfig.$extractWithChild(
        currentNode,
        childNode,
        selection,
        'html',
        editor,
      )
    ) {
      shouldInclude = true;
    }
  }

  if (shouldInclude && !shouldExclude) {
    if (isHTMLElement(element) || isDocumentFragment(element)) {
      if (append) {
        append(fragment);
      } else {
        element.append(fragment);
      }
    }
    parentElementAppend(element);

    if (after) {
      const newElement = after.call(target, element);
      if (newElement) {
        if (isDocumentFragment(element)) {
          element.replaceChildren(newElement);
        } else {
          element.replaceWith(newElement);
        }
      }
    }
  } else {
    parentElementAppend(fragment);
  }

  return shouldInclude;
}

export function $generateHtmlFromNodes(
  editor: LexicalEditor,
  selection: BaseSelection | null = null,
): string {
  if (
    typeof document === 'undefined' ||
    (typeof window === 'undefined' && typeof global.window === 'undefined')
  ) {
    invariant(
      false,
      'To use $generateHtmlFromNodes in headless mode please initialize a headless browser implementation such as JSDom or use withDOM from @lexical/headless/dom before calling this function.',
    );
  }
  return $generateDOMFromNodes(document.createElement('div'), selection, editor)
    .innerHTML;
}
