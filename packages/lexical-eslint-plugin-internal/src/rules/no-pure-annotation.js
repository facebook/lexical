/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * The factory functions whose module-scope calls the build annotates for
 * itself, with the `@lexical/pure-annotations` transform. A `\/* @__PURE__ *\/`
 * written in the source is redundant there: the transform is idempotent and
 * would leave it alone, but keeping them in the tree is what this project
 * moved away from — they invite cargo-culting into positions where an
 * annotation does nothing (inside a function body, on a call whose callee
 * is not side-effect free at all).
 *
 * This is the inverse of the `require-pure-annotation` rule it replaces, so
 * a branch written before the transform existed migrates with
 * `pnpm run lint:fix`.
 */
const DEFAULT_FUNCTIONS = [
  'configExtension',
  'createCommand',
  'createContextState',
  'createImportState',
  'createRenderState',
  'createState',
  'declarePeerDependency',
  'defineExtension',
  'defineImportRule',
  'defineOverlayRules',
  'domOverride',
  'safeCast',
];

const PURE_ANNOTATION = /[#@]__PURE__/;

/**
 * True when the call is evaluated during module initialization, which is the
 * only place the build injects an annotation. An annotation inside a function
 * body, a class field, or a static block was written deliberately by somebody
 * and is left alone.
 *
 * @param {import('eslint').Rule.Node} node
 * @returns {boolean}
 */
function isModuleScopeEvaluation(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    switch (parent.type) {
      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
      case 'PropertyDefinition':
      case 'StaticBlock':
        return false;
      default:
        break;
    }
  }
  return true;
}

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  create(context) {
    const sourceCode = context.sourceCode;
    const [options] = context.options;
    const functions = new Set(
      (options && options.functions) || DEFAULT_FUNCTIONS,
    );

    return {
      CallExpression(node) {
        const {callee} = node;
        if (callee.type !== 'Identifier' || !functions.has(callee.name)) {
          return;
        }
        if (!isModuleScopeEvaluation(node)) {
          return;
        }
        const comments = sourceCode.getCommentsBefore(node);
        const annotation = comments[comments.length - 1];
        if (
          !annotation ||
          annotation.type !== 'Block' ||
          !PURE_ANNOTATION.test(annotation.value)
        ) {
          return;
        }
        context.report({
          data: {name: callee.name},
          fix(fixer) {
            // Everything from the annotation up to the call is the comment
            // and the whitespace after it.
            return fixer.removeRange([annotation.range[0], node.range[0]]);
          },
          loc: annotation.loc,
          messageId: 'unnecessaryPureAnnotation',
        });
      },
    };
  },
  meta: {
    docs: {
      description:
        'disallow hand-written /* @__PURE__ */ annotations on module-scope' +
        ' calls to the side-effect-free lexical factories, which the build' +
        ' injects with @lexical/pure-annotations',
      recommended: true,
    },
    fixable: 'code',
    messages: {
      unnecessaryPureAnnotation:
        'Remove this /* @__PURE__ */ annotation: the build injects it for' +
        ' every module-scope call to {{name}} (@lexical/pure-annotations),' +
        ' for the published bundles and for anything built from source.',
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          functions: {
            items: {type: 'string'},
            type: 'array',
          },
        },
        type: 'object',
      },
    ],
    type: 'suggestion',
  },
};

export default rule;
