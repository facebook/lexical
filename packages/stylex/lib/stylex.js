/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.default = void 0;

var _inject = _interopRequireDefault(require('./inject'));

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}

function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);
  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    if (enumerableOnly) {
      symbols = symbols.filter(function (sym) {
        return Object.getOwnPropertyDescriptor(object, sym).enumerable;
      });
    }
    keys.push.apply(keys, symbols);
  }
  return keys;
}

function _objectSpread(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i] != null ? arguments[i] : {};
    if (i % 2) {
      ownKeys(Object(source), true).forEach(function (key) {
        _defineProperty(target, key, source[key]);
      });
    } else if (Object.getOwnPropertyDescriptors) {
      Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    } else {
      ownKeys(Object(source)).forEach(function (key) {
        Object.defineProperty(
          target,
          key,
          Object.getOwnPropertyDescriptor(source, key),
        );
      });
    }
  }
  return target;
}

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  } else {
    obj[key] = value;
  }
  return obj;
}

function stylex() {
  // Keep a set of property commits to the className
  var seenProperties = new Set();
  var className = '';

  for (
    var _len = arguments.length, styles = new Array(_len), _key = 0;
    _key < _len;
    _key++
  ) {
    styles[_key] = arguments[_key];
  }

  while (styles.length) {
    // Push nested styles back onto the stack to be processed
    var next = styles.pop();

    if (Array.isArray(next)) {
      for (var i = 0; i < next.length; i++) {
        styles.push(next[i]);
      }

      continue;
    } // Process an individual style object

    var styleObj = next;

    if (styleObj != null && typeof styleObj === 'object') {
      var classNameChunk = '';

      for (var prop in styleObj) {
        var value = styleObj[prop]; // Style declarations, e.g., opacity: 's3fkgpd'

        if (typeof value === 'string') {
          // Skip if property has already been seen
          if (!seenProperties.has(prop)) {
            seenProperties.add(prop);
            classNameChunk += classNameChunk ? ' ' + value : value;
          }
        } // Style conditions, e.g., ':hover', '@media', etc.
        else if (typeof value === 'object') {
          var condition = prop;
          var nestedStyleObject = value;

          for (var conditionalProp in nestedStyleObject) {
            var conditionalValue = nestedStyleObject[conditionalProp];
            var conditionalProperty = condition + conditionalProp; // Skip if conditional property has already been seen

            if (!seenProperties.has(conditionalProperty)) {
              seenProperties.add(conditionalProperty);
              classNameChunk += classNameChunk
                ? ' ' + conditionalValue
                : conditionalValue;
            }
          }
        }
      } // Order of classes in chunks matches property-iteration order of style
      // object. Order of chunks matches passed order of styles from first to
      // last (which we iterate over in reverse).

      if (classNameChunk) {
        className = className
          ? classNameChunk + ' ' + className
          : classNameChunk;
      }
    }
  }

  return className;
}

function stylexCreate(_styles) {
  throw new Error(
    'stylex.create should never be called. It should be compiled away.',
  );
}
/**
 * WARNING!
 * If you add another method to stylex make sure to update
 * CommonJSParser::getStylexPrefixSearchConf().
 *
 * Otherwise any callsites will fatal.
 */

stylex.compose = function stylexCompose() {
  // When flow creates an empty object, it doesn't like for it to have
  // the type of an exact object. This is just a local override that
  // uses the correct types and overrides the problems of Flow.
  var baseObject = {};

  for (
    var _len2 = arguments.length, styles = new Array(_len2), _key2 = 0;
    _key2 < _len2;
    _key2++
  ) {
    styles[_key2] = arguments[_key2];
  }

  var workingStack = styles.reverse();

  while (workingStack.length) {
    // Reverse push nested styles back onto the stack to be processed
    var next = styles.pop();

    if (Array.isArray(next)) {
      for (var i = next.length - 1; i >= 0; i--) {
        workingStack.push(next[i]);
      }

      continue;
    } // Merge style objects

    var styleObj = next;

    if (styleObj != null && typeof styleObj === 'object') {
      for (var _key3 in styleObj) {
        var value = styleObj[_key3];

        if (typeof value === 'string') {
          baseObject[_key3] = value;
        } else if (typeof value === 'object') {
          var _baseObject$_key;

          baseObject[_key3] =
            (_baseObject$_key = baseObject[_key3]) !== null &&
            _baseObject$_key !== void 0
              ? _baseObject$_key
              : {};
          Object.assign(baseObject[_key3], value);
        }
      }
    }
  }

  return baseObject;
};

stylex.create = stylexCreate;

stylex.keyframes = function (_keyframes) {
  throw new Error('stylex.keyframes should never be called');
};

stylex.inject = _inject.default;

stylex.dedupe = function () {
  return stylex.apply(void 0, arguments);
}; // actual styles are defined in the compiler

stylex.absoluteFill = {
  bottom: 0,
  boxSizing: 'border-box',
  end: 0,
  position: 'absolute',
  start: 0,
  top: 0,
};
stylex.absoluteCenter = {
  boxSizing: 'border-box',
  left: '50%',
  position: 'absolute',
  top: '50%',
  transform: 'translate(-50%, -50%)',
};
stylex.blockBase = {
  borderStyle: 'solid',
  borderWidth: 0,
  boxSizing: 'border-box',
  display: 'block',
  flexGrow: 1,
  flexShrink: 1,
  margin: 0,
  padding: 0,
  position: 'relative',
  zIndex: 0,
};
stylex.inlineBase = _objectSpread(
  _objectSpread({}, stylex.blockBase),
  {},
  {
    display: 'inline',
  },
);
stylex.buttonBase = {
  appearance: 'none',
  backgroundColor: 'transparent',
  borderStyle: 'solid',
  borderWidth: 0,
  boxSizing: 'border-box',
  margin: 0,
  padding: 0,
  position: 'relative',
  textAlign: 'inherit',
  zIndex: 0,
};
stylex.flexBase = {
  alignItems: 'stretch',
  borderStyle: 'solid',
  borderWidth: 0,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  flexGrow: 1,
  flexShrink: 1,
  justifyContent: 'space-between',
  margin: 0,
  minHeight: 0,
  minWidth: 0,
  padding: 0,
  position: 'relative',
  zIndex: 0,
};
stylex.flexInlineBase = _objectSpread(
  _objectSpread({}, stylex.flexBase),
  {},
  {
    display: 'inline-flex',
  },
);
stylex.linkBase = {
  backgroundColor: 'transparent',
  backgroundImage: 'none',
  boxSizing: 'border-box',
  color: 'inherit',
  cursor: 'pointer',
  position: 'relative',
  textDecoration: 'none',
  zIndex: 0,
};
stylex.listBase = {
  boxSizing: 'border-box',
  listStyle: 'none',
  marginBottom: 0,
  marginTop: 0,
  paddingStart: 0,
}; // Shorthand for making an element visible only to screen readers

stylex.visuallyHidden = {
  clip: 'rect(0, 0, 0, 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  width: 1,
};
var _default = stylex;
exports.default = _default;
