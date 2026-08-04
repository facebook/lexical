/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor, NodeKey} from 'lexical';

import * as React from 'react';
import {type JSX, Suspense, useEffect, useMemo, useState} from 'react';
import {createPortal, flushSync} from 'react-dom';

import useLayoutEffect from './useLayoutEffect';

type ErrorBoundaryProps = {
  children: JSX.Element;
  onError: (error: Error) => void;
};

export type ErrorBoundaryType =
  | React.ComponentClass<ErrorBoundaryProps>
  | React.FC<ErrorBoundaryProps>;

export function useDecorators(
  editor: LexicalEditor,
  ErrorBoundary: ErrorBoundaryType,
): JSX.Element[] {
  const [decorators, setDecorators] = useState<Record<NodeKey, JSX.Element>>(
    () => editor.getDecorators<JSX.Element>(),
  );
  // decorate() / decorator listeners can run before setRootElement attaches the
  // contenteditable. Portals skip when getElementByKey is still null; without a
  // follow-up recompute they stay missing after the root remounts.
  const [rootElement, setRootElement] = useState(() => editor.getRootElement());

  // Subscribe to changes
  useLayoutEffect(() => {
    return editor.registerDecoratorListener<JSX.Element>(nextDecorators => {
      flushSync(() => {
        setDecorators(nextDecorators);
      });
    });
  }, [editor]);

  useEffect(() => {
    // If the content editable mounts before the subscription is added, then
    // nothing will be rendered on initial pass. We can get around that by
    // ensuring that we set the value.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDecorators(editor.getDecorators());
  }, [editor]);

  useLayoutEffect(() => {
    return editor.registerRootListener((nextRootElement, prevRootElement) => {
      if (nextRootElement !== prevRootElement) {
        setRootElement(nextRootElement);
      }
    });
  }, [editor]);

  // Return decorators defined as React Portals
  return useMemo(() => {
    const decoratedPortals = [];
    const decoratorKeys = Object.keys(decorators);

    for (let i = 0; i < decoratorKeys.length; i++) {
      const nodeKey = decoratorKeys[i];
      const reactDecorator = (
        <ErrorBoundary onError={e => editor._onError(e)}>
          <Suspense fallback={null}>{decorators[nodeKey]}</Suspense>
        </ErrorBoundary>
      );
      const element = editor.getElementByKey(nodeKey);

      if (element !== null) {
        decoratedPortals.push(createPortal(reactDecorator, element, nodeKey));
      }
    }

    return decoratedPortals;
  }, [ErrorBoundary, decorators, editor, rootElement]);
}
