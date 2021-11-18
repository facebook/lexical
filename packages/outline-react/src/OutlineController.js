/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor, EditorState, EditorThemeClasses} from 'outline';

import * as React from 'react';
import {createContext as createReactContext, useContext, useMemo} from 'react';
import {createEditor} from 'outline';
import invariant from 'shared/invariant';

type ControllerContext<Context, SharedContext> =
  | null
  | [OutlineEditor, Context, null | SharedContext];

export type Controller<Context, SharedContext> = {
  ({children: React$Node}): React$Node,
  __context: React$Context<ControllerContext<Context, SharedContext>>,
};

export function createController<Context, SharedContext>(
  createContext: () => Context,
  createSharedContext: () => SharedContext,
  editorConfig?: {
    initialEditorState?: EditorState,
    theme?: EditorThemeClasses,
  },
): Controller<Context, SharedContext> {
  const ControllerContextInternal =
    createReactContext<ControllerContext<Context, SharedContext>>(null);

  function ControllerComponent({children}) {
    const existingController = useContext(ControllerContextInternal);
    const controllerContext = useMemo(() => {
      const context: Context = createContext();
      const editor = createEditor<Context>({
        ...editorConfig,
        context,
      });
      let sharedContextValue: SharedContext | null = null;
      // Create shared context
      if (existingController === null) {
        sharedContextValue = createSharedContext();
      }
      return [editor, context, sharedContextValue];
    }, [existingController]);

    return (
      <ControllerContextInternal.Provider value={controllerContext}>
        {children}
      </ControllerContextInternal.Provider>
    );
  }
  ControllerComponent.__context = ControllerContextInternal;

  return ControllerComponent;
}

export function useController<Context, SharedContext>(
  controller: Controller<Context, SharedContext>,
): [OutlineEditor, Context, null | SharedContext] {
  const context = useContext(controller.__context);
  if (context === null) {
    invariant(
      false,
      'OutlineController.useController: cannot find matching OutlineController',
    );
  }
  return context;
}
