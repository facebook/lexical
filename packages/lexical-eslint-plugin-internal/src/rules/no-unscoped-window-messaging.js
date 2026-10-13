/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Options passed to a `@webext-pegasus/transport` initializer that name the
 * window messaging channel. A page is opted into the channel under this name,
 * so every script running in that page can address it.
 */
const NAMESPACE_OPTIONS = new Set([
  'namespace',
  'allowWindowMessagingForNamespace',
]);

const TRANSPORT_INITIALIZERS = new Set(['initPegasusTransport']);

/**
 * Resolve an expression to a build-time constant string, if it is one.
 *
 * Returns `true` for a string literal, a template literal with no
 * substitutions, a local `const` initialized with either, or a binding
 * imported from another module — an import is resolved when the bundle is
 * built, so it is the same value everywhere the code runs.
 *
 * Returns `false` for anything computed at runtime (a call, a member access,
 * a parameter), which is what this rule is asking for.
 *
 * @param {import('estree').Node} node
 * @param {import('eslint').Scope.Scope} scope
 * @param {number} [depth]
 * @returns {boolean}
 */
function isBuildTimeConstant(node, scope, depth = 0) {
  if (!node || depth > 5) {
    return false;
  }

  if (node.type === 'Literal') {
    return typeof node.value === 'string';
  }

  if (node.type === 'TemplateLiteral') {
    return node.expressions.length === 0;
  }

  if (node.type === 'Identifier') {
    const variable = findVariable(scope, node.name);
    if (!variable || variable.defs.length !== 1) {
      return false;
    }
    const def = variable.defs[0];

    // Imported from elsewhere in the bundle: constant by construction.
    if (def.type === 'ImportBinding') {
      return true;
    }

    if (def.type === 'Variable' && def.node.type === 'VariableDeclarator') {
      return isBuildTimeConstant(def.node.init, scope, depth + 1);
    }
  }

  return false;
}

/**
 * @param {import('eslint').Scope.Scope} scope
 * @param {string} name
 * @returns {import('eslint').Scope.Variable | null}
 */
function findVariable(scope, name) {
  for (let current = scope; current; current = current.upper) {
    const found = current.variables.find(v => v.name === name);
    if (found) {
      return found;
    }
  }
  return null;
}

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  create(context) {
    const sourceCode = context.sourceCode;

    /**
     * @param {import('estree').Node} node
     * @returns {import('eslint').Scope.Scope}
     */
    const scopeOf = node => sourceCode.getScope(node);

    /**
     * Report a `targetOrigin` of `'*'`, which lets any document receive the
     * message regardless of where it came from.
     *
     * @param {import('estree').Node} node
     */
    function checkTargetOrigin(node) {
      if (node.type === 'Literal' && node.value === '*') {
        context.report({messageId: 'wildcardTargetOrigin', node});
      }
    }

    return {
      CallExpression(node) {
        const {callee} = node;

        // win.postMessage(message, targetOrigin)
        const isPostMessage =
          (callee.type === 'MemberExpression' &&
            !callee.computed &&
            callee.property.type === 'Identifier' &&
            callee.property.name === 'postMessage') ||
          (callee.type === 'Identifier' && callee.name === 'postMessage');

        if (isPostMessage && node.arguments.length >= 2) {
          checkTargetOrigin(node.arguments[1]);
        }

        // initPegasusTransport({namespace: ...})
        const initializerName =
          callee.type === 'Identifier' ? callee.name : null;
        if (
          initializerName === null ||
          !TRANSPORT_INITIALIZERS.has(initializerName)
        ) {
          return;
        }

        const [options] = node.arguments;
        if (!options || options.type !== 'ObjectExpression') {
          return;
        }

        for (const property of options.properties) {
          if (
            property.type !== 'Property' ||
            property.computed ||
            property.key.type !== 'Identifier' ||
            !NAMESPACE_OPTIONS.has(property.key.name)
          ) {
            continue;
          }

          if (isBuildTimeConstant(property.value, scopeOf(property.value))) {
            context.report({
              data: {option: property.key.name},
              messageId: 'staticMessagingNamespace',
              node: property.value,
            });
          }
        }
      },

      // {targetOrigin: '*'} in an options object
      'Property[computed=false]'(node) {
        if (
          node.key.type === 'Identifier' &&
          node.key.name === 'targetOrigin'
        ) {
          checkTargetOrigin(node.value);
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        'require cross-context messaging channels to be scoped to their participants',
      recommended: true,
    },
    messages: {
      staticMessagingNamespace:
        'The `{{option}}` for a window messaging channel must be derived at runtime, not from a build-time constant. A constant is the same for every page and every installation, so it identifies the channel to anything else running in the page. Generate it per page load and pass it to the other side explicitly.',
      wildcardTargetOrigin:
        "Avoid a `targetOrigin` of '*' — it delivers the message to whatever document happens to be there. Pass the specific origin you mean.",
    },
    schema: [],
    type: 'problem',
  },
};

export default rule;
