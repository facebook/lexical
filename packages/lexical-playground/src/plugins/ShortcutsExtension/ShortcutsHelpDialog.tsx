/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

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
  const entries = Object.entries(SHORTCUTS);
  return (
    <div className="ShortcutsHelpDialog">
      <table>
        <thead>
          <tr>
            <th>Action</th>
            <th>Shortcut</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([action, keys]) => (
            <tr key={action}>
              <td>{humanize(action)}</td>
              <td>
                <kbd>{keys}</kbd>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
