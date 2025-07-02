/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { JSX } from 'react';
import { ContentEditableElement, type ContentEditableElementProps } from './shared/LexicalContentEditableElement';
export { ContentEditableElement, type ContentEditableElementProps };
export type ContentEditableProps = Omit<ContentEditableElementProps, 'editor'> & ({
    'aria-placeholder'?: void;
    placeholder?: null;
} | {
    'aria-placeholder': string;
    placeholder: ((isEditable: boolean) => null | JSX.Element) | JSX.Element;
});
/**
 * @deprecated This type has been renamed to `ContentEditableProps` to provide a clearer and more descriptive name.
 * For backward compatibility, this type is still exported as `Props`, but it is recommended to migrate to using `ContentEditableProps` instead.
 *
 * @note This alias is maintained for compatibility purposes but may be removed in future versions.
 * Please update your codebase to use `ContentEditableProps` to ensure long-term maintainability.
 */
export type Props = ContentEditableProps;
export declare const ContentEditable: import("react").ForwardRefExoticComponent<ContentEditableProps & import("react").RefAttributes<HTMLDivElement>>;
//# sourceMappingURL=LexicalContentEditable.d.ts.map