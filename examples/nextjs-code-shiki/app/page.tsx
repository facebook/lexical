/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import EditorClient from './EditorClient';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <main>
      <h1>Lexical Next.js Code Shiki Example</h1>
      <EditorClient />
    </main>
  );
}
