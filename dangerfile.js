/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const {markdown, danger, warn} = require('danger');

(async function() {
  // Use git locally to grab the commit which represents the place
  // where the branches differ

  const upstreamRepo = danger.github.pr.base.repo.full_name;
  if (upstreamRepo !== 'facebook/react') {
    // Exit unless we're running in the main repo
    return;
  }

})();
