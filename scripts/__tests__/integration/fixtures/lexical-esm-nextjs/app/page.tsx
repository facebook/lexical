/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import EditorUseClient from "./EditorUseClient";

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <main>
  		<h1>Next.js Rich Text Lexical Example</h1>
      <EditorUseClient />
    </main>
  );
}
