/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

import lexicalMonorepoPlugin from '../../scripts/vite/lexicalMonorepoPlugin';

// `dev-examples/` always builds against the lexical workspace source —
// unlike `examples/`, which builds against the published packages and
// opts into monorepo mode via a separate `vite.config.monorepo.ts`.
export default defineConfig({
  plugins: [react(), lexicalMonorepoPlugin()],
});
