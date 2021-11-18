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

type ControllerContextType<Context, SharedContext> =
  | null
  | [OutlineEditor, Context, SharedContext];

export type Controller<InstanceState, SharedState> = {
  ({children: React$Node}): React$Node,
  __context: React$Context<ControllerContextType<InstanceState, SharedState>>,
};

export function createController<InstanceState, SharedState>(
  createState: () => InstanceState,
  createSharedContext: () => SharedState,
  editorConfig?: {
    initialEditorState?: EditorState,
    theme?: EditorThemeClasses,
  },
): Controller<InstanceState, SharedState> {
  const ControllerContext =
    createReactContext<ControllerContextType<InstanceState, SharedState>>(null);

  function ControllerScope({children}: {children: React$Node}) {
    const existingController = useContext(ControllerContext);
    const controllerContext = useMemo(() => {
      const context: InstanceState = createState();
      const editor = createEditor<InstanceState>({
        ...editorConfig,
        context,
      });
      // Create shared context if needed, or re-use the existing one
      const sharedState: SharedState =
        existingController === null
          ? createSharedContext()
          : existingController[2];

      return [editor, context, sharedState];
      // We intentionally do not want to update when initialProps changes, as
      // these are meant to be a one-time thing.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [existingController]);

    return (
      <ControllerContext.Provider value={controllerContext}>
        {children}
      </ControllerContext.Provider>
    );
  }
  ControllerScope.__context = ControllerContext;

  return ControllerScope;
}

export function useController<InstanceState, SharedState>(
  controller: Controller<InstanceState, SharedState>,
): [OutlineEditor, InstanceState, SharedState] {
  const context = useContext(controller.__context);
  if (context === null) {
    invariant(
      false,
      'OutlineController.useController: cannot find matching OutlineController',
    );
  }
  return context;
}
