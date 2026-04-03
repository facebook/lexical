/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {IS_BOLD, IS_ITALIC, IS_UNDERLINE} from 'lexical';

const FORMAT_FLAGS = [
  [IS_BOLD, 'bold'],
  [IS_ITALIC, 'italic'],
  [IS_UNDERLINE, 'underline'],
] as const;

export function EntityLink({
  children,
  className,
  format,
  href,
  icon,
  title,
}: {
  children: string;
  className: string;
  format: number;
  href: string;
  icon: JSX.Element;
  title: string;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const textTheme = editor._config.theme.text;
  const formatClasses =
    textTheme && format !== 0
      ? FORMAT_FLAGS.filter(([flag]) => (format & flag) !== 0)
          .map(([, key]) => textTheme[key])
          .filter(Boolean)
          .join(' ')
      : '';

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 no-underline transition-colors ${className} ${formatClasses}`}
      style={{
        borderBottom: '1px dashed currentColor',
        cursor: 'pointer',
        fontSize: 'inherit',
        lineHeight: 'inherit',
      }}>
      {icon}
      {children}
    </a>
  );
}
