/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/* global BigInt */

'use strict';

const baseStyles = require('./baseStyles');
const {
  animationNameIgnoreSuffix,
  numberPropertySuffixes,
  pseudoPriorities,
  pseudoSelectorArgWhitelist,
  rulePriorities,
  unitlessNumberProperties,
  vendorPrefixedPseudoClasses,
  vendorPrefixedRules,
  webkitCSSVariableEdgeCaseProperties,
} = require('./constants');
const getTextDirectionVariants = require('./get-text-direction-variants');
const lintRule = require('./lint-rule');
const messages = require('./messages');
const normalizeValue = require('./normalize-value');
const mapValuePathToProperty = require('./shorthand-expansions');
const {
  dashify,
  getKey,
  namespaceToDevClassName,
  validateProp,
} = require('./utils');
const t = require('@babel/types');
const crypto = require('crypto');

const INVALID_CSS_ID = /^\d/;
const DEFAULT_PRIORITY = 1;

const DEFAULT_ROOT_FONT_SIZE = 16;

/**
 * Creates a short unique CSS identifier by hashing the input string and then converting it to base36.
 * Valid CSS identifiers cannot start with a digit.
 */
function createUniqueCSSName(str, opts) {
  let src = '';
  let hash = '';
  do {
    // each iteration will append "str" to the source (until we get a valid ID)
    src += str;
    hash = crypto
      .createHash('sha1')
      .update(src + ':' + (opts.stylexSheetName || '<>'))
      .digest('hex');
    hash = BigInt('0x' + hash).toString(36); // base36 encode it
  } while (INVALID_CSS_ID.test(hash));
  return hash.slice(0, 8);
}

/**
 * Get a pseudo selector and return a number associated with the priority of
 * how it should appear in the document. 0 is last, greater numbers are first.
 */
function getPriorityForPseudo(path, pseudo) {
  if (pseudo && pseudo.startsWith('&:')) {
    pseudo = pseudo.slice(1);
  }
  // Get the actual pseudo name of a selector. We allow some pseudo selectors
  // with args like `:nth-child(2n)`
  if (pseudo[0] === ':') {
    const nameMatch = pseudo.match(/^::?([a-z-]+)/);
    if (nameMatch == null) {
      throw path.buildCodeFrameError(
        `Failed to extract pseudo name from ${pseudo}`,
      );
    }

    const name = nameMatch[0];
    const priorityIndex = pseudoPriorities.indexOf(name);
    if (priorityIndex == null) {
      throw path.buildCodeFrameError(
        `No pseudo priority defined for ${pseudo}`,
      );
    }
    return priorityIndex + DEFAULT_PRIORITY + 1;
  }

  return DEFAULT_PRIORITY;
}

/**
 * Get the priority for a CSS rule. Property priorities are added together with
 * a pseudo priority. Just like how pseudo priorities are required in order for
 * rules defined in :active to shadow :hover. We need `margin-left` to override
 * `margin`.
 */
function getPriorityForRule(name) {
  const priority = rulePriorities[name];
  if (priority == null) {
    return DEFAULT_PRIORITY;
  } else {
    return priority;
  }
}

/**
 * Validate a pseudo selector. Only allow media queries and whitelisted pseudo
 * selectors.
 */
function validatePseudo(path, pseudo) {
  if (pseudo == null) {
    return;
  }

  // NOTE: Start of a transition:
  // Instead of ":hover", we want the keys to be "&:hover" going forward
  if (pseudo.startsWith('&')) {
    pseudo = pseudo.slice(1);
  }

  if (pseudo[0] === '@') {
    // Media query
    return;
  } else if (pseudo[0] !== ':') {
    // Unknown pseudo
    throw path.buildCodeFrameError(messages.INVALID_PSEUDO);
  }

  // Pseudo selector with arguments, eg. :nth-child(2n)
  const argPseudo = pseudo.match(/^(:[a-z-]+)\((.*?)\)$/);
  if (argPseudo != null && pseudoSelectorArgWhitelist.has(argPseudo[1])) {
    // Ensure that we don't allow engineers to escape this and write arbitrary
    // descedent selectors like: :nth-child(2n) > foo:not()
    const arg = argPseudo[2];
    if (arg.includes(')') === false) {
      return;
    }
  }

  // Purposely not throwing even when using a pseudo selector that is not
  // whitelisted. This is important as an escape hatch.
  // Pseudo selector
  // if (!pseudoSelectorWhitelist.has(pseudo)) {
  //   throw path.buildCodeFrameError(messages.INVALID_PSEUDO);
  // }
}

/**
 * This method will generate the suffix for a given property name. Some CSS
 * properties take milliseconds or pixels, so we have a custom list of property
 * suffixes and use px if it's not in it.
 */
function getNumberSuffix(key) {
  if (unitlessNumberProperties.has(key)) {
    return '';
  }

  const suffix = numberPropertySuffixes[key];
  if (suffix == null) {
    return 'px';
  } else {
    return suffix;
  }
}

/**
 * Convert part of a style value into a string.
 */
function getStringValue(key, value) {
  if (Array.isArray(value)) {
    return value.map((elem) => getStringValue(key, elem)).join(',');
  } else if (typeof value === 'number') {
    return String(Math.round(value * 10000) / 10000) + getNumberSuffix(key);
  } else {
    // typeof value === 'string'
    return value;
  }
}

/**
 * Convert absolute unit into relative unit for adjustability
 */
function transformValue(key, value) {
  // Convert font sizes from absolute unit `px` to relative unit `rem`.
  // This will allow developers to continue thinking and using what's familiar
  // while we output font sizes that are adjustable
  if (key === 'font-size' && /\d(px)/.test(value)) {
    return `${parseInt(value, 10) / DEFAULT_ROOT_FONT_SIZE}rem`;
  }

  // content is one of the values that needs to wrapped in quotes.
  // Users may write `''` without thinking about it, so we fix that.
  if (key === 'content' && typeof value === 'string') {
    const val = value.trim();
    if (val.match(/^attr\([a-zA-Z0-9-]+\)$/)) {
      return val;
    }
    if (
      !(
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      )
    ) {
      return `"${val}"`;
    }
  }

  return normalizeValue(value, key);
}

/**
 * Generate the CSS for a rule
 */
function generateCSS(className, key, value, pseudo) {
  // Build up the rules
  const origRules = Array.isArray(value)
    ? value.map((eachValue) => [key, eachValue])
    : [[key, value]];

  /**
   * TODO(T68779821): Chrome 49 and old versions of WebKit have a
   * [bug](https://bugs.webkit.org/show_bug.cgi?id=185940) which causes the
   * browser to treat certain property values containing one or more CSS
   * variables as an invalid property value. The workaround is to move the
   * property into its own redundant local variable, then set the property to
   * that variable. This particular solution only works if the webkit vendored
   * prefix is a valid property. Please see the comment in `./constants.js`.
   *
   * Makehaste will continue inlining the value of the variable in browsers
   * that don't support CSS variables. It will not strip these away from
   * browsers that do support CSS variables. This adds extra bytes to our CSS
   * for browsers that don't have this bug.
   *
   * Follow up action: We should strip these redundant properties away in
   * Makehaste for browsers that don't exhibit this bug. Please also delete this
   * comment.
   */

  const rules = origRules
    .flatMap(([k, v]) => {
      if (
        webkitCSSVariableEdgeCaseProperties.has(k) &&
        v.match(/.+var\(.*\).*/)
      ) {
        const localCSSVariableKey = '--T68779821';
        return [
          [localCSSVariableKey, v],
          [`-webkit-${k}`, `var(${localCSSVariableKey})`],
          [k, v],
        ];
      }
      return [[k, v]];
    })
    .flatMap(([k, v]) => {
      const prefixes = vendorPrefixedRules[k];
      if (prefixes != null) {
        return [...prefixes.map((prefix) => [prefix + k, v]), [k, v]];
      }
      return [[k, v]];
    })
    .map(([k, v]) => `${k}:${v}`);

  // Join the rules together
  const inner = rules.join(';');

  let css;
  if (pseudo == null) {
    // No pseudo selector
    css = `${className}{${inner}}`;
  } else if (pseudo[0] === '@') {
    // Media query - bump specificity because media queries don't.
    // nested pseudo selectors within media queries aren't allowed right now.
    css = `${pseudo}{${className}${className}{${inner}}}`;
  } else if (pseudo[0] === ':') {
    css = `${className}${pseudo}{${inner}}`;
  } else if (pseudo[0] === '&' && pseudo[1] === ':') {
    css = `${className}${pseudo.slice(1)}{${inner}}`;
  } else {
    throw new Error(
      `Illegal pseudo selector ${pseudo}, we should have already validated this`,
    );
  }
  return css;
}

/**
 * Get the class name associated with the requested rule. It will be injected
 * if it hasn't been already.
 */
function getClassNameFromRule(rawKey, rawValue, pseudo, opts) {
  if (pseudo && pseudo.startsWith('&')) {
    pseudo = pseudo.slice(1);
  }
  // Convert the JS property key to a CSS key
  const key = dashify(rawKey);

  // Normalize the value to a string and convert the value to relative unit.
  const value = Array.isArray(rawValue)
    ? rawValue.map((eachValue) =>
        transformValue(key, getStringValue(key, eachValue)),
      )
    : transformValue(key, getStringValue(key, rawValue));

  // Generate the class name for this rule
  const className = Array.isArray(value)
    ? createUniqueCSSName(key + value.join(', ') + pseudo, opts)
    : createUniqueCSSName(key + value + pseudo, opts);

  return {
    className,
    key,
    value,
    medium: pseudo != null && pseudo[0] === '@' ? pseudo.substring(7) : null,
    rules: getTextDirectionVariants(key, value),
  };
}

// Checks if the path is a spread property of a key from `stylex`
// e.g. ...stylex.absoluteFill,
function isStylexPreset(path) /*: boolean */ {
  return (
    path.isSpreadElement() &&
    path.get('argument').isMemberExpression() &&
    path.get('argument').get('object').isIdentifier() &&
    path.get('argument').get('object').node.name === 'stylex' &&
    baseStyles[path.get('argument').get('property').node.name] != null
  );
}

/**
 * Take an object path and build up all the rules for it
 */
function getStylesFromObject(
  object, // object of styles
  pseudo, // pseudo selector
  pseudoPriority, // priority for pseudo selector, possibly outdated
  opts,
  namespaceName,
  markComposition, // function to call if composition is detected
) {
  let styles = [];

  const replacedElements = [];

  // properties will be an array of objects - {key: X, value: X};
  let properties = [];

  // First - expand presets and
  for (const prop of object.get('properties')) {
    // Handling spread elements from stylex itself.
    if (isStylexPreset(prop)) {
      replacedElements.push(prop);
      Object.entries(
        baseStyles[prop.get('argument').get('property').node.name],
        // eslint-disable-next-line no-loop-func
      ).forEach(([key, value]) => {
        const rawKey = key;
        const keyPath = prop;
        const valuePath = keyPath;
        const rawValue = value;
        properties.push({
          rawKey,
          keyPath,
          valuePath,
          rawValue,
          isSpread: true,
        });
      });
    } else if (prop.isSpreadElement()) {
      if (
        prop.get('argument').node.type === 'TypeCastExpression' &&
        prop.get('argument').node.expression.type === 'Identifier' &&
        prop.get('argument').node.typeAnnotation.type === 'TypeAnnotation' &&
        prop.get('argument').node.typeAnnotation.typeAnnotation.type ===
          'GenericTypeAnnotation' &&
        prop.get('argument').node.typeAnnotation.typeAnnotation.id.type ===
          'Identifier' &&
        prop.get('argument').node.typeAnnotation.typeAnnotation.id.name ===
          'XStyle'
      ) {
        //properties.push({rawKey, keyPath, valuePath, rawValue, isSpread: true});
        // rawKey can be `prop.get('argument').node.expression.name` You cant spread the same value twice.
        // OR it can be null and we can just always keep it.
        // TODO: Keep this spreaded value here.
        // prop.get('argument').replaceWith(prop.get('argument').node.expression);
        prop.replaceWith(t.spreadElement(prop.get('argument').node.expression));
        // prop.replaceWithMultiple([]);
        markComposition();
      } else {
        throw prop.buildCodeFrameError(
          [
            messages.INVALID_SPREAD,
            `prop.get('argument').node.type == ${
              prop.get('argument').node.type
            }`,
            `prop.get('argument').node.expression.type == ${
              prop.get('argument').node.expression.type
            }`,
            `prop.get('argument').node.typeAnnotation.type == ${
              prop.get('argument').node.typeAnnotation.type
            }`,
            // `prop.get('argument').node.typeAnnotation.id.type == ${prop.get('argument').node.typeAnnotation.id.type}`,
            // `prop.get('argument').node.typeAnnotation.id.name == ${prop.get('argument').node.typeAnnotation.id.name}`,
          ].join('\n'),
        );
      }
      // Ignoring all other spreads.
    } else if (!prop.isSpreadElement()) {
      // validate non-spread props here.
      // NOTE: invalid spreads will throw an error here as well.
      validateProp(prop);

      // Get the raw property key
      const keyPath = prop.get('key');
      const rawKey = getKey(keyPath);

      // handle objects
      const valuePath = prop.get('value');
      if (valuePath.isObjectExpression()) {
        properties.push({rawKey, keyPath, valuePath, rawValue: null});
      } else {
        // evaluate the property
        const {deopt, value: rawValue} = valuePath.evaluate();

        // If the evaluate deopted then this isn't a static pure value
        if (deopt != null) {
          throw deopt.buildCodeFrameError(messages.NON_STATIC_VALUE);
        }

        // prop if multiple
        const mappedProps = mapValuePathToProperty(rawKey, rawValue);
        if (mappedProps.length !== 1) {
          replacedElements.push(prop);
          // eslint-disable-next-line no-loop-func
          mappedProps.forEach((rawKeyValuePair) =>
            properties.push({
              ...rawKeyValuePair,
              keyPath,
              valuePath: prop,
              isSpread: true,
            }),
          );
        } else {
          properties.push({
            ...mappedProps[0],
            keyPath,
            valuePath,
            isSpread: false,
          });
        }
      }
    }
  }

  const uniqueKeys = new Set();

  // Remove Duplicate Keys
  properties = properties
    .reverse()
    .filter(({rawKey}) => {
      if (uniqueKeys.has(rawKey)) {
        return false;
      }
      uniqueKeys.add(rawKey);
      return true;
    })
    .reverse();

  // NOTE: with more babel knowledge, I hope to clean this up in the near future
  for (const {rawKey, keyPath, valuePath, rawValue, isSpread} of properties) {
    // handle objects
    if (
      rawValue == null &&
      valuePath != null &&
      valuePath.isObjectExpression()
    ) {
      if (pseudo) {
        // TODO: fix support for nested pseudo / @media selectors here
        throw valuePath.buildCodeFrameError(messages.ILLEGAL_NESTED_PSEUDO);
      } else {
        validatePseudo(keyPath, rawKey);

        const pseudoPriority = getPriorityForPseudo(keyPath, rawKey);
        styles = styles.concat(
          getStylesFromObject(
            valuePath,
            rawKey,
            pseudoPriority,
            opts,
            namespaceName,
            markComposition,
          ),
        );

        continue;
      }
    }

    // Ensure that the property is an array, number or string
    if (
      typeof rawValue !== 'string' &&
      typeof rawValue !== 'number' &&
      !Array.isArray(rawValue)
    ) {
      throw valuePath.buildCodeFrameError(messages.ILLEGAL_PROP_VALUE);
    }

    // If the value is an array then make sure it only contains numbers or strings
    if (Array.isArray(rawValue)) {
      for (const elem of rawValue) {
        if (typeof elem !== 'string' && typeof elem !== 'number') {
          throw valuePath.buildCodeFrameError(
            messages.ILLEGAL_PROP_ARRAY_VALUE,
          );
        }
      }
    }

    // Get the CSS property name
    const {className, key, rules, value, medium} = getClassNameFromRule(
      rawKey,
      rawValue,
      pseudo,
      opts,
    );

    // Lint this rule
    lintRule(valuePath, key, value, opts.definedStylexCSSVariables);

    // replace value in original object with className
    if (!isSpread) {
      valuePath.replaceWith(t.StringLiteral(className));
    } else {
      // Add the actual object from the presets.
      valuePath.insertBefore(
        t.ObjectProperty(t.Identifier(rawKey), t.StringLiteral(className)),
      );
    }

    const pseudoClassPrefixes = vendorPrefixedPseudoClasses[pseudo];

    // Declare the style
    if (pseudoClassPrefixes) {
      for (const prefixedPseudo of pseudoClassPrefixes) {
        styles.push({
          key,
          className,
          pseudoPriority,
          pseudo: prefixedPseudo,
          rules,
          medium,
        });
      }
    } else {
      styles.push({
        key,
        className,
        pseudoPriority,
        pseudo,
        rules,
        medium,
      });
    }
  }

  let needToRemoveSpreads = true;
  if (opts.dev && opts.filename) {
    const devOnlyClassName = namespaceToDevClassName(
      namespaceName,
      opts.filename,
    );
    const newObjProperty = t.ObjectProperty(
      // We use the fileName_Namespace as the key as well to remove
      // conflicts because we want to keep all the devOnly classnames.
      t.Identifier(devOnlyClassName),
      t.StringLiteral(devOnlyClassName),
    );
    if (object.get('properties').length === 0) {
      object.node.properties.push(newObjProperty);
    } else if (opts.test) {
      needToRemoveSpreads = false;
      object.get('properties').forEach((prop, index) => {
        if (index === 0) {
          prop.replaceWith(newObjProperty);
        } else {
          prop.replaceWithMultiple([]);
        }
      });
    } else {
      object.get('properties')[0].insertBefore(newObjProperty);
    }
  }

  if (needToRemoveSpreads) {
    replacedElements.forEach((spread) => spread.replaceWithMultiple([]));
  }

  return styles;
}

/**
 * Create a stylex.inject call
 * css = {ltr,rtl}
 */
function buildStyleXInject(css, priority) {
  const args = [
    {
      type: 'StringLiteral',
      value: css.ltr,
    },
    {
      type: 'NumericLiteral',
      value: priority,
    },
  ];
  if (css.rtl != null) {
    args.push({type: 'StringLiteral', value: css.rtl});
  }

  return {
    type: 'ExpressionStatement',
    expression: {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: {
          type: 'Identifier',
          name: 'stylex',
        },
        property: {
          type: 'Identifier',
          name: 'inject',
        },
      },
      arguments: args,
    },
  };
}

/**
 * Convert a stylex.keyframes() call
 */
function convertStylexKeyframesCall(path, opts) {
  let ltrBody = '';
  let rtlBody = '';

  for (const namespaceProp of path.get('properties')) {
    const key = getKey(namespaceProp.get('key'));
    const value = namespaceProp.get('value');

    if (value.isObjectExpression()) {
      const styles = getStylesFromObject(value, null, 0, opts, key, () => {});
      if (styles.length) {
        ltrBody += `${key}{`;
        rtlBody += `${key}{`;

        for (const {rules} of styles) {
          const ltrBuilt = rules.ltr.key + ':' + rules.ltr.value + ';';
          ltrBody += ltrBuilt;

          // An rtl rule is optional so if it doesn't exist then add it on
          if (rules.rtl == null) {
            rtlBody += ltrBuilt;
          } else {
            rtlBody += rules.rtl.key + ':' + rules.rtl.value + ';';
          }
        }

        ltrBody += '}';
        rtlBody += '}';
      }
    } else {
      throw value.buildCodeFrameError(messages.ILLEGAL_NAMESPACE_VALUE);
    }
  }

  // We add a suffix to the keyframe name to tell the `animation` rule
  // processor not to touch the name
  const name = createUniqueCSSName(ltrBody, opts) + animationNameIgnoreSuffix;
  const css = {
    ltr: `@keyframes ${name}{${ltrBody}}`,
    rtl: ltrBody === rtlBody ? null : `@keyframes ${name}{${rtlBody}}`,
  };
  const rawInserts = [[name, css, DEFAULT_PRIORITY]];
  const insertCalls = [buildStyleXInject(css, DEFAULT_PRIORITY)];

  return {
    rawInserts,
    insertCalls,
    replacement: {
      type: 'StringLiteral',
      value: name,
    },
  };
}

/**
 * Convert a stylex.create() call
 */
function convertStylexCall(path, opts, markComposition) {
  const namespacesToClassNames = new Map();
  const insertCalls = [];
  const rawInserts = [];

  for (const namespaceProp of path.get('properties')) {
    validateProp(namespaceProp);

    const key = getKey(namespaceProp.get('key'));
    const value = namespaceProp.get('value');

    const classNames = [];
    namespacesToClassNames.set(key, classNames);

    if (value.isObjectExpression()) {
      const styles = getStylesFromObject(
        value,
        null,
        0,
        opts,
        key,
        markComposition,
      );

      for (const {
        key,
        className,
        pseudoPriority,
        pseudo,
        rules,
        medium,
      } of styles) {
        classNames.push({className, pseudoPriority, key, medium});

        const priority = pseudoPriority + getPriorityForRule(key);
        const css = {
          ltr: generateCSS(
            `.${className}`,
            rules.ltr.key,
            rules.ltr.value,
            pseudo,
          ),
          rtl: rules.rtl
            ? generateCSS(
                `.${className}`,
                rules.rtl.key,
                rules.rtl.value,
                pseudo,
              )
            : null,
        };
        rawInserts.push([className, css, priority]);
        insertCalls.push(buildStyleXInject(css, priority));
      }
    } else {
      throw value.buildCodeFrameError(messages.ILLEGAL_NAMESPACE_VALUE);
    }
  }

  return {
    rawInserts,
    insertCalls,
    namespaces: namespacesToClassNames,
  };
}

module.exports = {
  getPriorityForRule,
  convertStylexKeyframesCall,
  convertStylexCall,
};
