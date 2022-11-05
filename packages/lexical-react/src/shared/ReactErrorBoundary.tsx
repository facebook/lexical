/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// Source: https://github.com/bvaughn/react-error-boundary/blob/master/src/index.tsx

import * as React from 'react';

const changedArray = (a: Array<unknown> = [], b: Array<unknown> = []) =>
  a.length !== b.length || a.some((item, index) => !Object.is(item, b[index]));

interface FallbackProps {
  error: Error;
  resetErrorBoundary: (...args: Array<unknown>) => void;
}

interface ErrorBoundaryPropsWithComponent {
  onResetKeysChange?: (
    prevResetKeys: Array<unknown> | undefined,
    resetKeys: Array<unknown> | undefined,
  ) => void;
  onReset?: (...args: Array<unknown>) => void;
  onError?: (error: Error, info: {componentStack: string}) => void;
  resetKeys?: Array<unknown>;
  fallback?: never;
  FallbackComponent: React.ComponentType<FallbackProps>;
  fallbackRender?: never;
}

declare function FallbackRender(
  props: FallbackProps,
): React.ReactElement<
  unknown,
  string | React.FunctionComponent | typeof React.Component
> | null;

interface ErrorBoundaryPropsWithRender {
  onResetKeysChange?: (
    prevResetKeys: Array<unknown> | undefined,
    resetKeys: Array<unknown> | undefined,
  ) => void;
  onReset?: (...args: Array<unknown>) => void;
  onError?: (error: Error, info: {componentStack: string}) => void;
  resetKeys?: Array<unknown>;
  fallback?: never;
  FallbackComponent?: never;
  fallbackRender: typeof FallbackRender;
}

interface ErrorBoundaryPropsWithFallback {
  onResetKeysChange?: (
    prevResetKeys: Array<unknown> | undefined,
    resetKeys: Array<unknown> | undefined,
  ) => void;
  onReset?: (...args: Array<unknown>) => void;
  onError?: (error: Error, info: {componentStack: string}) => void;
  resetKeys?: Array<unknown>;
  fallback: React.ReactElement<
    unknown,
    string | React.FunctionComponent | typeof React.Component
  > | null;
  FallbackComponent?: never;
  fallbackRender?: never;
}

type ErrorBoundaryProps =
  | ErrorBoundaryPropsWithFallback
  | ErrorBoundaryPropsWithComponent
  | ErrorBoundaryPropsWithRender;

type ErrorBoundaryState = {error: Error | null};

const initialState: ErrorBoundaryState = {error: null};

class ErrorBoundary extends React.Component<
  React.PropsWithRef<React.PropsWithChildren<ErrorBoundaryProps>>,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = initialState;
    this.resetErrorBoundary = this.resetErrorBoundary.bind(this);
  }

  static getDerivedStateFromError(error: Error) {
    return {error};
  }

  resetErrorBoundary(...args: Array<unknown>) {
    // @ts-ignore
    // eslint-disable-next-line no-unused-expressions
    this.props.onReset && this.props.onReset(...args);
    this.reset();
  }

  reset() {
    this.setState(initialState);
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // @ts-ignore
    // eslint-disable-next-line no-unused-expressions
    this.props.onError && this.props.onError(error, info);
  }

  componentDidUpdate(
    prevProps: ErrorBoundaryProps,
    prevState: ErrorBoundaryState,
  ) {
    const {error} = this.state;
    const {resetKeys} = this.props;

    // There's an edge case where if the thing that triggered the error
    // happens to *also* be in the resetKeys array, we'd end up resetting
    // the error boundary immediately. This would likely trigger a second
    // error to be thrown.
    // So we make sure that we don't check the resetKeys on the first call
    // of cDU after the error is set

    if (
      error !== null &&
      prevState.error !== null &&
      changedArray(prevProps.resetKeys, resetKeys)
    ) {
      // @ts-ignore
      // eslint-disable-next-line no-unused-expressions
      this.props.onResetKeysChange &&
        this.props.onResetKeysChange(prevProps.resetKeys, resetKeys);
      this.reset();
    }
  }

  render() {
    const {error} = this.state;

    const {fallbackRender, FallbackComponent, fallback} = this.props;

    if (error !== null) {
      const props = {
        error,
        resetErrorBoundary: this.resetErrorBoundary,
      };
      if (React.isValidElement(fallback)) {
        return fallback;
      } else if (typeof fallbackRender === 'function') {
        return fallbackRender(props);
      } else if (FallbackComponent) {
        return <FallbackComponent {...props} />;
      } else {
        throw new Error(
          'react-error-boundary requires either a fallback, fallbackRender, or FallbackComponent prop',
        );
      }
    }

    return this.props.children;
  }
}

export {ErrorBoundary};
