/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// import '../../../../../lexical-playground/src/setupEnv';
// import '../../../../../lexical-playground/src/index.css';

import Layout from '@theme/Layout';
import * as React from 'react';

import ImagePlayground from './ImagePlayground';

export default function Hello() {
  return (
    <Layout title="Hello" description="Hello React Page">
      <ImagePlayground />
    </Layout>
  );
}
