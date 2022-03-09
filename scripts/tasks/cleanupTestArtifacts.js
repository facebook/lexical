/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const fs = require('fs-extra');
const path = require('path');

async function deleteSuccessVideos() {
  const videosDir = path.resolve('./e2e-videos');
  const files = await fs.promises.readdir(videosDir);
  files.forEach((file) => {
    if (!file.startsWith('FAILED')) {
      fs.rm(path.resolve(path.join(videosDir, file)));
    }
  });
}

deleteSuccessVideos();
