/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const STYLEX = 'stylex';

const messages = require('./messages.js');
const {
  factoryCallToStylexCall,
} = require('./transform-factory-call-to-stylex-call');
const {convertStylexValueCall} = require('./transform-factory-call.js');
const {
  convertStylexCall,
  convertStylexKeyframesCall,
} = require('./transform-stylex-call.js');
const t = require('@babel/types');

function styleXTransform(babel) {
  // GLOBAL variables. All the functions are outside the scope of the plugin
  // so we use a combination of weak data structures and pre/post functions to
  // manage them.
  let hasComposition = false;
  let stylexCreateCalls = new Set();
  let stylexAndNamespaceCalls = new Map();

  // WeakSet so we never double-visit a CallExpression
  // NOTE: An object will be removed from a WeakSet when it's GC'd so there's no
  //       additional memory pressure.
  const hasVisitedCallExpression = new WeakSet();

  // Check if path is `require('stylex')`
  function isStyleXRequireCall(path) {
    return (
      path.get('callee').isIdentifier({name: 'require'}) &&
      path.get('arguments')[0].isStringLiteral({value: STYLEX})
    );
  }

  // Check if path is `const stylex = VAL`
  function isStyleXDeclaration(path) {
    return (
      path.isVariableDeclarator() && path.get('id').isIdentifier({name: STYLEX})
    );
  }

  // Check if path is `import _ from 'stylex'`
  function isStyleXImportDeclaration(path) {
    return path.get('source').isStringLiteral({value: STYLEX});
  }

  // Check if path is `import stylex from _`
  function isStyleXImportSpecifier(path) {
    const specifiers = path.get('specifiers');
    if (specifiers.length !== 1) {
      return false;
    }
    const firstSpecifier = specifiers[0];
    return (
      firstSpecifier.isImportDefaultSpecifier() &&
      firstSpecifier.get('local').isIdentifier({name: 'stylex'})
    );
  }

  // Check if path is `stylex.create()`
  function isStyleXCall(path) {
    return (
      path.isCallExpression() &&
      path.get('callee').isMemberExpression() &&
      path.get('callee').get('object').isIdentifier({name: STYLEX}) &&
      path.get('callee').get('property').isIdentifier({name: 'create'})
    );
  }

  // Check if a path is `stylex.keyframes()`
  function isStyleXKeyframesCall(path) {
    return (
      path.isCallExpression() &&
      path.get('callee').matchesPattern(`${STYLEX}.keyframes`)
    );
  }

  function getNamespaceBinding(path, state) {
    const name = path.node.name;
    // Verify that the binding belongs to the top scope
    const binding = path.scope.getBinding(name);
    if (binding != null && !binding.scope.path.isProgram()) {
      return null;
    }

    const bindingsToNamespace = state.get('bindingsToNamespace');
    return bindingsToNamespace.get(name);
  }

  /**
   * Get all the style namespaces associated with a referenced identifier.
   */
  function getStyleXValueNamespaces(path, state) {
    if (!path.isIdentifier()) {
      return null;
    }

    return getNamespaceBinding(path, state);
  }

  function getLocalStylexCall(path, state) {
    if (!path.isCallExpression()) {
      return null;
    }
    const callee = path.get('callee');
    if (!callee.isIdentifier() || callee.node.name !== STYLEX) {
      return null;
    }

    const namespaces = new Map();
    const isFullyLocal = path.get('arguments').every((arg) => {
      if (arg.isMemberExpression()) {
        if (
          arg.node.computed &&
          !arg.get('property').isStringLiteral() &&
          !arg.get('property').isNumericLiteral()
        ) {
          return false;
        }
        const namespace = getNamespaceBinding(arg.get('object'), state);
        if (!namespace) {
          return false;
        }
        namespaces.set(arg.get('object').node.name, namespace);
        return true;
      }
      if (
        arg.isLogicalExpression({operator: '&&'}) &&
        arg.get('right').isMemberExpression()
      ) {
        const namespace = getNamespaceBinding(
          arg.get('right').get('object'),
          state,
        );
        if (!namespace) {
          return false;
        }
        namespaces.set(arg.get('right').get('object').node.name, namespace);
        return true;
      }
      if (arg.isConditionalExpression()) {
        if (
          arg.get('consequent').isMemberExpression() &&
          arg.get('alternate').isMemberExpression()
        ) {
          const namespace1 = getNamespaceBinding(
            arg.get('consequent').get('object'),
            state,
          );
          const namespace2 = getNamespaceBinding(
            arg.get('alternate').get('object'),
            state,
          );
          if (!namespace1 || !namespace2) {
            return false;
          }
          namespaces.set(
            arg.get('consequent').get('object').node.name,
            namespace1,
          );
          namespaces.set(
            arg.get('alternate').get('object').node.name,
            namespace1,
          );
          return true;
        }
        if (
          arg.get('consequent').isMemberExpression() &&
          arg.get('alternate').isNullLiteral()
        ) {
          const namespace = getNamespaceBinding(
            arg.get('consequent').get('object'),
            state,
          );
          if (!namespace) {
            return false;
          }
          namespaces.set(
            arg.get('consequent').get('object').node.name,
            namespace,
          );
          return true;
        }
        if (
          arg.get('alternate').isMemberExpression() &&
          arg.get('consequent').isNullLiteral()
        ) {
          const namespace = getNamespaceBinding(
            arg.get('alternate').get('object'),
            state,
          );
          if (!namespace) {
            return false;
          }
          namespaces.set(
            arg.get('alternate').get('object').node.name,
            namespace,
          );
          return true;
        }
      }

      // Other types are not allowed.
      return false;
    });

    if (!isFullyLocal) {
      return null;
    }

    // Since in a stylex calls, we could mix and match namespaces from different
    // stylex.create calls, we combine them with in the binding.namespace strings.
    const namespacesWithObject = new Map();
    namespaces.forEach((namespaceMapping, bindingName) => {
      namespaceMapping.forEach((classNames, nameSpaceName) => {
        namespacesWithObject.set(`${bindingName}.${nameSpaceName}`, classNames);
      });
    });
    return namespacesWithObject;
  }

  /**
   * Add an array of [css, priority] pairs to the returned transform metadata
   */
  function addRawInserts(raw, state) {
    for (const pair of raw) {
      state.file.metadata.stylex.push(pair);
    }
  }

  // Ensure that a stylex call only has one argument
  function ensureCallHasOneArgument(path) {
    if (path.get('arguments').length !== 1) {
      throw path.buildCodeFrameError(messages.ILLEGAL_ARGUMENT_LENGTH);
    }
  }

  function getNonTypeCastParent(path) {
    const parent = path.parentPath;
    return parent.isTypeCastExpression() ? parent.parentPath : parent;
  }

  // Ensure that a stylex call is bound to a bare variable
  function ensureCallIsBoundToBareVariable(path) {
    if (!path.isVariableDeclarator() || !path.get('id').isIdentifier()) {
      throw path.buildCodeFrameError(messages.UNBOUND_STYLEX_CALL_VALUE);
    }
  }

  // Ensure that a stylex call is at the root
  // CallExpression -> VariableDeclarator -> VariableDeclaration -> ?
  function ensureCallIsAtTopLevel(path) {
    if (!path.parentPath.parentPath.isProgram()) {
      throw path.buildCodeFrameError(messages.ONLY_TOP_LEVEL);
    }
  }

  /**
   * Visit a CallExpression, performing validation and transformation if it's
   * stylex-related.
   */
  function visitCallExpressionCallExpression(path, state) {
    // Make sure we don't double visit a path
    if (hasVisitedCallExpression.has(path.node)) {
      return;
    }
    hasVisitedCallExpression.add(path.node);

    // Ensure that require('stylex') is bound to a variable called stylex
    if (isStyleXRequireCall(path) && !isStyleXDeclaration(path.parentPath)) {
      throw path.buildCodeFrameError(messages.ILLEGAL_REQUIRE);
    }

    // Validate and transform stylex calls
    if (isStyleXCall(path) || isStyleXKeyframesCall(path)) {
      ensureCallHasOneArgument(path);

      // Validate that the first arg is an object
      const [arg] = path.get('arguments');
      if (!arg.isObjectExpression()) {
        throw arg.buildCodeFrameError(messages.NON_OBJECT_FOR_STYLEX_CALL);
      }

      let parentStatement = null;
      let variableID = null;

      const parent = getNonTypeCastParent(path);
      if (parent.isExportDefaultDeclaration()) {
        // case: export default (stylex.create({}): MyStyles);
        parentStatement = parent;
        // Value is exported, enable composition
        hasComposition = true;
      } else if (
        parent.parentPath.isVariableDeclaration() &&
        parent.parentPath.parentPath.isExportNamedDeclaration()
      ) {
        // case: export const styles = (stylex.create({}): MyStyles);
        parentStatement = parent.parentPath.parentPath;
        variableID = parent.get('id');
        // Value is exported, enable composition
        hasComposition = true;
      } else {
        // case: const styles = stylex.create({});

        // Ensure this is a well formed top level variable declaration
        ensureCallIsBoundToBareVariable(parent);
        ensureCallIsAtTopLevel(parent);

        variableID = parent.get('id');
        parentStatement = parent.parentPath;
      }

      if (isStyleXKeyframesCall(path)) {
        const {insertCalls, rawInserts, replacement} =
          convertStylexKeyframesCall(arg, {
            stylexSheetName: state.opts.stylexSheetName,
            definedStylexCSSVariables: state.opts.definedStylexCSSVariables,
          });
        // Add the `stylex.insert` in runtime mode *and* in DEV mode.
        // We're keeping them in DEV mode to make fast refresh work correctly.
        // The extra calls will be ignored at runtime
        if (!state.opts.stylexSheetName) {
          parentStatement.insertBefore(insertCalls);
        } else if (state.opts.dev) {
          parentStatement.insertBefore(
            t.ifStatement(
              t.identifier('__DEV__'),
              t.blockStatement(insertCalls),
            ),
          );
        }
        path.replaceWith(replacement);
        addRawInserts(rawInserts, state);
      }

      if (isStyleXCall(path)) {
        // Name of the variable holding the value of stylex function call.
        const {namespaces, insertCalls, rawInserts} = convertStylexCall(
          arg,
          {
            filename: state.filename,
            dev: state.opts.dev,
            test: state.opts.test,
            stylexSheetName: state.opts.stylexSheetName,
            definedStylexCSSVariables: state.opts.definedStylexCSSVariables,
          },
          () => {
            hasComposition = true;
          },
        );
        if (variableID) {
          const bindingName = variableID.node.name;
          state.get('bindingsToNamespace').set(bindingName, namespaces);
        }
        if (state.opts.stylexSheetName) {
          if (state.opts.dev) {
            // We're keeping them in DEV mode to make fast refresh work correctly.
            // The extra calls will be ignored at runtime
            parentStatement.insertBefore(
              t.ifStatement(
                t.identifier('__DEV__'),
                t.blockStatement(insertCalls),
              ),
            );
          }
          path.replaceWith(arg);
        } else {
          insertCalls.forEach((call) => parentStatement.insertBefore(call));
          path.replaceWith(arg);
        }
        stylexCreateCalls.add(parentStatement);
        addRawInserts(rawInserts, state);
      }
    }

    if (!path.get('callee').isIdentifier()) {
      return;
    }

    if (path.get('callee').node.name === STYLEX) {
      path.skip();
    }

    // Validate stylex value arguments
    const namespaces =
      getStyleXValueNamespaces(path.get('callee'), state) ||
      getLocalStylexCall(path, state);
    if (namespaces != null) {
      let varName;
      if (
        path.node.type === 'CallExpression' &&
        path.node.callee.type === 'Identifier'
      ) {
        varName = path.node.callee.name;
      } else if (path.node.type === 'Identifier') {
        varName = path.node.name;
      } else if (
        path.node.type === 'VariableDeclarator' &&
        path.node.id.type === 'Identifier'
      ) {
        varName = path.node.id.name;
      } else {
        throw path.buildCodeFrameError(path.node.type);
      }

      const args = path.get('arguments');
      const opts = {
        filename: state.filename,
        dev: state.opts.dev,
        test: state.opts.test,
      };
      const stylexValue = convertStylexValueCall(
        args,
        namespaces,
        opts,
        varName,
      );
      stylexAndNamespaceCalls.set(path, stylexValue);
    } else if (path.get('callee').node.name === STYLEX) {
      hasComposition = true;
    }
  }
  return {
    name: 'stylex',
    pre() {
      hasComposition = false;
      stylexCreateCalls = new Set();
      stylexAndNamespaceCalls = new Map();
    },
    post() {
      if (!hasComposition) {
        // Remove all the objects created from stylex.create
        stylexCreateCalls.forEach((variableDeclaration) => {
          variableDeclaration.replaceWithMultiple([]);
        });
        // Replace all stylex() calls with classNames etc.
        stylexAndNamespaceCalls.forEach((replacement, callPath) => {
          callPath.replaceWith(replacement);
        });
      } else {
        // convert all styles(...) calls
        stylexAndNamespaceCalls.forEach((_, callPath) => {
          if (
            callPath.get('callee').isIdentifier() &&
            callPath.get('callee').node.name !== STYLEX
          ) {
            factoryCallToStylexCall(callPath);
          }
        });
      }
    },
    visitor: {
      Program(path, state) {
        // Set the array where we'll push on all raw CSS and their priority
        state.file.metadata.stylex = [];
        state.set('bindingsToNamespace', new Map());

        // Make sure we visit all variable declarations first to build up our
        // styles table
        for (const itemPath of path.get('body')) {
          if (
            itemPath.isVariableDeclaration() ||
            itemPath.isExportNamedDeclaration() ||
            itemPath.isExportDefaultDeclaration()
          ) {
            itemPath.traverse(
              {
                CallExpression: visitCallExpressionCallExpression,
                BlockStatement(path) {
                  path.skip();
                },
              },
              state,
            );
          }
        }
      },

      // We also want to visit CallExpressions too in case we need to perform
      // any validation
      CallExpression: visitCallExpressionCallExpression,

      ImportDeclaration(path, state) {
        if (isStyleXImportDeclaration(path) && !isStyleXImportSpecifier(path)) {
          throw path.buildCodeFrameError(messages.ILLEGAL_IMPORT);
        }
      },

      ReferencedIdentifier(path, state) {
        // Detect usage of a stylex.create return value outside of a call
        // eg.
        // const styles = stylex({});
        // Any usage other than `styles(...)` and `stylex(..., styles.x, ...)`.
        if (
          getStyleXValueNamespaces(path, state) != null &&
          !path.parentPath.isCallExpression({callee: path.node})
          // NOTE: traversal args to stylex(...) is skipped.
        ) {
          hasComposition = true;
        }
      },
    },
  };
}

module.exports = styleXTransform;

module.exports.processStylexRules = function processStylexRules(rules) {
  if (rules.length === 0) {
    return '';
  }

  const sortedRules = rules.sort(
    ([, , firstPriority], [, , secondPriority]) =>
      firstPriority - secondPriority,
  );

  const collectedCSS = Array.from(new Map(sortedRules).values())
    .flatMap(({ltr, rtl}) =>
      rtl != null
        ? [
            addAncestorSelector(ltr, "html:not([dir='rtl'])"),
            addAncestorSelector(rtl, "html[dir='rtl']"),
          ]
        : [ltr],
    )
    .join('\n');

  return collectedCSS;
};

/**
 * Adds an ancestor selector in a media-query-aware way.
 */
function addAncestorSelector(selector, ancestorSelector) {
  if (!selector.startsWith('@')) {
    return `${ancestorSelector} ${selector}`;
  }

  const firstBracketIndex = selector.indexOf('{');
  const mediaQueryPart = selector.slice(0, firstBracketIndex + 1);
  const rest = selector.slice(firstBracketIndex + 1);
  return `${mediaQueryPart}${ancestorSelector} ${rest}`;
}
