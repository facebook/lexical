/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './ShortcutsHelpDialog.css';

import {IS_APPLE} from 'lexical';
import {Fragment, type JSX} from 'react';

import {SHORTCUTS} from './shortcuts';

function humanize(key: string): string {
  return key
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/(\d+)/g, ' $1')
    .trim()
    .replace(/^(\w)/, c => c.toUpperCase());
}

export default function ShortcutsHelpDialog(): JSX.Element {
  return (
    <div className="ShortcutsHelpDialog">
      <table>
        <thead>
          <tr>
            <th className="ShortcutsHelpDialog__heading__action">Action</th>
            <th className="ShortcutsHelpDialog__heading__shortcut">Shortcut</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(SHORTCUTS).map(([action, keys]) => (
            <tr key={action}>
              <td className="ShortcutsHelpDialog__action">
                {humanize(action)}
              </td>
              <td
                className="ShortcutsHelpDialog__shortcut"
                data-platform={IS_APPLE ? 'apple' : 'other'}>
                {keys.map((v, i) => (
                  <Fragment key={v}>
                    {i > 0 && (
                      <span className="ShortcutsHelpDialog__separator" />
                    )}
                    <kbd>{v}</kbd>
                  </Fragment>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
