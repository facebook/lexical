/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {MenuOption} from './LexicalMenu';

import * as React from 'react';

export function MenuItem({
  index,
  isSelected,
  onClick,
  onMouseEnter,
  option,
  className,
}: {
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  option: MenuOption;
  className?: string;
}): React.JSX.Element {
  let itemClassName = className || 'item';
  if (isSelected) {
    itemClassName += ' selected';
  }
  return (
    <li
      key={option.key}
      tabIndex={-1}
      className={itemClassName}
      ref={option.setRefElement}
      role="option"
      aria-selected={isSelected}
      id={'typeahead-item-' + index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}>
      {option.icon}
      <span className="text">{option.title ?? option.key}</span>
    </li>
  );
}
