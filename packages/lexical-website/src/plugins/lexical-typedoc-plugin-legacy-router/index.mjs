/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @ts-check
/* eslint-disable no-unused-vars -- import classes we don't use at runtime */
import {Converter} from 'typedoc';
import {ModuleRouter} from 'typedoc-plugin-markdown';

/**
 * @typedef {import('typedoc').Application} Application
 * @typedef {import('typedoc').DeclarationReflection} DeclarationReflection
 * @typedef {import('typedoc').Reflection} Reflection
 * @typedef {import('typedoc').RouterTarget} RouterTarget
 */

/** @param {Application} app */
export function load(app) {
  app.renderer.defineRouter('legacy', LegacyRouter);
  app.converter.on(
    Converter.EVENT_CREATE_DECLARATION,
    function removeLicenseComment(ctx, reflection) {
      const {comment} = reflection;
      if (
        comment &&
        comment.summary.length === 1 &&
        comment.summary.some(
          (part) =>
            part.kind === 'text' &&
            part.text.startsWith(
              'Copyright (c) Meta Platforms, Inc. and affiliates.',
            ),
        )
      ) {
        comment.summary.pop();
      }
    },
  );
}

class LegacyRouter extends ModuleRouter {
  /** @param {Reflection} reflection */
  getIdealBaseName(reflection) {
    const original = super.getIdealBaseName(reflection);
    const modified = original.replace(
      /(?:@lexical\/(?:react\/)?[^/]+|lexical)/,
      (s) => `modules/${s.replace(/^@/, '').replace(/[/]/g, '_')}`,
    );
    return modified;
  }
}
