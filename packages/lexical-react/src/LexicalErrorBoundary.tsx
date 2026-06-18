/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {Component, type ErrorInfo, type JSX, type ReactNode} from 'react';

/**
 * Props for the {@link LexicalErrorBoundary} component.
 */
export type LexicalErrorBoundaryProps = {
  children: JSX.Element;
  fallback?: ReactNode;
  onError: (error: Error, info: ErrorInfo) => void;
};

interface ErrorBoundaryState {
  hasError: boolean;
}

// React error boundaries must be class components. This one stays private: the
// exported LexicalErrorBoundary is a function component so that its props keep
// the variance that lets it satisfy the (single-argument `onError`) boundary
// prop accepted by RichTextPlugin/PlainTextPlugin.
class ErrorBoundary extends Component<
  Required<LexicalErrorBoundaryProps>,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {hasError: false};

  static getDerivedStateFromError(): ErrorBoundaryState {
    return {hasError: true};
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    this.props.onError(
      error instanceof Error ? error : new Error(String(error), {cause: error}),
      info,
    );
  }

  render(): ReactNode {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

/**
 * An error boundary used by {@link RichTextPlugin} and {@link PlainTextPlugin}
 * to isolate failures thrown while rendering decorator nodes. It renders
 * `fallback` in place of the failed subtree and forwards the error (coerced to
 * an `Error`) along with the React {@link ErrorInfo} to the `onError` callback.
 * When `fallback` is omitted a small default message is shown; pass
 * `fallback={null}` to render nothing.
 *
 * @returns The wrapped `children`, or the fallback if an error is caught.
 */
export function LexicalErrorBoundary({
  children,
  fallback,
  onError,
}: LexicalErrorBoundaryProps): JSX.Element {
  return (
    <ErrorBoundary
      fallback={
        fallback === undefined ? (
          <div
            style={{
              border: '1px solid #f00',
              color: '#f00',
              padding: '8px',
            }}>
            An error was thrown.
          </div>
        ) : (
          fallback
        )
      }
      onError={onError}>
      {children}
    </ErrorBoundary>
  );
}
