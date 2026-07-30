/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * The factory functions whose definitions are annotated with
 * `@__NO_SIDE_EFFECTS__`. That annotation is only honored by esbuild for
 * calls in the same file as the definition (and not at all by
 * webpack/terser), so every module-scope call site must carry its own
 * `\/* @__PURE__ *\/` annotation for bundlers to tree-shake unused
 * extension/command/rule definitions out of application bundles.
 *
 * Argument-position calls (e.g. `configExtension` / `safeCast` inside a
 * `defineExtension` config) matter too: a pure call is only removable
 * when its arguments are also side-effect-free, so one unannotated
 * nested call pins the entire enclosing definition.
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
 * True when the call is evaluated during module initialization (not
 * deferred inside a function body), which is the only place the
 * annotation affects tree-shaking. Class fields and static blocks are
 * rare enough for these factories that they are not required either.
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
        const last = comments[comments.length - 1];
        if (last && PURE_ANNOTATION.test(last.value)) {
          return;
        }
        context.report({
          data: {name: callee.name},
          fix(fixer) {
            return fixer.insertTextBefore(node, '/* @__PURE__ */ ');
          },
          messageId: 'missingPureAnnotation',
          node: callee,
        });
      },
    };
  },
  meta: {
    docs: {
      description:
        'require /* @__PURE__ */ annotations on module-scope calls to the' +
        ' side-effect-free lexical factories so bundlers can tree-shake' +
        ' unused definitions',
      recommended: true,
    },
    fixable: 'code',
    messages: {
      missingPureAnnotation:
        'Module-scope call to {{name}} must be annotated with' +
        ' /* @__PURE__ */ so bundlers can drop the result when unused' +
        " (esbuild and webpack do not honor the definition's" +
        ' @__NO_SIDE_EFFECTS__ across files, and an unannotated' +
        ' argument-position call pins the enclosing definition).',
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
