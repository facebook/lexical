/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/// <reference types="react" />
export type LexicalErrorBoundaryProps = {
    children: JSX.Element;
    onError: (error: Error) => void;
};
export default function LexicalErrorBoundary({ children, onError, }: LexicalErrorBoundaryProps): JSX.Element;
