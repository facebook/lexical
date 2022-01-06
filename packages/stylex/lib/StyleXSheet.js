/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
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
exports.styleSheet = exports.StyleXSheet = void 0;

var _invariant = _interopRequireDefault(require('invariant'));

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError('Cannot call a class as a function');
  }
}

function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ('value' in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  return Constructor;
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

var LIGHT_MODE_CLASS_NAME = '__fb-light-mode';
var DARK_MODE_CLASS_NAME = '__fb-dark-mode';

/**
 * Take a theme and generate it's accompanying CSS variables
 */
function buildTheme(selector, theme) {
  var lines = [];
  lines.push(''.concat(selector, ' {'));

  for (var key in theme) {
    var value = theme[key];
    lines.push('  --'.concat(key, ': ').concat(value, ';'));
  }

  lines.push('}');
  return lines.join('\n');
}
/**
 * Create a <style> tag and add it to the head.
 */

function makeStyleTag() {
  var tag = document.createElement('style');
  tag.setAttribute('type', 'text/css');
  tag.setAttribute('data-stylex', 'true');
  var head = document.head || document.getElementsByTagName('head')[0];
  (0, _invariant.default)(head, 'expected head');
  head.appendChild(tag);
  return tag;
}
/**
 * Check if the browser supports CSS variables
 */

function doesSupportCSSVariables() {
  return (
    globalThis.CSS != null &&
    globalThis.CSS.supports != null &&
    globalThis.CSS.supports('--fake-var:0')
  );
} // Regex to replace var(--foo) with an inlined version

var VARIABLE_MATCH = /var\(--(.*?)\)/g; // Stylesheet options

/**
 * This class manages the CSS stylesheet for the page and the injection of new
 * CSS rules.
 */
var StyleXSheet = /*#__PURE__*/ (function () {
  function StyleXSheet(opts) {
    var _opts$supportsVariabl;

    _classCallCheck(this, StyleXSheet);

    this.tag = null;
    this.injected = false;
    this.ruleForPriority = new Map();
    this.rules = [];
    this.rootTheme = opts.rootTheme;
    this.rootDarkTheme = opts.rootDarkTheme;
    this.supportsVariables =
      (_opts$supportsVariabl = opts.supportsVariables) !== null &&
      _opts$supportsVariabl !== void 0
        ? _opts$supportsVariabl
        : doesSupportCSSVariables();
  }

  _createClass(StyleXSheet, [
    {
      key: 'getVariableMatch',
      value: function getVariableMatch() {
        return VARIABLE_MATCH;
      },
      /**
       * Check if we have don't have access to the dom
       */
    },
    {
      key: 'isHeadless',
      value: function isHeadless() {
        var _globalThis$document;

        return (
          this.tag == null ||
          (globalThis === null || globalThis === void 0
            ? void 0
            : (_globalThis$document = globalThis.document) === null ||
              _globalThis$document === void 0
            ? void 0
            : _globalThis$document.body) == null
        );
      },
      /**
       * Get the stylesheet tag. Throw if none exists.
       */
    },
    {
      key: 'getTag',
      value: function getTag() {
        var tag = this.tag;
        (0, _invariant.default)(tag != null, 'expected tag');
        return tag;
      },
      /**
       * Get the current stylesheet CSS.
       */
    },
    {
      key: 'getCSS',
      value: function getCSS() {
        return this.rules.join('\n');
      },
      /**
       * Get the position of the rule in the stylesheet.
       */
    },
    {
      key: 'getRulePosition',
      value: function getRulePosition(rule) {
        return this.rules.indexOf(rule);
      },
      /**
       * Count of the current rules in the stylesheet. Used in tests.
       */
    },
    {
      key: 'getRuleCount',
      value: function getRuleCount() {
        return this.rules.length;
      },
      /**
       * Inject a style tag into the document head
       */
    },
    {
      key: 'inject',
      value: function inject() {
        var _globalThis$document2;

        if (this.injected) {
          return;
        }

        this.injected = true; // Running in a server environment

        if (
          ((_globalThis$document2 = globalThis.document) === null ||
          _globalThis$document2 === void 0
            ? void 0
            : _globalThis$document2.body) == null
        ) {
          this.injectTheme();
          return;
        } // Create style tag if in browser

        this.tag = makeStyleTag();
        this.injectTheme();
      },
      /**
       * Inject the theme styles
       */
    },
    {
      key: 'injectTheme',
      value: function injectTheme() {
        if (this.rootTheme != null) {
          this.insert(
            buildTheme(
              ':root, .'.concat(LIGHT_MODE_CLASS_NAME),
              this.rootTheme,
            ),
            0,
          );
        }

        if (this.rootDarkTheme != null) {
          this.insert(
            buildTheme(
              '.'
                .concat(DARK_MODE_CLASS_NAME, ':root, .')
                .concat(DARK_MODE_CLASS_NAME),
              this.rootDarkTheme,
            ),
            0,
          );
        }
      },
      /**
       * Inject custom theme styles (only for internal testing)
       */
    },
    {
      key: '__injectCustomThemeForTesting',
      value: function __injectCustomThemeForTesting(selector, theme) {
        if (theme != null) {
          this.insert(buildTheme(selector, theme), 0);
        }
      },
      /**
       * Delete the requested rule from the stylesheet
       */
    },
    {
      key: 'delete',
      value: function _delete(rule) {
        // Get the index of this rule
        var index = this.rules.indexOf(rule);
        (0, _invariant.default)(
          index >= 0,
          "Couldn't find the index for rule %s",
          rule,
        ); // Remove the rule from our index

        this.rules.splice(index, 1);

        if (this.isHeadless()) {
          return;
        }

        var tag = this.getTag();
        var sheet = tag.sheet;
        (0, _invariant.default)(sheet, 'expected sheet');
        sheet.deleteRule(index);
      },
      /**
       *
       */
    },
    {
      key: 'normalizeRule',
      value: function normalizeRule(rule) {
        var rootTheme = this.rootTheme;

        if (this.supportsVariables || rootTheme == null) {
          return rule;
        }

        return rule.replace(VARIABLE_MATCH, function (_match, name) {
          return rootTheme[name];
        });
      },
      /**
       * Get the rule position a rule should be inserted at according to the
       * specified priority.
       */
    },
    {
      key: 'getInsertPositionForPriority',
      value: function getInsertPositionForPriority(priority) {
        // If there's an end rule associated with this priority, then get the next
        // rule which will belong to the next priority
        // The rule will be inserted before it and assigned to the current priority
        var priorityRule = this.ruleForPriority.get(priority);

        if (priorityRule != null) {
          return this.rules.indexOf(priorityRule) + 1;
        } // If we've never created this priority before, then let's find the highest
        // priority to target

        var priorities = Array.from(this.ruleForPriority.keys())
          .sort(function (a, b) {
            return b - a;
          })
          .filter(function (num) {
            return num > priority ? 1 : 0;
          }); // If there's no priorities then place us at the start

        if (priorities.length === 0) {
          return this.getRuleCount();
        } // Place us next to the next highest priority

        var lastPriority = priorities.pop();
        return this.rules.indexOf(this.ruleForPriority.get(lastPriority));
      },
      /**
       * Insert a rule into the stylesheet.
       */
    },
    {
      key: 'insert',
      value: function insert(rawLTRRule, priority, rawRTLRule) {
        // Inject the stylesheet if it hasn't already been
        if (this.injected === false) {
          this.inject();
        }

        if (rawRTLRule != null) {
          this.insert(
            addAncestorSelector(rawLTRRule, "html:not([dir='rtl'])"),
            priority,
          );
          this.insert(
            addAncestorSelector(rawRTLRule, "html[dir='rtl']"),
            priority,
          );
          return;
        }

        var rawRule = rawLTRRule; // Don't insert this rule if it already exists

        if (this.rules.includes(rawRule)) {
          return;
        }

        var rule = this.normalizeRule(rawRule); // Get the position where we should insert the rule

        var insertPos = this.getInsertPositionForPriority(priority);
        this.rules.splice(insertPos, 0, rule); // Set this rule as the end of the priority group

        this.ruleForPriority.set(priority, rule);

        if (this.isHeadless()) {
          return;
        }

        var tag = this.getTag();
        var sheet = tag.sheet;

        if (sheet != null) {
          try {
            sheet.insertRule(rule, insertPos);
          } catch (_unused) {
            // Ignore: error likely due to inserting prefixed rules (e.g. `::-moz-range-thumb`).
          }
        } // Ignore the case where sheet == null. It's an edge-case Edge 17 bug.
      },
    },
  ]);

  return StyleXSheet;
})();
/**
 * Adds an ancestor selector in a media-query-aware way.
 */

exports.StyleXSheet = StyleXSheet;

_defineProperty(StyleXSheet, 'LIGHT_MODE_CLASS_NAME', LIGHT_MODE_CLASS_NAME);

_defineProperty(StyleXSheet, 'DARK_MODE_CLASS_NAME', DARK_MODE_CLASS_NAME);

function addAncestorSelector(selector, ancestorSelector) {
  if (!selector.startsWith('@')) {
    return ''.concat(ancestorSelector, ' ').concat(selector);
  }

  var firstBracketIndex = selector.indexOf('{');
  var mediaQueryPart = selector.slice(0, firstBracketIndex + 1);
  var rest = selector.slice(firstBracketIndex + 1);
  return ''.concat(mediaQueryPart).concat(ancestorSelector, ' ').concat(rest);
}

var styleSheet = new StyleXSheet({
  supportsVariables: true,
  rootTheme: {},
  rootDarkTheme: {},
});
exports.styleSheet = styleSheet;
