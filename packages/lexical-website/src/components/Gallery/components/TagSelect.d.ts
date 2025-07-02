/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { type ComponentProps, type ReactElement, type ReactNode } from 'react';
interface Props extends ComponentProps<'input'> {
    tag: string;
    label: string;
    description: string;
    icon: ReactElement<ComponentProps<'svg'>>;
}
export default function TagSelect({ icon, label, description, tag, ...rest }: Props): ReactNode;
export {};
//# sourceMappingURL=TagSelect.d.ts.map