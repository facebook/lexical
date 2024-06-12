/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @ts-check
const typedoc = require('typedoc');

exports.load = function (/** @type {import('typedoc').Application} */ app) {
  app.converter.on(
    typedoc.Converter.EVENT_RESOLVE_BEGIN,
    (/** @type {import('typedoc').Context} */ context) => {
      context.project
        .getReflectionsByKind(typedoc.ReflectionKind.Module)
        .forEach((reflection) => {
          // Replace "lexical-react/src/foo" with "@lexical/react/foo"
          reflection.name = reflection.name
            .replace(/^lexical-/, '@lexical/')
            .replace(/\/src(\/|$)/, '$1');
        });
    },
  );
};
