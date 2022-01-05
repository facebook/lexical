/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const messages = require('./messages.js');
const path = require('path');

/**
 * Dashify a camel cased string. This convers the JS property keys to CSS keys.
 */
function dashify(str) {
  return str.replace(/(^|[a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

// Validate an individual key in the object passed to
// stylex.create. The key must be a static value.
function validateProp(prop) {
  // Don't allow computed properties or object spread
  if (!prop.isObjectProperty()) {
    throw prop.buildCodeFrameError(messages.NON_STATIC_VALUE);
  }
  if (
    prop.is('computed') &&
    !prop.get('key').isStringLiteral() &&
    !prop.get('key').isNumericLiteral()
  ) {
    throw prop.buildCodeFrameError(messages.NON_STATIC_VALUE);
  }
}

function getKey(key) {
  if (key.isIdentifier()) {
    return key.node.name;
  } else if (key.isStringLiteral() || key.isNumericLiteral()) {
    return key.node.value;
  } else {
    throw key.buildCodeFrameError(messages.UNKNOWN_PROP_KEY);
  }
}

/**
 * This method is used to generate a development class name from a namespace
 * and a filename. This is only inserted in development and is just a pretty
 * name so you can easily map a DOM element instead of having to use the React
 * inspector.
 */
function namespaceToDevClassName(namespace, filename) {
  // Get the basename of the file without the extension
  const basename = path.basename(filename).split('.')[0];

  // Build up the class name, and sanitize it of disallowed characters
  const className = `${basename}__${namespace}`;
  return className.replace(/[^.a-zA-Z0-9_-]/g, '');
}

module.exports = {
  dashify,
  getKey,
  namespaceToDevClassName,
  validateProp,
};
