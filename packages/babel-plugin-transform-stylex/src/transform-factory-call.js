/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const {overrideProperties} = require('./constants.js');
const messages = require('./messages.js');
const {getPriorityForRule} = require('./transform-stylex-call.js');
const {getKey, namespaceToDevClassName, validateProp} = require('./utils.js');

/**
 * Take a Babel Node Path and resolve a namespace string from it. Validating it
 * as necessary.
 */
function getNamespace(path, namespaceData) {
  if (path.isLogicalExpression({operator: '&&'})) {
    return getNamespace(path.get('right'), namespaceData);
  }

  if (path.isMemberExpression() && path.get('object').isIdentifier()) {
    const key = path.get('object').node.name;
    const value = getKey(path.get('property'));
    const namespace = `${key}.${value}`;
    if (!namespaceData.has(namespace)) {
      throw path.buildCodeFrameError(messages.UNKNOWN_NAMESPACE);
    }
    return namespace;
  }
  // validate namespace type
  if (
    !path.isStringLiteral() &&
    !path.isNumericLiteral() &&
    !path.isIdentifier() &&
    !path.isObjectProperty({key: path.node})
  ) {
    throw path.buildCodeFrameError(messages.ILLEGAL_NAMESPACE_TYPE);
  }

  // validate that we're in namespaces
  const namespace = getKey(path);
  if (!namespaceData.has(namespace)) {
    throw path.buildCodeFrameError(messages.UNKNOWN_NAMESPACE);
  }
  return namespace;
}

/**
 * Take the arguments to a stylex value call and build a list of namespaces
 * and conditionals that need to be evaluated to build the final class names.
 */
function getConditions(path, namespaceData) {
  if (path.isConditionalExpression()) {
    return [
      {
        type: 'condition',
        test: path.node.test,
        consequent: getNamespace(path.get('consequent'), namespaceData),
        alternate: getNamespace(path.get('alternate'), namespaceData),
      },
    ];
  }

  if (path.isLogicalExpression({operator: '&&'})) {
    return [
      {
        type: 'condition',
        test: path.node.left,
        consequent: getNamespace(path.get('right'), namespaceData),
        alternate: null,
      },
    ];
  }

  if (path.isObjectExpression()) {
    const conditions = [];

    for (const prop of path.get('properties')) {
      validateProp(prop);

      const key = getNamespace(prop.get('key'), namespaceData);
      const value = prop.get('value');

      if (value.isBooleanLiteral({value: true})) {
        conditions.push({
          type: 'namespace',
          namespace: key,
        });
      } else {
        conditions.push({
          type: 'condition',
          test: value.node,
          consequent: key,
          alternate: undefined,
        });
      }
    }

    return conditions;
  }
  //
  return [
    {
      type: 'namespace',
      namespace: getNamespace(path, namespaceData),
    },
  ];
}

/**
 * Takes a list of namespaces, then dedupes and builds a string node of all the
 * class names.
 */
function namespacesToStringClassNames(
  namespaces,
  namespaceData,
  opts,
  prefixSpace,
) {
  const usedKeys = new Set();
  const classNames = [];

  for (let i = namespaces.length - 1; i >= 0; i--) {
    const namespace = namespaces[i];
    if (namespace == null) {
      continue;
    }

    // Get all the styles from this namespace and add on their classes
    const styles = namespaceData.get(namespace);
    for (const {key, className, pseudoPriority, medium} of styles) {
      const usedKey = getDedupeKey(key, pseudoPriority, medium);
      if (usedKeys.has(usedKey)) {
        continue;
      } else {
        usedKeys.add(usedKey);
      }

      if (!opts.test) {
        classNames.unshift(className);
      }
    }

    // For all the properties that shadow others, produce fake dedupe entries
    // to prevent them from being inserted
    for (const {key, pseudoPriority, medium} of styles) {
      const shadowed = overrideProperties[key];
      if (shadowed == null) {
        continue;
      }

      for (const key of shadowed) {
        usedKeys.add(getDedupeKey(key, pseudoPriority, medium));
      }
    }

    // Add on a dev class name if necessary
    if (opts.dev) {
      classNames.unshift(namespaceToDevClassName(namespace, opts.filename));
    }
  }

  let value = classNames.join(' ');
  if (prefixSpace && value !== '') {
    value = ' ' + value;
  }

  return {
    type: 'StringLiteral',
    value,
  };
}

/**
 * Produce a key that we can use to dedupe properties. This takes into account
 * pseudo priority, and calculates a priority for this specific rule.
 */
function getDedupeKey(key, pseudoPriority, medium) {
  // Get the priority for this rule
  const rulePriority = getPriorityForRule(key);

  // Calculate the whole property
  const priority = pseudoPriority + rulePriority;

  // We could make this hashed in the future
  if (medium != null) {
    return `${key}-${priority}-${medium}`;
  }
  return `${key}-${priority}`;
}

/**
 * Produce a an object that's a part of the `stylex.dedupe` call
 */
function buildNamespaceDedupeArgument(
  first,
  namespace,
  namespaceData,
  possibleDedupeKeys,
  opts,
) {
  const properties = [];

  if (namespace != null && !opts.test) {
    const namespaceDedupeKeys = new Set();

    const namespaceStyles = namespaceData.get(namespace);
    for (const {className, key, medium, pseudoPriority} of namespaceStyles) {
      // Push on the new object
      const dedupeKey = getDedupeKey(key, pseudoPriority, medium);
      possibleDedupeKeys.add(dedupeKey);
      namespaceDedupeKeys.add(dedupeKey);
      properties.push({
        type: 'ObjectProperty',
        key: {
          type: 'StringLiteral',
          value: dedupeKey,
        },
        value: {
          type: 'StringLiteral',
          value: className,
        },
      });
    }

    // Create shadow properties if necessary
    for (const {key, medium, pseudoPriority} of namespaceStyles) {
      // Check if this property should shadow any previous properties, if it
      // should, then remove them from the object by setting them to null
      const shadowed = overrideProperties[key];
      if (shadowed != null) {
        for (const key of shadowed) {
          const dedupeKey = getDedupeKey(key, pseudoPriority, medium);

          // Check if this property could exist before us, and that it's not originating from this namespace
          if (
            possibleDedupeKeys.has(dedupeKey) &&
            !namespaceDedupeKeys.has(dedupeKey)
          ) {
            properties.push({
              type: 'ObjectProperty',
              key: {
                type: 'StringLiteral',
                value: dedupeKey,
              },
              value: {
                type: 'NullLiteral',
              },
            });
          }
        }
      }
    }
  }

  // Add dev class name
  if (namespace != null && opts.dev) {
    const devClassName = namespaceToDevClassName(namespace, opts.filename);
    properties.unshift({
      type: 'ObjectProperty',
      key: {
        type: 'StringLiteral',
        value: devClassName,
      },
      value: {
        type: 'StringLiteral',
        value: devClassName,
      },
    });
  }

  // Passing `null` to `Object.assign` is the same as an empty object, it's more
  // efficient too since we don't need to allocate a new object.
  if (properties.length === 0 && !first) {
    return {
      type: 'NullLiteral',
    };
  } else {
    return {
      type: 'ObjectExpression',
      properties,
    };
  }
}

/**
 * Build up a list of arguments to pass to `stylex.dedupe(Object.assign(ARGS))`
 */
function buildDedupeRuntimeArguments(conditions, namespaceData, opts) {
  const args = [];
  const possibleDedupeKeys = new Set();

  let first = true;
  for (const elem of conditions) {
    if (elem.type === 'condition') {
      args.push({
        type: 'ConditionalExpression',
        test: elem.test,
        alternate: buildNamespaceDedupeArgument(
          first,
          elem.alternate,
          namespaceData,
          possibleDedupeKeys,
          opts,
        ),
        consequent: buildNamespaceDedupeArgument(
          first,
          elem.consequent,
          namespaceData,
          possibleDedupeKeys,
          opts,
        ),
      });
    } else {
      args.push(
        buildNamespaceDedupeArgument(
          first,
          elem.namespace,
          namespaceData,
          possibleDedupeKeys,
          opts,
        ),
      );
    }
    first = false;
  }

  return args;
}

/**
 * This will build a single class string when none of the namespaces are
 * conditionals eg something like: styles('foo', 'bar')
 */
function buildNamespaceClassesString(conditions, namespaceData, opts) {
  return namespacesToStringClassNames(
    conditions.map((condition) => condition.namespace),
    namespaceData,
    opts,
    false,
  );
}

/**
 * This will build a list of string additions when given a list of classes
 * where none of them have colliding properties. eg.
 *
 *  const styles = stylex({
 *    default: {
 *      backgroundColor: 'red',
 *    },
 *    liked: {
 *      color: 'red',
 *    },
 *    active: {
 *      border: '3px solid blue',
 *    },
 *  });
 *  styles('default', isLiked && 'liked', 'active');
 *
 * Since there's no colliding properties, we can just concat them all together.
 */
function buildConditionalStringConcat(conditions, namespaceData, opts) {
  const args = [];

  let first = true;
  for (const elem of conditions) {
    if (elem.type === 'condition') {
      args.push({
        type: 'ConditionalExpression',
        test: elem.test,
        consequent: namespacesToStringClassNames(
          [elem.consequent],
          namespaceData,
          opts,
          !first,
        ),
        alternate: namespacesToStringClassNames(
          [elem.alternate],
          namespaceData,
          opts,
          !first,
        ),
      });
    } else if (elem.type === 'namespace') {
      const node = namespacesToStringClassNames(
        [elem.namespace],
        namespaceData,
        opts,
        !first,
      );

      const last = args[args.length - 1];
      if (last != null && last.type === 'StringLiteral') {
        // If the last node was a string literal then don't produce a new one
        last.value += node.value;
      } else {
        args.push(node);
      }
    }

    first = false;
  }

  // Join together all args
  let root = args[0];
  for (const node of args.slice(1)) {
    root = {
      type: 'BinaryExpression',
      operator: '+',
      left: root,
      right: node,
    };
  }
  return root;
}

/**
 * This method will build up a call to `stylex.dedupe` that uses an object
 * to dedupe colliding properties. This appears in the context of:
 *
 *   const styles = stylex({
 *     active: {
 *       backgroundColor: 'red',
 *     },
 *     inactive: {
 *       backgroundColor: 'blue',
 *     },
 *   });
 *   styles(isActive ? 'active' : 'inactive')
 */
function buildCollisionDedupeCall(conditions, namespaceData, opts) {
  return {
    type: 'CallExpression',
    callee: {
      type: 'MemberExpression',
      object: {
        type: 'Identifier',
        name: 'stylex',
      },
      property: {
        type: 'Identifier',
        name: 'dedupe',
      },
    },
    arguments: buildDedupeRuntimeArguments(conditions, namespaceData, opts),
  };
}

/**
 * Check if there's colliding properties between the passed namespaces that
 * requires some deduping.
 */
function checkCollision(flatNamespaces, namespaceData) {
  const foundStyles = new Set();

  for (const namespace of flatNamespaces) {
    for (const {key, medium, pseudoPriority} of namespaceData.get(namespace)) {
      // Check if there's any properties in this that we should shadow
      const shadow = overrideProperties[key];
      if (shadow != null) {
        for (const key of shadow) {
          const dedupeKey = getDedupeKey(key, pseudoPriority, medium);
          if (foundStyles.has(dedupeKey)) {
            return true;
          }
        }
      }

      // Check if this is a duplicate property
      const dedupeKey = getDedupeKey(key, pseudoPriority, medium);
      if (foundStyles.has(dedupeKey)) {
        return true;
      } else {
        foundStyles.add(dedupeKey);
      }
    }
  }

  return false;
}

/**
 * Convert a stylex value call.
 */
function convertStylexValueCall(args, namespaceData, opts) {
  const flatNamespaces = new Set();

  // Build up all the conditions
  let namespaceConditions = [];
  for (const arg of args) {
    namespaceConditions = namespaceConditions.concat(
      getConditions(arg, namespaceData),
    );
  }

  // Check if there's any conditionals
  let hasConditions = false;
  for (const elem of namespaceConditions) {
    if (elem.type === 'condition') {
      hasConditions = true;
      if (elem.consequent != null) {
        flatNamespaces.add(elem.consequent);
      }
      if (elem.alternate != null) {
        flatNamespaces.add(elem.alternate);
      }
    } else if (elem.type === 'namespace') {
      flatNamespaces.add(elem.namespace);
    }
  }

  // Build the final values
  if (hasConditions) {
    // Check if there's any style conflicts, if there isn't then we can produce
    // an optimized version
    const hasCollision = checkCollision(flatNamespaces, namespaceData);

    if (hasCollision) {
      return buildCollisionDedupeCall(namespaceConditions, namespaceData, opts);
    } else {
      return buildConditionalStringConcat(
        namespaceConditions,
        namespaceData,
        opts,
      );
    }
  } else {
    return buildNamespaceClassesString(
      namespaceConditions,
      namespaceData,
      opts,
    );
  }
}

module.exports = {
  namespaceToDevClassName,
  convertStylexValueCall,
};
