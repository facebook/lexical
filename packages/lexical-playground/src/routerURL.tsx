/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import * as React from 'react';
import {Route, Routes} from 'react-router-dom';

import ImagePlayground from './components/demos/ImagePlayground';
import PlaygroundApp from './components/PlaygroundApp';

const Main = () => {
  return (
    <Routes>
      <Route path="/" element={<PlaygroundApp />} />
      <Route path="/image-demo" element={<ImagePlayground />} />
    </Routes>
  );
};
export default Main;
