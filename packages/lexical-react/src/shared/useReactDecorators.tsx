/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor, NodeKey} from 'lexical';

import {Suspense, useEffect, useMemo, useState} from 'react';
import {createPortal, flushSync} from 'react-dom';
import invariant from 'shared/invariant';
import useLayoutEffect from 'shared/useLayoutEffect';

import {type ErrorBoundaryType} from './types';

/** @internal */
export function useReactDecorators(
  editor: LexicalEditor,
  ErrorBoundary: ErrorBoundaryType,
): JSX.Element[] {
  const [decorators, setDecorators] = useState<Record<NodeKey, JSX.Element>>(
    () => editor.getDecorators<JSX.Element>(),
  );

  // Subscribe to changes
  useLayoutEffect(() => {
    return editor.registerDecoratorListener<JSX.Element>((nextDecorators) => {
      flushSync(() => {
        setDecorators(nextDecorators);
      });
    });
  }, [editor]);

  useEffect(() => {
    // If the content editable mounts before the subscription is added, then
    // nothing will be rendered on initial pass. We can get around that by
    // ensuring that we set the value.
    setDecorators(editor.getDecorators());
  }, [editor]);

  // Return decorators defined as React Portals
  return useMemo(() => {
    const decoratedPortals = [];
    const decoratorKeys = Object.keys(decorators);

    for (let i = 0; i < decoratorKeys.length; i++) {
      const nodeKey = decoratorKeys[i];
      invariant(
        nodeKey !== undefined,
        'useReactDecorators: decoratorKeys[%s] must be defined',
        String(i),
      );
      const element = editor.getElementByKey(nodeKey);

      if (element !== null) {
        const reactDecorator = (
          <ErrorBoundary
            onError={(e) => {
              editor._onError(e);
            }}>
            <Suspense fallback={null}>{decorators[nodeKey]}</Suspense>
          </ErrorBoundary>
        );
        decoratedPortals.push(createPortal(reactDecorator, element, nodeKey));
      }
    }

    return decoratedPortals;
  }, [ErrorBoundary, decorators, editor]);
}
