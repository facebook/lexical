/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {DecoratorComponentProps} from './shared/types';

import {getExtensionDependencyFromEditor} from '@lexical/extension';
import {ReactExtension} from '@lexical/react/ReactExtension';
import {ReactProviderExtension} from '@lexical/react/ReactProviderExtension';
import {mergeRegister} from '@lexical/utils';
import {
  type AnyLexicalExtension,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_EDITOR,
  configExtension,
  createCommand,
  defineExtension,
  type LexicalEditor,
  type LexicalExtensionOutput,
  provideOutput,
} from 'lexical';
import {Suspense, useEffect, useState} from 'react';
import * as React from 'react';
import {createPortal} from 'react-dom';
import {type Container, createRoot, type Root} from 'react-dom/client';
import invariant from 'shared/invariant';

export type {DecoratorComponentProps};

export interface HostMountCommandArg {
  root: Root;
}

export interface MountPluginCommandArg {
  key: string;
  element: JSX.Element | null;
  domNode?: Container | null;
}

export function mountReactExtensionComponent<
  Extension extends AnyLexicalExtension,
>(
  editor: LexicalEditor,
  opts: {
    extension: Extension;
    props: [LexicalExtensionOutput<Extension>] extends [
      {
        Component: infer OutputComponentType extends React.ComponentType;
      },
    ]
      ? /** The Props from the Extension output Component */ React.ComponentProps<OutputComponentType> | null
      : never;
  } & Omit<MountPluginCommandArg, 'element'>,
) {
  const {props, extension, ...rest} = opts;
  const {Component} = getExtensionDependencyFromEditor(
    editor,
    extension,
  ).output;
  const element = props ? <Component {...props} /> : null;
  mountReactPluginElement(editor, {
    ...rest,
    element,
  });
}

export function mountReactPluginComponent<
  P extends Record<never, never> = Record<never, never>,
>(
  editor: LexicalEditor,
  opts: {
    Component: React.ComponentType<P>;
    props: (P & React.Attributes) | null;
  } & Omit<MountPluginCommandArg, 'element'>,
) {
  const {Component, props, ...rest} = opts;
  mountReactPluginElement(editor, {
    ...rest,
    element: props ? <Component {...props} /> : null,
  });
}

export function mountReactPluginElement(
  editor: LexicalEditor,
  opts: MountPluginCommandArg,
) {
  getExtensionDependencyFromEditor(
    editor,
    ReactPluginHostExtension,
  ).output.mountReactPlugin(opts);
}

export function mountReactPluginHost(
  editor: LexicalEditor,
  container: Container,
) {
  getExtensionDependencyFromEditor(
    editor,
    ReactPluginHostExtension,
  ).output.mountReactPluginHost(container);
}

export const REACT_PLUGIN_HOST_MOUNT_ROOT_COMMAND =
  createCommand<HostMountCommandArg>('REACT_PLUGIN_HOST_MOUNT_ROOT_COMMAND');
export const REACT_PLUGIN_HOST_MOUNT_PLUGIN_COMMAND =
  createCommand<MountPluginCommandArg>(
    'REACT_PLUGIN_HOST_MOUNT_PLUGIN_COMMAND',
  );

function PluginHostDecorator({
  context: [editor],
}: DecoratorComponentProps): JSX.Element | null {
  const {
    output: {renderMountedPlugins},
  } = getExtensionDependencyFromEditor(editor, ReactPluginHostExtension);
  const [children, setChildren] = useState(renderMountedPlugins);
  useEffect(() => {
    return editor.registerCommand(
      REACT_PLUGIN_HOST_MOUNT_PLUGIN_COMMAND,
      () => {
        // This runs after the one that updates the map
        setChildren(renderMountedPlugins);
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor, renderMountedPlugins]);
  return children;
}

/**
 * This extension provides a React host for editors that are not built
 * with LexicalExtensionComposer (e.g. you are using Vanilla JS or some
 * other framework).
 *
 * You must use {@link mountReactPluginHost} for any React content to work.
 * Afterwards, you may use {@link mountReactExtensionComponent} to
 * render UI for a specific React Extension.
 * {@link mountReactPluginComponent} and
 * {@link mountReactPluginElement} can be used to render
 * legacy React plug-ins (or any React content).
 */
export const ReactPluginHostExtension = defineExtension({
  dependencies: [
    ReactProviderExtension,
    configExtension(ReactExtension, {decorators: [PluginHostDecorator]}),
  ],
  name: '@lexical/react/ReactPluginHost',
  register(editor, _config, state) {
    let root: Root | undefined;
    const mountedPlugins = new Map<
      MountPluginCommandArg['key'],
      MountPluginCommandArg
    >();
    const reactDep = state.getDependency(ReactExtension);
    const {
      config: {ErrorBoundary},
      output: {Component},
    } = reactDep;
    const onError = editor._onError.bind(editor);
    function renderMountedPlugins() {
      const children: JSX.Element[] = [];
      for (const {key, element, domNode} of mountedPlugins.values()) {
        if (!element) {
          continue;
        }
        const wrapped = (
          <ErrorBoundary onError={onError} key={key}>
            <Suspense fallback={null}>{element}</Suspense>
          </ErrorBoundary>
        );
        children.push(domNode ? createPortal(wrapped, domNode, key) : wrapped);
      }
      return children.length > 0 ? <>{children}</> : null;
    }
    return provideOutput(
      {
        mountReactPlugin: (arg: MountPluginCommandArg) =>
          editor.dispatchCommand(REACT_PLUGIN_HOST_MOUNT_PLUGIN_COMMAND, arg),

        // Using outputs to wrap commands will give us better error messages
        // if the mount functions are called on an editor without this extension
        mountReactPluginHost: (container: Container) =>
          editor.dispatchCommand(REACT_PLUGIN_HOST_MOUNT_ROOT_COMMAND, {
            root: createRoot(container),
          }),
        renderMountedPlugins,
      },
      mergeRegister(
        () => {
          if (root) {
            root.unmount();
          }
          mountedPlugins.clear();
        },
        editor.registerCommand(
          REACT_PLUGIN_HOST_MOUNT_PLUGIN_COMMAND,
          (arg) => {
            // This runs before the PluginHost version
            mountedPlugins.set(arg.key, arg);
            return false;
          },
          COMMAND_PRIORITY_CRITICAL,
        ),
        editor.registerCommand(
          REACT_PLUGIN_HOST_MOUNT_ROOT_COMMAND,
          (arg) => {
            invariant(
              root === undefined,
              'ReactPluginHostExtension: Root is already mounted',
            );
            root = arg.root;
            root.render(<Component contentEditable={null} />);
            return true;
          },
          COMMAND_PRIORITY_EDITOR,
        ),
      ),
    );
  },
});
