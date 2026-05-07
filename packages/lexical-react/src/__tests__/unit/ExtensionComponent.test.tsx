/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {ExtensionComponent} from '@lexical/react/ExtensionComponent';
import {LexicalExtensionComposer} from '@lexical/react/LexicalExtensionComposer';
import {ReactExtension} from '@lexical/react/ReactExtension';
import {mountReactExtensionComponent} from '@lexical/react/ReactPluginHostExtension';
import {useExtensionComponent} from '@lexical/react/useExtensionComponent';
import {defineExtension} from 'lexical';
import * as React from 'react';
import {createRoot, Root} from 'react-dom/client';
import {act} from 'react-dom/test-utils';
import {assertType, describe, expect, it} from 'vitest';

interface RequiredProps {
  value: string;
  count: number;
}

function RequiredOutputComponent({value, count}: RequiredProps) {
  return (
    <div data-testid="required-output">
      {value}-{count}
    </div>
  );
}

const RequiredPropsExtension = defineExtension({
  build() {
    return {Component: RequiredOutputComponent};
  },
  dependencies: [ReactExtension],
  name: 'required-props-extension',
});

interface OptionalProps {
  label?: string;
}

function OptionalOutputComponent({label = 'default'}: OptionalProps) {
  return <div data-testid="optional-output">{label}</div>;
}

const OptionalPropsExtension = defineExtension({
  build() {
    return {Component: OptionalOutputComponent};
  },
  dependencies: [ReactExtension],
  name: 'optional-props-extension',
});

describe('ExtensionComponent type compatibility', () => {
  it('accepts required props from the output Component', () => {
    // Type-only assertions: these will fail to compile if the
    // ExtensionComponentProps inference collapses to `never` for
    // components with required props.
    assertType<{
      'lexical:extension': typeof RequiredPropsExtension;
      value: string;
      count: number;
    }>({
      count: 1,
      'lexical:extension': RequiredPropsExtension,
      value: 'hello',
    });

    // The JSX form must also accept (and require) the props.
    const requiredJsx = (
      <ExtensionComponent
        lexical:extension={RequiredPropsExtension}
        value="hello"
        count={1}
      />
    );
    expect(requiredJsx).toBeTruthy();

    const missingProps = (
      // @ts-expect-error -- value and count are required props on the output Component
      <ExtensionComponent lexical:extension={RequiredPropsExtension} />
    );
    expect(missingProps).toBeTruthy();
  });

  it('accepts optional props from the output Component', () => {
    const withProp = (
      <ExtensionComponent
        lexical:extension={OptionalPropsExtension}
        label="custom"
      />
    );
    const withoutProp = (
      <ExtensionComponent lexical:extension={OptionalPropsExtension} />
    );
    expect(withProp).toBeTruthy();
    expect(withoutProp).toBeTruthy();
  });

  it('useExtensionComponent preserves required prop types', () => {
    // Type-only check: the hook's return type must remain a ComponentType
    // that requires the extension Component's props.
    type ReturnedComponent = ReturnType<
      typeof useExtensionComponent<typeof RequiredOutputComponent>
    >;
    assertType<React.ComponentType<RequiredProps>>(
      undefined as unknown as ReturnedComponent,
    );
    assertType<React.ComponentType<Record<never, never>>>(
      // @ts-expect-error -- contravariance: ComponentType<RequiredProps> is not assignable to ComponentType<{}>
      undefined as unknown as ReturnedComponent,
    );
    expect(typeof useExtensionComponent).toBe('function');
  });

  it('mountReactExtensionComponent accepts required props', () => {
    type Opts = Parameters<
      typeof mountReactExtensionComponent<typeof RequiredPropsExtension>
    >[1];
    // The `props` field of the options must allow the required props of the
    // output Component (or null), and not collapse to `never`.
    assertType<Opts['props']>({count: 1, value: 'hi'});
    assertType<Opts['props']>(null);
    expect(typeof mountReactExtensionComponent).toBe('function');
  });

  it('renders a Component that has required props', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root | undefined;
    try {
      act(() => {
        root = createRoot(container);
        root.render(
          <LexicalExtensionComposer
            extension={defineExtension({
              dependencies: [RequiredPropsExtension],
              name: '[root]',
            })}>
            <ExtensionComponent
              lexical:extension={RequiredPropsExtension}
              value="hello"
              count={42}
            />
          </LexicalExtensionComposer>,
        );
      });
      expect(container.textContent).toContain('hello-42');
    } finally {
      act(() => {
        root?.unmount();
      });
      document.body.removeChild(container);
    }
  });
});
