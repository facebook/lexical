/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const namedColors = require('./reference/namedColors');
const numericOperators = new Set(['+', '-', '*', '/']);
// Helper functions to check for stylex values.
// All these helper functions receive a list of locally defined variables
// as well. This lets them recursively resolve values that are defined locally.
const isLiteral = function (value) {
  function literalChecker(node, variables) {
    return (
      (node.type === 'Literal' && node.value === value) ||
      (node.type === 'Identifier' &&
        variables &&
        variables.has(node.name) &&
        literalChecker(variables.get(node.name), variables))
    );
  }
  return literalChecker;
};
const isRegEx = function (regex) {
  function regexChecker(node, variables) {
    return (
      (node.type === 'Literal' &&
        typeof node.value === 'string' &&
        regex.test(node.value)) ||
      (node.type === 'Identifier' &&
        variables &&
        variables.has(node.name) &&
        regexChecker(variables.get(node.name), variables))
    );
  }
  return regexChecker;
};

const isString = (node, variables) =>
  (node.type === 'Literal' && typeof node.value === 'string') ||
  (node.type === 'TemplateLiteral' &&
    node.expressions.every((expression) =>
      isStringOrNumber(expression, variables),
    )) ||
  (node.type === 'Identifier' &&
    variables &&
    variables.has(node.name) &&
    isString(variables.get(node.name) /* purposely not recursing */));

const isMathCall = (node, variables) =>
  node.type === 'CallExpression' &&
  node.callee.type === 'MemberExpression' &&
  node.callee.object.type === 'Identifier' &&
  node.callee.object.name === 'Math' &&
  node.callee.property.type === 'Identifier' &&
  ['abs', 'ceil', 'floor', 'round'].includes(node.callee.property.name) &&
  node.arguments.every((arg) => isNumber(arg, variables));
const isNumber = (node, variables) =>
  (node.type === 'Literal' && typeof node.value === 'number') ||
  (node.type === 'BinaryExpression' &&
    numericOperators.has(node.operator) &&
    isNumber(node.left, variables) &&
    isNumber(node.right, variables)) ||
  (node.type === 'UnaryExpression' &&
    node.operator === '-' &&
    isNumber(node.argument, variables)) ||
  isMathCall(node, variables) ||
  (node.type === 'Identifier' &&
    variables &&
    variables.has(node.name) &&
    isNumber(variables.get(node.name) /* purposely not recursing */));

const isHexColor = (node) => {
  return (
    node.type === 'Literal' &&
    /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(node.value)
  );
};

const isUnion =
  (...checkers) =>
  (node, variables) =>
    checkers.some((checker) => checker(node, variables));
const isStringOrNumber = isUnion(isString, isNumber);

const isNamedColor = isUnion(
  ...Array.from(namedColors).map((color) => isLiteral(color)),
);

const isAbsoluteLength = (node) => {
  const lengthUnits = new Set(['px', 'cm', 'mm', 'in', 'pc', 'pt']);
  return (
    node.type === 'Literal' &&
    Array.from(lengthUnits).some((unit) =>
      node.value.match(new RegExp(`^([-,+]?\\d+(\\.\\d+)?${unit})$`)),
    )
  );
};

const isRelativeLength = (node) => {
  const lengthUnits = new Set(['ch', 'em', 'ex', 'rem', 'vh', 'vw']);
  return (
    node.type === 'Literal' &&
    Array.from(lengthUnits).some((unit) =>
      node.value.match(new RegExp(`^([-,+]?\\d+(\\.\\d+)?${unit})$`)),
    )
  );
};

const isPercentage = (node) => {
  return (
    node.type === 'Literal' &&
    node.value.match(new RegExp('^([-,+]?\\d+(\\.\\d+)?%)$'))
  );
};

const isLength = isUnion(isAbsoluteLength, isRelativeLength);

// NOTE: converted from Flow types to function calls using this
// https://astexplorer.net/#/gist/87e64b378349f13e885f9b6968c1e556/4b4ff0358de33cf86b8b21d29c17504d789babf9
const all = isUnion(
  isLiteral('initial'),
  isLiteral('inherit'),
  isLiteral('unset'),
  isLiteral('revert'),
);
const color = isUnion(isNamedColor, isHexColor, isString);
const width = isUnion(
  isString,
  isNumber,
  isLiteral('available'),
  isLiteral('min-content'),
  isLiteral('max-content'),
  isLiteral('fit-content'),
  isLiteral('auto'),
  isLength,
  isPercentage,
);
const borderWidth = isUnion(
  isNumber,
  isLiteral('thin'),
  isLiteral('medium'),
  isLiteral('thick'),
  isString,
  isLength,
);
const lengthPercentage = isStringOrNumber;
const bgImage = isUnion(isLiteral('none'), isString);
const borderImageSource = isUnion(isLiteral('none'), isString);
const time = isString;
const singleAnimationDirection = isUnion(
  isLiteral('normal'),
  isLiteral('reverse'),
  isLiteral('alternate'),
  isLiteral('alternate-reverse'),
);
const singleAnimationFillMode = isUnion(
  isLiteral('none'),
  isLiteral('forwards'),
  isLiteral('backwards'),
  isLiteral('both'),
);
const singleAnimationIterationCount = isUnion(isLiteral('infinite'), isNumber);
// TODO change this to a special function that looks for stylex.keyframes call
const singleAnimationName = isUnion(isLiteral('none'), () => true);
const singleAnimationPlayState = isUnion(
  isLiteral('running'),
  isLiteral('paused'),
);
const singleTransitionTimingFunction = isUnion(
  isLiteral('ease'),
  isLiteral('linear'),
  isLiteral('ease-in'),
  isLiteral('ease-out'),
  isLiteral('ease-in-out'),
  isLiteral('step-start'),
  isLiteral('step-end'),
  isString,
);
const attachment = isUnion(
  isLiteral('scroll'),
  isLiteral('fixed'),
  isLiteral('local'),
);
const blendMode = isUnion(
  isLiteral('normal'),
  isLiteral('multiply'),
  isLiteral('screen'),
  isLiteral('overlay'),
  isLiteral('darken'),
  isLiteral('lighten'),
  isLiteral('color-dodge'),
  isLiteral('color-burn'),
  isLiteral('hard-light'),
  isLiteral('soft-light'),
  isLiteral('difference'),
  isLiteral('exclusion'),
  isLiteral('hue'),
  isLiteral('saturation'),
  isLiteral('color'),
  isLiteral('luminosity'),
);
const bgSize = isUnion(isString, isLiteral('cover'), isLiteral('contain'));
const boxAlign = isUnion(
  isLiteral('start'),
  isLiteral('center'),
  isLiteral('end'),
  isLiteral('baseline'),
  isLiteral('stretch'),
);
const repeatStyle = isUnion(
  isLiteral('repeat-x'),
  isLiteral('repeat-y'),
  isString,
);
const backgroundPosition = isUnion(
  isString,
  isLiteral('top'),
  isLiteral('bottom'),
  isLiteral('left'),
  isLiteral('right'),
  isLiteral('center'),
);
const backgroundPositionX = isUnion(
  isString,
  isLiteral('left'),
  isLiteral('right'),
  isLiteral('center'),
);
const backgroundPositionY = isUnion(
  isString,
  isLiteral('top'),
  isLiteral('bottom'),
  isLiteral('center'),
);
const borderImageOutset = isString;
const borderImageRepeat = isUnion(
  isString,
  isLiteral('stretch'),
  isLiteral('repeat'),
  isLiteral('round'),
  isLiteral('space'),
);
const borderImageWidth = isString;
const borderImageSlice = isUnion(isStringOrNumber, isLiteral('fill'));
const box = isUnion(
  isLiteral('border-box'),
  isLiteral('padding-box'),
  isLiteral('content-box'),
);
const brStyle = isUnion(
  isLiteral('none'),
  isLiteral('hidden'),
  isLiteral('dotted'),
  isLiteral('dashed'),
  isLiteral('solid'),
  isLiteral('double'),
  isLiteral('groove'),
  isLiteral('ridge'),
  isLiteral('inset'),
  isLiteral('outset'),
);
const CSSCursor = isUnion(
  isLiteral('auto'),
  isLiteral('default'),
  isLiteral('none'),
  isLiteral('context-menu'),
  isLiteral('help'),
  isLiteral('pointer'),
  isLiteral('progress'),
  isLiteral('wait'),
  isLiteral('cell'),
  isLiteral('crosshair'),
  isLiteral('text'),
  isLiteral('vertical-text'),
  isLiteral('alias'),
  isLiteral('copy'),
  isLiteral('move'),
  isLiteral('no-drop'),
  isLiteral('not-allowed'),
  isLiteral('e-resize'),
  isLiteral('n-resize'),
  isLiteral('ne-resize'),
  isLiteral('nw-resize'),
  isLiteral('s-resize'),
  isLiteral('se-resize'),
  isLiteral('sw-resize'),
  isLiteral('w-resize'),
  isLiteral('ew-resize'),
  isLiteral('ns-resize'),
  isLiteral('nesw-resize'),
  isLiteral('nwse-resize'),
  isLiteral('col-resize'),
  isLiteral('row-resize'),
  isLiteral('all-scroll'),
  isLiteral('zoom-in'),
  isLiteral('zoom-out'),
  isLiteral('grab'),
  isLiteral('grabbing'),
  isLiteral('-webkit-grab'),
  isLiteral('-webkit-grabbing'),
);
const relativeSize = isUnion(isLiteral('larger'), isLiteral('smaller'));
const emptyCells = isUnion(isLiteral('show'), isLiteral('hide'));
const filter = isUnion(isLiteral('none'), isString);
// const flex = isUnion(isLiteral('none'), isString, isNumber);
const flexBasis = isUnion(isLiteral('content'), isNumber, isString);
const flexDirection = isUnion(
  isLiteral('row'),
  isLiteral('row-reverse'),
  isLiteral('column'),
  isLiteral('column-reverse'),
);
const flexWrap = isUnion(
  isLiteral('nowrap'),
  isLiteral('wrap'),
  isLiteral('wrap-reverse'),
);
const flexGrow = isNumber;
const flexShrink = isNumber;
const flexFlow = isUnion(flexDirection, flexWrap);
const float = isUnion(
  isLiteral('left'),
  isLiteral('right'),
  isLiteral('none'),
  isLiteral('start'),
  isLiteral('end'),
  isLiteral('inline-start'),
  isLiteral('inline-end'),
);
// const font = isUnion(
//   isString,
//   isLiteral('caption'),
//   isLiteral('icon'),
//   isLiteral('menu'),
//   isLiteral('message-box'),
//   isLiteral('small-caption'),
//   isLiteral('status-bar'),
// );
const absoluteSize = isUnion(
  isLiteral('xx-small'),
  isLiteral('x-small'),
  isLiteral('small'),
  isLiteral('medium'),
  isLiteral('large'),
  isLiteral('x-large'),
  isLiteral('xx-large'),
);
const baselinePosition = isUnion(
  isLiteral('baseline'),
  isLiteral('first baseline'),
  isLiteral('last baseline'),
);
const fontFamily = isString;
const gridLine = isUnion(isLiteral('auto'), isString);
const gridTemplate = isUnion(isLiteral('none'), isLiteral('subgrid'), isString);
const gridTemplateAreas = isUnion(isLiteral('none'), isString);
const gridTemplateColumns = isUnion(
  isLiteral('none'),
  isLiteral('subgrid'),
  isString,
);
const gridTemplateRows = isUnion(
  isLiteral('none'),
  isLiteral('subgrid'),
  isString,
);
const gridRowGap = lengthPercentage;
const trackBreadth = isUnion(
  lengthPercentage,
  isString,
  isLiteral('min-content'),
  isLiteral('max-content'),
  isLiteral('auto'),
);
const selfPosition = isUnion(
  isLiteral('center'),
  isLiteral('start'),
  isLiteral('end'),
  isLiteral('self-start'),
  isLiteral('self-end'),
  isLiteral('flex-start'),
  isLiteral('flex-end'),
);
const listStyleType = isUnion(isString, isLiteral('none'));
const trackSize = isUnion(trackBreadth, isString);
const borderStyle = brStyle;
const columnRuleColor = color;
const columnRuleStyle = brStyle;
const columnRuleWidth = borderWidth;
const columnRule = isUnion(columnRuleWidth, columnRuleStyle, columnRuleColor);
const singleTimingFunction = singleTransitionTimingFunction;
const shapeBox = isUnion(box, isLiteral('margin-box'));
const geometryBox = isUnion(
  shapeBox,
  isLiteral('fill-box'),
  isLiteral('stroke-box'),
  isLiteral('view-box'),
);
const maskReference = isUnion(isLiteral('none'), isString);
const compositeOperator = isUnion(
  isLiteral('add'),
  isLiteral('subtract'),
  isLiteral('intersect'),
  isLiteral('exclude'),
);
const maskingMode = isUnion(
  isLiteral('alpha'),
  isLiteral('luminance'),
  isLiteral('match-source'),
);
const maskLayer = isUnion(
  maskReference,
  maskingMode,
  isString,
  repeatStyle,
  geometryBox,
  compositeOperator,
);

const alignContent = isUnion(
  isLiteral('flex-start'),
  isLiteral('flex-end'),
  isLiteral('center'),
  isLiteral('space-between'),
  isLiteral('space-around'),
  isLiteral('stretch'),
);
const alignItems = isUnion(
  isLiteral('start'),
  isLiteral('end'),
  isLiteral('flex-start'),
  isLiteral('flex-end'),
  isLiteral('center'),
  isLiteral('baseline'),
  isLiteral('stretch'),
);
const alignSelf = isUnion(
  isLiteral('auto'),
  isLiteral('flex-start'),
  isLiteral('flex-end'),
  isLiteral('center'),
  isLiteral('baseline'),
  isLiteral('stretch'),
);
const animationDelay = time;
const animationDirection = singleAnimationDirection;
const animationDuration = time;
const animationFillMode = singleAnimationFillMode;
const animationIterationCount = singleAnimationIterationCount;
const animationName = singleAnimationName;
const animationPlayState = singleAnimationPlayState;
const animationTimingFunction = singleTimingFunction;
const appearance = isUnion(
  isLiteral('auto'),
  isLiteral('none'),
  isLiteral('textfield'),
);
const backdropFilter = isUnion(isLiteral('none'), isString);
const backfaceVisibility = isUnion(isLiteral('visible'), isLiteral('hidden'));
// type background = string | finalBgLayer;
const backgroundAttachment = attachment;
const backgroundBlendMode = blendMode;
const backgroundClip = box;
const backgroundColor = color;
const backgroundImage = bgImage;
const backgroundOrigin = box;
const backgroundRepeat = repeatStyle;
const backgroundSize = bgSize;
const blockSize = width;
const border = isUnion(borderWidth, brStyle, color);
// const borderBlockEnd = isUnion(borderWidth, borderStyle, color);
// const borderBlockEndColor = color;
// const borderBlockEndStyle = borderStyle;
// const borderBlockEndWidth = borderWidth;
// const borderBlockStart = isUnion(borderWidth, borderStyle, color);
// const borderBlockStartColor = color;
// const borderBlockStartStyle = borderStyle;
// const borderBlockStartWidth = borderWidth;
const borderBottomLeftRadius = lengthPercentage;
const borderBottomRightRadius = lengthPercentage;
const borderBottomStyle = brStyle;
const borderBottomWidth = borderWidth;
const borderCollapse = isUnion(isLiteral('collapse'), isLiteral('separate'));
const borderColor = color;
const borderImage = isUnion(
  borderImageSource,
  borderImageSlice,
  isString,
  borderImageRepeat,
);
// const borderInlineEnd = isUnion(borderWidth, borderStyle, color);
// const borderInlineEndColor = color;
// const borderInlineEndStyle = borderStyle;
// const borderInlineEndWidth = borderWidth;
// const borderInlineStart = isUnion(borderWidth, borderStyle, color);
// const borderInlineStartColor = color;
// const borderInlineStartStyle = borderStyle;
// const borderInlineStartWidth = borderWidth;
const borderLeftColor = color;
const borderLeftStyle = brStyle;
const borderLeftWidth = borderWidth;
const borderRightColor = color;
const borderRightStyle = brStyle;
const borderRightWidth = borderWidth;
const borderRadius = lengthPercentage;
const borderSpacing = isNumber;
const borderTopLeftRadius = lengthPercentage;
const borderTopRightRadius = lengthPercentage;
const borderTopStyle = brStyle;
const borderTopWidth = borderWidth;
const boxDecorationBreak = isUnion(isLiteral('slice'), isLiteral('clone'));
const boxDirection = isUnion(isLiteral('normal'), isLiteral('reverse'));
const boxFlex = isNumber;
const boxFlexGroup = isNumber;
const boxLines = isUnion(isLiteral('single'), isLiteral('multiple'));
const boxOrdinalGroup = isNumber;
const boxOrient = isUnion(
  isLiteral('horizontal'),
  isLiteral('vertical'),
  isLiteral('inline-axis'),
  isLiteral('block-axis'),
);
const boxShadow = isUnion(isLiteral('none'), isString);
const boxSizing = isUnion(isLiteral('content-box'), isLiteral('border-box'));
const boxSuppress = isUnion(
  isLiteral('show'),
  isLiteral('discard'),
  isLiteral('hide'),
);
const breakAfter = isUnion(
  isLiteral('auto'),
  isLiteral('avoid'),
  isLiteral('avoid-page'),
  isLiteral('page'),
  isLiteral('left'),
  isLiteral('right'),
  isLiteral('recto'),
  isLiteral('verso'),
  isLiteral('avoid-column'),
  isLiteral('column'),
  isLiteral('avoid-region'),
  isLiteral('region'),
);
const breakBefore = isUnion(
  isLiteral('auto'),
  isLiteral('avoid'),
  isLiteral('avoid-page'),
  isLiteral('page'),
  isLiteral('left'),
  isLiteral('right'),
  isLiteral('recto'),
  isLiteral('verso'),
  isLiteral('avoid-column'),
  isLiteral('column'),
  isLiteral('avoid-region'),
  isLiteral('region'),
);
const breakInside = isUnion(
  isLiteral('auto'),
  isLiteral('avoid'),
  isLiteral('avoid-page'),
  isLiteral('avoid-column'),
  isLiteral('avoid-region'),
);
const captionSide = isUnion(
  isLiteral('top'),
  isLiteral('bottom'),
  isLiteral('block-start'),
  isLiteral('block-end'),
  isLiteral('inline-start'),
  isLiteral('inline-end'),
);
const clear = isUnion(
  isLiteral('none'),
  isLiteral('left'),
  isLiteral('right'),
  isLiteral('both'),
  isLiteral('inline-start'),
  isLiteral('inline-end'),
);
const clip = isUnion(isString, isLiteral('auto'));
const clipPath = isUnion(isString, isLiteral('none'));
const columnCount = isUnion(isNumber, isLiteral('auto'));
const columnFill = isUnion(isLiteral('auto'), isLiteral('balance'));
const columnGap = isUnion(isNumber, isString, isLiteral('normal'));
const columnSpan = isUnion(isLiteral('none'), isLiteral('all'));
const columnWidth = isUnion(isNumber, isLiteral('auto'));
const columns = isUnion(columnWidth, columnCount);
const contain = isUnion(
  isLiteral('none'),
  isLiteral('strict'),
  isLiteral('content'),
  isString,
);
const content = isString;
const counterIncrement = isUnion(isString, isLiteral('none'));
const counterReset = isUnion(isString, isLiteral('none'));
const cursor = CSSCursor;
const direction = isUnion(isLiteral('ltr'), isLiteral('rtl'));
const display = isUnion(
  isLiteral('none'),
  isLiteral('inline'),
  isLiteral('block'),
  isLiteral('list-item'),
  isLiteral('inline-list-item'),
  isLiteral('inline-block'),
  isLiteral('inline-table'),
  isLiteral('table'),
  isLiteral('table-cell'),
  isLiteral('table-column'),
  isLiteral('table-column-group'),
  isLiteral('table-footer-group'),
  isLiteral('table-header-group'),
  isLiteral('table-row'),
  isLiteral('table-row-group'),
  isLiteral('flex'),
  isLiteral('inline-flex'),
  isLiteral('grid'),
  isLiteral('inline-grid'),
  isLiteral('run-in'),
  isLiteral('ruby'),
  isLiteral('ruby-base'),
  isLiteral('ruby-text'),
  isLiteral('ruby-base-container'),
  isLiteral('ruby-text-container'),
  isLiteral('contents'),
);
const displayInside = isUnion(
  isLiteral('auto'),
  isLiteral('block'),
  isLiteral('table'),
  isLiteral('flex'),
  isLiteral('grid'),
  isLiteral('ruby'),
);
const displayList = isUnion(isLiteral('none'), isLiteral('list-item'));
const displayOutside = isUnion(
  isLiteral('block-level'),
  isLiteral('inline-level'),
  isLiteral('run-in'),
  isLiteral('contents'),
  isLiteral('none'),
  isLiteral('table-row-group'),
  isLiteral('table-header-group'),
  isLiteral('table-footer-group'),
  isLiteral('table-row'),
  isLiteral('table-cell'),
  isLiteral('table-column-group'),
  isLiteral('table-column'),
  isLiteral('table-caption'),
  isLiteral('ruby-base'),
  isLiteral('ruby-text'),
  isLiteral('ruby-base-container'),
  isLiteral('ruby-text-container'),
);
const fontFeatureSettings = isUnion(isLiteral('normal'), isString);
const fontKerning = isUnion(
  isLiteral('auto'),
  isLiteral('normal'),
  isLiteral('none'),
);
const fontLanguageOverride = isUnion(isLiteral('normal'), isString);
const fontSize = isUnion(absoluteSize, relativeSize, lengthPercentage);
const fontSizeAdjust = isUnion(isLiteral('none'), isNumber);
const fontStretch = isUnion(
  isLiteral('normal'),
  isLiteral('ultra-condensed'),
  isLiteral('extra-condensed'),
  isLiteral('condensed'),
  isLiteral('semi-condensed'),
  isLiteral('semi-expanded'),
  isLiteral('expanded'),
  isLiteral('extra-expanded'),
  isLiteral('ultra-expanded'),
);
const fontStyle = isUnion(
  isLiteral('normal'),
  isLiteral('italic'),
  isLiteral('oblique'),
);
const fontSynthesis = isUnion(isLiteral('none'), isString);
const fontVariant = isUnion(isLiteral('normal'), isLiteral('none'), isString);
const fontVariantAlternates = isUnion(isLiteral('normal'), isString);
const fontVariantCaps = isUnion(
  isLiteral('normal'),
  isLiteral('small-caps'),
  isLiteral('all-small-caps'),
  isLiteral('petite-caps'),
  isLiteral('all-petite-caps'),
  isLiteral('unicase'),
  isLiteral('titling-caps'),
);
const fontVariantEastAsian = isUnion(isLiteral('normal'), isString);
const fontVariantLigatures = isUnion(
  isLiteral('normal'),
  isLiteral('none'),
  isString,
);
const fontVariantNumeric = isUnion(isLiteral('normal'), isString);
const fontVariantPosition = isUnion(
  isLiteral('normal'),
  isLiteral('sub'),
  isLiteral('super'),
);
const fontWeight = isUnion(
  isLiteral('normal'),
  isLiteral('bold'),
  isLiteral('bolder'),
  isLiteral('lighter'),
  isLiteral(100),
  isLiteral(200),
  isLiteral(300),
  isLiteral(400),
  isLiteral(500),
  isLiteral(600),
  isLiteral(700),
  isLiteral(800),
  isLiteral(900),
);
const grid = isUnion(gridTemplate, isString);
const gridArea = isUnion(gridLine, isString);
const gridAutoColumns = trackSize;
const gridAutoFlow = isUnion(isString, isLiteral('dense'));
const gridAutoRows = trackSize;
const gridColumn = isUnion(gridLine, isString);
const gridColumnEnd = gridLine;
const gridColumnGap = lengthPercentage;
const gridColumnStart = gridLine;
const gridGap = isUnion(gridRowGap, gridColumnGap);
const gridRow = isUnion(gridLine, isString);
const gridRowEnd = gridLine;
const gridRowStart = gridLine;
const hyphens = isUnion(
  isLiteral('none'),
  isLiteral('manual'),
  isLiteral('auto'),
);
const imageOrientation = isUnion(isLiteral('from-image'), isNumber, isString);
const imageRendering = isUnion(
  isLiteral('auto'),
  isLiteral('crisp-edges'),
  isLiteral('pixelated'),
  isLiteral('optimizeSpeed'),
  isLiteral('optimizeQuality'),
  isString,
);
const imageResolution = isUnion(isString, isLiteral('snap'));
const imeMode = isUnion(
  isLiteral('auto'),
  isLiteral('normal'),
  isLiteral('active'),
  isLiteral('inactive'),
  isLiteral('disabled'),
);
const initialLetter = isUnion(isLiteral('normal'), isString);
const initialLetterAlign = isString;
const inlineSize = width;
const isolation = isUnion(isLiteral('auto'), isLiteral('isolate'));
const justifyContent = isUnion(
  isLiteral('flex-start'),
  isLiteral('flex-end'),
  isLiteral('center'),
  isLiteral('stretch'),
  isLiteral('space-between'),
  isLiteral('space-around'),
  isLiteral('space-evenly'),
);
const justifyItems = isUnion(
  isLiteral('start'),
  isLiteral('end'),
  isLiteral('flex-start'),
  isLiteral('flex-end'),
  isLiteral('center'),
  isLiteral('baseline'),
  isLiteral('stretch'),
);
// There's an optional overflowPosition (safe vs unsafe) prefix to
// [selfPosition | 'left' | 'right']. It's not used on www, so, it's not added
// here.
const justifySelf = isUnion(
  isLiteral('auto'),
  isLiteral('normal'),
  isLiteral('stretch'),
  baselinePosition,
  selfPosition,
  isLiteral('left'),
  isLiteral('right'),
);
const letterSpacing = isUnion(isLiteral('normal'), lengthPercentage);
const lineBreak = isUnion(
  isLiteral('auto'),
  isLiteral('loose'),
  isLiteral('normal'),
  isLiteral('strict'),
);
const lineHeight = isNumber;
const listStyleImage = isUnion(isString, isLiteral('none'));
const listStylePosition = isUnion(isLiteral('inside'), isLiteral('outside'));
const listStyle = isUnion(listStyleType, listStylePosition, listStyleImage);
const margin = isStringOrNumber;
const marginLeft = isUnion(isNumber, isString, isLiteral('auto'));
const marginRight = isUnion(isNumber, isString, isLiteral('auto'));
const marginTop = isUnion(isNumber, isString, isLiteral('auto'));
// const marginBlockEnd = marginLeft;
// const marginBlockStart = marginLeft;
const marginBottom = isUnion(isNumber, isString, isLiteral('auto'));
// const marginInlineEnd = marginLeft;
// const marginInlineStart = marginLeft;
const markerOffset = isUnion(isNumber, isLiteral('auto'));
const mask = maskLayer;
const maskClip = isString;
const maskComposite = compositeOperator;
const maskMode = maskingMode;
const maskOrigin = geometryBox;
const maskPosition = isString;
const maskRepeat = repeatStyle;
const maskSize = bgSize;
const maskType = isUnion(isLiteral('luminance'), isLiteral('alpha'));
const maxWidth = isUnion(
  isNumber,
  isString,
  isLiteral('none'),
  isLiteral('max-content'),
  isLiteral('min-content'),
  isLiteral('fit-content'),
  isLiteral('fill-available'),
);
const maxBlockSize = maxWidth;
const maxHeight = isUnion(
  isNumber,
  isString,
  isLiteral('none'),
  isLiteral('max-content'),
  isLiteral('min-content'),
  isLiteral('fit-content'),
  isLiteral('fill-available'),
);
const maxInlineSize = maxWidth;
const minWidth = isUnion(
  isNumber,
  isString,
  isLiteral('auto'),
  isLiteral('max-content'),
  isLiteral('min-content'),
  isLiteral('fit-content'),
  isLiteral('fill-available'),
);
const minBlockSize = minWidth;
const minHeight = isUnion(
  isNumber,
  isString,
  isLiteral('auto'),
  isLiteral('max-content'),
  isLiteral('min-content'),
  isLiteral('fit-content'),
  isLiteral('fill-available'),
);
const minInlineSize = minWidth;

const mixBlendMode = blendMode;
const motionPath = isUnion(isString, geometryBox, isLiteral('none'));
const motionOffset = lengthPercentage;
const motionRotation = isStringOrNumber;
const motion = isUnion(motionPath, motionOffset, motionRotation);
const objectFit = isUnion(
  isLiteral('fill'),
  isLiteral('contain'),
  isLiteral('cover'),
  isLiteral('none'),
  isLiteral('scale-down'),
);
const objectPosition = isString;
const offsetBlockEnd = isString;
const offsetBlockStart = isString;
const offsetInlineEnd = isString;
const offsetInlineStart = isString;
const opacity = isNumber;
const order = isNumber;
const orphans = isNumber;
const lexical = isString;
// const lexicalColor = isUnion(color, isLiteral('invert'));
// const lexicalOffset = isNumber;
// const lexicalStyle = isUnion(isLiteral('auto'), brStyle);
// const lexicalWidth = borderWidth;
const overflow = isUnion(
  isLiteral('visible'),
  isLiteral('hidden'),
  isLiteral('scroll'),
  isLiteral('auto'),
);
const overflowAnchor = isUnion(isLiteral('auto'), isLiteral('none'));
const overflowClipBox = isUnion(
  isLiteral('padding-box'),
  isLiteral('content-box'),
);
const overflowWrap = isUnion(
  isLiteral('normal'),
  isLiteral('break-word'),
  isLiteral('anywhere'),
);
const overflowX = isUnion(
  isLiteral('visible'),
  isLiteral('hidden'),
  isLiteral('scroll'),
  isLiteral('auto'),
);
const overflowY = isUnion(
  isLiteral('visible'),
  isLiteral('hidden'),
  isLiteral('scroll'),
  isLiteral('auto'),
);
const overscrollBehavior = isUnion(
  isLiteral('none'),
  isLiteral('contain'),
  isLiteral('auto'),
);
const overscrollBehaviorX = isUnion(
  isLiteral('none'),
  isLiteral('contain'),
  isLiteral('auto'),
);
const overscrollBehaviorY = isUnion(
  isLiteral('none'),
  isLiteral('contain'),
  isLiteral('auto'),
);
const padding = isStringOrNumber;
const paddingLeft = isStringOrNumber;
// const paddingBlockEnd = paddingLeft;
// const paddingBlockStart = paddingLeft;
const paddingBottom = isStringOrNumber;
const paddingRight = isStringOrNumber;
const paddingTop = isStringOrNumber;
const pageBreakAfter = isUnion(
  isLiteral('auto'),
  isLiteral('always'),
  isLiteral('avoid'),
  isLiteral('left'),
  isLiteral('right'),
);
const pageBreakBefore = isUnion(
  isLiteral('auto'),
  isLiteral('always'),
  isLiteral('avoid'),
  isLiteral('left'),
  isLiteral('right'),
);
const pageBreakInside = isUnion(isLiteral('auto'), isLiteral('avoid'));
const perspective = isUnion(isLiteral('none'), isNumber);
const perspectiveOrigin = isString;
const pointerEvents = isUnion(
  isLiteral('auto'),
  isLiteral('none'),
  isLiteral('visiblePainted'),
  isLiteral('visibleFill'),
  isLiteral('visibleStroke'),
  isLiteral('visible'),
  isLiteral('painted'),
  isLiteral('fill'),
  isLiteral('stroke'),
  isLiteral('all'),
);
const position = isUnion(
  isLiteral('static'),
  isLiteral('relative'),
  isLiteral('absolute'),
  isLiteral('sticky'),
  isLiteral('fixed'),
);
const quotes = isUnion(isString, isLiteral('none'));
const resize = isUnion(
  isLiteral('none'),
  isLiteral('both'),
  isLiteral('horizontal'),
  isLiteral('vertical'),
);
const rubyAlign = isUnion(
  isLiteral('start'),
  isLiteral('center'),
  isLiteral('space-between'),
  isLiteral('space-around'),
);
const rubyMerge = isUnion(
  isLiteral('separate'),
  isLiteral('collapse'),
  isLiteral('auto'),
);
const rubyPosition = isUnion(
  isLiteral('over'),
  isLiteral('under'),
  isLiteral('inter-character'),
);
const scrollBehavior = isUnion(isLiteral('auto'), isLiteral('smooth'));
const scrollSnapPaddingBottom = isNumber;
const scrollSnapPaddingTop = isNumber;
const scrollSnapAlign = isUnion(
  isLiteral('none'),
  isLiteral('start'),
  isLiteral('end'),
  isLiteral('center'),
);
const scrollSnapType = isUnion(
  isLiteral('none'),
  isLiteral('x mandatory'),
  isLiteral('y mandatory'),
);
const shapeImageThreshold = isNumber;
const shapeMargin = lengthPercentage;
const shapeOutside = isUnion(isLiteral('none'), shapeBox, isString);
const tabSize = isNumber;
const tableLayout = isUnion(isLiteral('auto'), isLiteral('fixed'));
const textAlign = isUnion(
  isLiteral('start'),
  isLiteral('end'),
  isLiteral('left'),
  isLiteral('right'),
  isLiteral('center'),
  isLiteral('justify'),
  isLiteral('match-parent'),
);
const textAlignLast = isUnion(
  isLiteral('auto'),
  isLiteral('start'),
  isLiteral('end'),
  isLiteral('left'),
  isLiteral('right'),
  isLiteral('center'),
  isLiteral('justify'),
);
const textCombineUpright = isUnion(
  isLiteral('none'),
  isLiteral('all'),
  isString,
);
const textDecorationColor = color;
const textDecorationLine = isUnion(
  isLiteral('none'),
  isLiteral('underline'),
  isLiteral('overline'),
  isLiteral('line-through'),
  isLiteral('blink'),
  isString,
);
// const textDecorationSkip = isUnion(isLiteral('none'), isString);
const textDecorationStyle = isUnion(
  isLiteral('solid'),
  isLiteral('double'),
  isLiteral('dotted'),
  isLiteral('dashed'),
  isLiteral('wavy'),
);
const textDecoration = isUnion(
  textDecorationLine,
  textDecorationStyle,
  textDecorationColor,
);
const textEmphasisColor = color;
const textEmphasisPosition = isString;
const textEmphasisStyle = isUnion(
  isLiteral('none'),
  isLiteral('filled'),
  isLiteral('open'),
  isLiteral('dot'),
  isLiteral('circle'),
  isLiteral('double-circle'),
  isLiteral('triangle'),
  isLiteral('filled sesame'),
  isLiteral('open sesame'),
  isString,
);
const textEmphasis = isUnion(textEmphasisStyle, textEmphasisColor);
const textIndent = isUnion(
  lengthPercentage,
  isLiteral('hanging'),
  isLiteral('each-line'),
);
const textOrientation = isUnion(
  isLiteral('mixed'),
  isLiteral('upright'),
  isLiteral('sideways'),
);
const textOverflow = isUnion(
  isLiteral('clip'),
  isLiteral('ellipsis'),
  isString,
);
const textRendering = isUnion(
  isLiteral('auto'),
  isLiteral('optimizeSpeed'),
  isLiteral('optimizeLegibility'),
  isLiteral('geometricPrecision'),
);
const textShadow = isUnion(isLiteral('none'), isString);
const textSizeAdjust = isUnion(isLiteral('none'), isLiteral('auto'), isString);
const textTransform = isUnion(
  isLiteral('none'),
  isLiteral('capitalize'),
  isLiteral('uppercase'),
  isLiteral('lowercase'),
  isLiteral('full-width'),
);
const textUnderlinePosition = isUnion(
  isLiteral('auto'),
  isLiteral('under'),
  isLiteral('left'),
  isLiteral('right'),
  isString,
);
const touchAction = isUnion(
  isLiteral('auto'),
  isLiteral('none'),
  isString,
  isLiteral('manipulation'),
);
const transform = isUnion(isLiteral('none'), isString);
const transformBox = isUnion(
  isLiteral('border-box'),
  isLiteral('fill-box'),
  isLiteral('view-box'),
  isLiteral('content-box'),
  isLiteral('stroke-box'),
);
const transformOrigin = isStringOrNumber;
const transformStyle = isUnion(isLiteral('flat'), isLiteral('preserve-3d'));
const transitionDelay = time;
const transitionDuration = time;
const transitionProperty = isUnion(
  isLiteral('opacity'),
  isLiteral('transform'),
  isLiteral('opacity, transform'),
  // All is bad for animation performance.
  // isLiteral('all'),
  isLiteral('none'),
);
const transitionTimingFunction = singleTransitionTimingFunction;
const unicodeBidi = isUnion(
  isLiteral('normal'),
  isLiteral('embed'),
  isLiteral('isolate'),
  isLiteral('bidi-override'),
  isLiteral('isolate-override'),
  isLiteral('plaintext'),
);
const userSelect = isUnion(
  isLiteral('auto'),
  isLiteral('text'),
  isLiteral('none'),
  isLiteral('contain'),
  isLiteral('all'),
);
const verticalAlign = isUnion(
  isLiteral('baseline'),
  isLiteral('sub'),
  isLiteral('super'),
  isLiteral('text-top'),
  isLiteral('text-bottom'),
  isLiteral('middle'),
  isLiteral('top'),
  isLiteral('bottom'),
  isString,
  isNumber,
);
const visibility = isUnion(
  isLiteral('visible'),
  isLiteral('hidden'),
  isLiteral('collapse'),
);
const whiteSpace = isUnion(
  isLiteral('normal'),
  isLiteral('pre'),
  isLiteral('nowrap'),
  isLiteral('pre-wrap'),
  isLiteral('pre-line'),
  isLiteral('break-spaces'),
);
const widows = isNumber;
const animatableFeature = isUnion(
  isLiteral('scroll-position'),
  isLiteral('contents'),
  isString,
);
const willChange = isUnion(isLiteral('auto'), animatableFeature);
const nonStandardWordBreak = isLiteral('break-word');
const wordBreak = isUnion(
  isLiteral('normal'),
  isLiteral('break-all'),
  isLiteral('keep-all'),
  nonStandardWordBreak,
);
const wordSpacing = isUnion(isLiteral('normal'), lengthPercentage);
const wordWrap = isUnion(isLiteral('normal'), isLiteral('break-word'));
const svgWritingMode = isUnion(
  isLiteral('lr-tb'),
  isLiteral('rl-tb'),
  isLiteral('tb-rl'),
  isLiteral('lr'),
  isLiteral('rl'),
  isLiteral('tb'),
);
const writingMode = isUnion(
  isLiteral('horizontal-tb'),
  isLiteral('vertical-rl'),
  isLiteral('vertical-lr'),
  isLiteral('sideways-rl'),
  isLiteral('sideways-lr'),
  svgWritingMode,
);
const zIndex = isUnion(isLiteral('auto'), isNumber);
const alignmentBaseline = isUnion(
  isLiteral('auto'),
  isLiteral('baseline'),
  isLiteral('before-edge'),
  isLiteral('text-before-edge'),
  isLiteral('middle'),
  isLiteral('central'),
  isLiteral('after-edge'),
  isLiteral('text-after-edge'),
  isLiteral('ideographic'),
  isLiteral('alphabetic'),
  isLiteral('hanging'),
  isLiteral('mathematical'),
);
const svgLength = isStringOrNumber;
const baselineShift = isUnion(
  isLiteral('baseline'),
  isLiteral('sub'),
  isLiteral('super'),
  svgLength,
);
const behavior = isString;
const clipRule = isUnion(isLiteral('nonzero'), isLiteral('evenodd'));
const cueAfter = isUnion(isStringOrNumber, isLiteral('none'));
const cueBefore = isUnion(isStringOrNumber, isLiteral('none'));
const cue = isUnion(cueBefore, cueAfter);
const dominantBaseline = isUnion(
  isLiteral('auto'),
  isLiteral('use-script'),
  isLiteral('no-change'),
  isLiteral('reset-size'),
  isLiteral('ideographic'),
  isLiteral('alphabetic'),
  isLiteral('hanging'),
  isLiteral('mathematical'),
  isLiteral('central'),
  isLiteral('middle'),
  isLiteral('text-after-edge'),
  isLiteral('text-before-edge'),
);
const paint = isUnion(
  isLiteral('none'),
  isLiteral('currentColor'),
  color,
  isString,
);
const fill = paint;
const fillOpacity = isNumber;
const fillRule = isUnion(isLiteral('nonzero'), isLiteral('evenodd'));
const glyphOrientationHorizontal = isNumber;
const glyphOrientationVertical = isNumber;
const kerning = isUnion(isLiteral('auto'), svgLength);
const marker = isUnion(isLiteral('none'), isString);
const markerEnd = isUnion(isLiteral('none'), isString);
const markerMid = isUnion(isLiteral('none'), isString);
const markerStart = isUnion(isLiteral('none'), isString);
const pauseAfter = isUnion(
  isNumber,
  isLiteral('none'),
  isLiteral('x-weak'),
  isLiteral('weak'),
  isLiteral('medium'),
  isLiteral('strong'),
  isLiteral('x-strong'),
);
const pauseBefore = isUnion(
  isNumber,
  isLiteral('none'),
  isLiteral('x-weak'),
  isLiteral('weak'),
  isLiteral('medium'),
  isLiteral('strong'),
  isLiteral('x-strong'),
);
const pause = isUnion(pauseBefore, pauseAfter);
const restAfter = isUnion(
  isNumber,
  isLiteral('none'),
  isLiteral('x-weak'),
  isLiteral('weak'),
  isLiteral('medium'),
  isLiteral('strong'),
  isLiteral('x-strong'),
);
const restBefore = isUnion(
  isNumber,
  isLiteral('none'),
  isLiteral('x-weak'),
  isLiteral('weak'),
  isLiteral('medium'),
  isLiteral('strong'),
  isLiteral('x-strong'),
);
const rest = isUnion(restBefore, restAfter);
const shapeRendering = isUnion(
  isLiteral('auto'),
  isLiteral('optimizeSpeed'),
  isLiteral('crispEdges'),
  isLiteral('geometricPrecision'),
);
const src = isString;
const speak = isUnion(
  isLiteral('auto'),
  isLiteral('none'),
  isLiteral('normal'),
);
const speakAs = isUnion(
  isLiteral('normal'),
  isLiteral('spell-out'),
  isLiteral('digits'),
  isString,
);
const stroke = paint;
const strokeDasharray = isUnion(isLiteral('none'), isString);
const strokeDashoffset = svgLength;
const strokeLinecap = isUnion(
  isLiteral('butt'),
  isLiteral('round'),
  isLiteral('square'),
);
const strokeLinejoin = isUnion(
  isLiteral('miter'),
  isLiteral('round'),
  isLiteral('bevel'),
);
const strokeMiterlimit = isNumber;
const strokeOpacity = isNumber;
const strokeWidth = svgLength;
const textAnchor = isUnion(
  isLiteral('start'),
  isLiteral('middle'),
  isLiteral('end'),
);
const unicodeRange = isString;
const voiceBalance = isUnion(
  isNumber,
  isLiteral('left'),
  isLiteral('center'),
  isLiteral('right'),
  isLiteral('leftwards'),
  isLiteral('rightwards'),
);
const voiceDuration = isUnion(isLiteral('auto'), time);
const voiceFamily = isUnion(isString, isLiteral('preserve'));
const voicePitch = isUnion(isNumber, isLiteral('absolute'), isString);
const voiceRange = isUnion(isNumber, isLiteral('absolute'), isString);
const voiceRate = isString;
const voiceStress = isUnion(
  isLiteral('normal'),
  isLiteral('strong'),
  isLiteral('moderate'),
  isLiteral('none'),
  isLiteral('reduced'),
);
const voiceVolume = isUnion(isLiteral('silent'), isString);
// const finalBgLayer = isUnion(
//   bgImage,
//   isString,
//   repeatStyle,
//   attachment,
//   box,
//   backgroundColor
// );
const maskImage = maskReference;
const top = isStringOrNumber;

const SupportedVendorSpecificCSSProperties = {
  MozOsxFontSmoothing: isLiteral('grayscale'),
  WebkitFontSmoothing: isLiteral('antialiased'),
  WebkitAppearance: isLiteral('textfield'),
  WebkitTapHighlightColor: color,
  WebkitOverflowScrolling: isLiteral('touch'),
};

/* eslint-disable object-shorthand */
const CSSProperties = {
  ...SupportedVendorSpecificCSSProperties,
  alignContent: alignContent,
  alignItems: alignItems,
  alignSelf: alignSelf,
  alignmentBaseline: alignmentBaseline,
  all: all,
  animationDelay: animationDelay,
  animationDirection: animationDirection,
  animationDuration: animationDuration,
  animationFillMode: animationFillMode,
  animationIterationCount: animationIterationCount,
  animationName: animationName,
  animationPlayState: animationPlayState,
  animationTimingFunction: animationTimingFunction,
  appearance: appearance,
  backdropFilter: backdropFilter,
  backfaceVisibility: backfaceVisibility,
  backgroundAttachment: backgroundAttachment,
  backgroundBlendMode: backgroundBlendMode,
  backgroundClip: backgroundClip,
  backgroundColor: backgroundColor,
  backgroundImage: backgroundImage,
  backgroundOrigin: backgroundOrigin,
  backgroundPosition: backgroundPosition,
  backgroundPositionX: backgroundPositionX,
  backgroundPositionY: backgroundPositionY,
  backgroundRepeat: backgroundRepeat,
  backgroundSize: backgroundSize,
  baselineShift: baselineShift,
  behavior: behavior,
  blockSize: blockSize,
  border: border,
  borderHorizontal: border,
  borderVertical: border,
  // borderBlockEnd: borderBlockEnd,
  // borderBlockEndColor: borderBlockEndColor,
  // borderBlockEndStyle: borderBlockEndStyle,
  // borderBlockEndWidth: borderBlockEndWidth,
  // borderBlockStart: borderBlockStart,
  // borderBlockStartColor: borderBlockStartColor,
  // borderBlockStartStyle: borderBlockStartStyle,
  // borderBlockStartWidth: borderBlockStartWidth,
  borderBottom: border,
  borderBottomColor: color,
  borderBottomEndRadius: borderBottomRightRadius,
  // borderBottomLeftRadius: borderBottomLeftRadius,
  // borderBottomRightRadius: borderBottomRightRadius,
  borderBottomStartRadius: borderBottomLeftRadius,
  borderBottomStyle: borderBottomStyle,
  borderBottomWidth: borderBottomWidth,
  borderCollapse: borderCollapse,
  borderColor: borderColor,
  borderEnd: border,
  borderEndColor: borderRightColor,
  borderEndStyle: borderRightStyle,
  borderEndWidth: borderRightWidth,
  borderImage: borderImage,
  borderImageOutset: borderImageOutset,
  borderImageRepeat: borderImageRepeat,
  borderImageSlice: borderImageSlice,
  borderImageSource: borderImageSource,
  borderImageWidth: borderImageWidth,
  // borderInlineEnd: borderInlineEnd,
  // borderInlineEndColor: borderInlineEndColor,
  // borderInlineEndStyle: borderInlineEndStyle,
  // borderInlineEndWidth: borderInlineEndWidth,
  // borderInlineStart: borderInlineStart,
  // borderInlineStartColor: borderInlineStartColor,
  // borderInlineStartStyle: borderInlineStartStyle,
  // borderInlineStartWidth: borderInlineStartWidth,
  borderLeft: border,
  // borderLeftColor: borderLeftColor,
  // borderLeftStyle: borderLeftStyle,
  // borderLeftWidth: borderLeftWidth,
  borderRadius: borderRadius,
  borderRight: border,
  // borderRightColor: borderRightColor,
  // borderRightStyle: borderRightStyle,
  // borderRightWidth: borderRightWidth,
  borderSpacing: borderSpacing,
  borderStart: border,
  borderStartColor: borderLeftColor,
  borderStartStyle: borderLeftStyle,
  borderStartWidth: borderLeftWidth,
  borderStyle: borderStyle,
  borderTop: border,
  borderTopColor: color,
  borderTopEndRadius: borderTopRightRadius,
  // borderTopLeftRadius: borderTopLeftRadius,
  // borderTopRightRadius: borderTopRightRadius,
  borderTopStartRadius: borderTopLeftRadius,
  borderTopStyle: borderTopStyle,
  borderTopWidth: borderTopWidth,
  borderWidth: borderWidth,
  bottom: isStringOrNumber,
  boxAlign: boxAlign,
  boxDecorationBreak: boxDecorationBreak,
  boxDirection: boxDirection,
  boxFlex: boxFlex,
  boxFlexGroup: boxFlexGroup,
  boxLines: boxLines,
  boxOrdinalGroup: boxOrdinalGroup,
  boxOrient: boxOrient,
  boxShadow: boxShadow,
  boxSizing: boxSizing,
  boxSuppress: boxSuppress,
  breakAfter: breakAfter,
  breakBefore: breakBefore,
  breakInside: breakInside,
  captionSide: captionSide,
  clear: clear,
  clip: clip,
  clipPath: clipPath,
  clipRule: clipRule,
  color: color,
  columnCount: columnCount,
  columnFill: columnFill,
  columnGap: columnGap,
  columnRule: columnRule,
  columnRuleColor: columnRuleColor,
  columnRuleStyle: columnRuleStyle,
  columnRuleWidth: columnRuleWidth,
  columnSpan: columnSpan,
  columnWidth: columnWidth,
  columns: columns,
  contain: contain,
  content: content,
  counterIncrement: counterIncrement,
  counterReset: counterReset,
  cue: cue,
  cueAfter: cueAfter,
  cueBefore: cueBefore,
  cursor: cursor,
  direction: direction,
  display: display,
  displayInside: displayInside,
  displayList: displayList,
  displayOutside: displayOutside,
  dominantBaseline: dominantBaseline,
  emptyCells: emptyCells,
  end: isStringOrNumber,
  fill: fill,
  fillOpacity: fillOpacity,
  fillRule: fillRule,
  filter: filter,
  // flex: flex,
  flexBasis: flexBasis,
  flexDirection: flexDirection,
  flexFlow: flexFlow,
  flexGrow: flexGrow,
  flexShrink: flexShrink,
  flexWrap: flexWrap,
  float: float,
  // font: font,
  fontFamily: fontFamily,
  fontFeatureSettings: fontFeatureSettings,
  fontKerning: fontKerning,
  fontLanguageOverride: fontLanguageOverride,
  fontSize: fontSize,
  fontSizeAdjust: fontSizeAdjust,
  fontStretch: fontStretch,
  fontStyle: fontStyle,
  fontSynthesis: fontSynthesis,
  fontVariant: fontVariant,
  fontVariantAlternates: fontVariantAlternates,
  fontVariantCaps: fontVariantCaps,
  fontVariantEastAsian: fontVariantEastAsian,
  fontVariantLigatures: fontVariantLigatures,
  fontVariantNumeric: fontVariantNumeric,
  fontVariantPosition: fontVariantPosition,
  fontWeight: fontWeight,
  glyphOrientationHorizontal: glyphOrientationHorizontal,
  glyphOrientationVertical: glyphOrientationVertical,
  grid: grid,
  gridArea: gridArea,
  gridAutoColumns: gridAutoColumns,
  gridAutoFlow: gridAutoFlow,
  gridAutoRows: gridAutoRows,
  gridColumn: gridColumn,
  gridColumnEnd: gridColumnEnd,
  gridColumnGap: gridColumnGap,
  gridColumnStart: gridColumnStart,
  gridGap: gridGap,
  gridRow: gridRow,
  gridRowEnd: gridRowEnd,
  gridRowGap: gridRowGap,
  gridRowStart: gridRowStart,
  gridTemplate: gridTemplate,
  gridTemplateAreas: gridTemplateAreas,
  gridTemplateColumns: gridTemplateColumns,
  gridTemplateRows: gridTemplateRows,
  height: isStringOrNumber,
  hyphens: hyphens,
  imageOrientation: imageOrientation,
  imageRendering: imageRendering,
  imageResolution: imageResolution,
  imeMode: imeMode,
  initialLetter: initialLetter,
  initialLetterAlign: initialLetterAlign,
  inlineSize: inlineSize,
  isolation: isolation,
  justifyContent: justifyContent,
  justifyItems: justifyItems,
  justifySelf: justifySelf,
  kerning: kerning,
  left: isStringOrNumber,
  letterSpacing: letterSpacing,
  lineBreak: lineBreak,
  lineHeight: lineHeight,
  listStyle: listStyle,
  listStyleImage: listStyleImage,
  listStylePosition: listStylePosition,
  listStyleType: listStyleType,
  margin: margin,
  // marginBlockEnd: marginBlockEnd,
  // marginBlockStart: marginBlockStart,
  marginBottom: marginBottom,
  marginEnd: marginRight,
  marginHorizontal: marginLeft,
  // marginInlineEnd: marginInlineEnd,
  // marginInlineStart: marginInlineStart,
  marginLeft: marginLeft,
  marginRight: marginRight,
  marginStart: marginLeft,
  marginTop: marginTop,
  marginVertical: marginTop,

  marker: marker,
  markerEnd: markerEnd,
  markerMid: markerMid,
  markerOffset: markerOffset,
  markerStart: markerStart,
  mask: mask,
  maskClip: maskClip,
  maskComposite: maskComposite,
  maskImage: maskImage,
  maskMode: maskMode,
  maskOrigin: maskOrigin,
  maskPosition: maskPosition,
  maskRepeat: maskRepeat,
  maskSize: maskSize,
  maskType: maskType,
  maxBlockSize: maxBlockSize,
  maxHeight: maxHeight,
  maxInlineSize: maxInlineSize,
  maxWidth: maxWidth,
  minBlockSize: minBlockSize,
  minHeight: minHeight,
  minInlineSize: minInlineSize,
  minWidth: minWidth,
  mixBlendMode: mixBlendMode,
  motion: motion,
  motionOffset: motionOffset,
  motionPath: motionPath,
  motionRotation: motionRotation,
  objectFit: objectFit,
  objectPosition: objectPosition,
  offsetBlockEnd: offsetBlockEnd,
  offsetBlockStart: offsetBlockStart,
  offsetInlineEnd: offsetInlineEnd,
  offsetInlineStart: offsetInlineStart,
  opacity: opacity,
  order: order,
  orphans: orphans,
  lexical: lexical,
  // lexicalColor: lexicalColor,
  // lexicalOffset: lexicalOffset,
  // lexicalStyle: lexicalStyle,
  // lexicalWidth: lexicalWidth,
  overflow: overflow,
  overflowAnchor: overflowAnchor,
  overflowClipBox: overflowClipBox,
  overflowWrap: overflowWrap,
  overflowX: overflowX,
  overflowY: overflowY,
  overscrollBehavior: overscrollBehavior,
  overscrollBehaviorX: overscrollBehaviorX,
  overscrollBehaviorY: overscrollBehaviorY,
  padding: padding,
  // paddingBlockEnd: paddingBlockEnd,
  // paddingBlockStart: paddingBlockStart,
  paddingBottom: paddingBottom,
  paddingEnd: paddingRight,
  paddingHorizontal: paddingLeft,
  paddingLeft: paddingLeft,
  paddingRight: paddingRight,
  paddingStart: paddingLeft,
  paddingTop: paddingTop,
  paddingVertical: paddingTop,

  pageBreakAfter: pageBreakAfter,
  pageBreakBefore: pageBreakBefore,
  pageBreakInside: pageBreakInside,
  pause: pause,
  pauseAfter: pauseAfter,
  pauseBefore: pauseBefore,
  perspective: perspective,
  perspectiveOrigin: perspectiveOrigin,
  pointerEvents: pointerEvents,
  position: position,
  quotes: quotes,
  resize: resize,
  rest: rest,
  restAfter: restAfter,
  restBefore: restBefore,
  right: isStringOrNumber,
  rubyAlign: rubyAlign,
  rubyMerge: rubyMerge,
  rubyPosition: rubyPosition,
  scrollBehavior: scrollBehavior,
  scrollSnapPaddingBottom: scrollSnapPaddingBottom,
  scrollSnapPaddingTop: scrollSnapPaddingTop,
  scrollSnapAlign: scrollSnapAlign,
  scrollSnapType: scrollSnapType,
  shapeImageThreshold: shapeImageThreshold,
  shapeMargin: shapeMargin,
  shapeOutside: shapeOutside,
  shapeRendering: shapeRendering,
  speak: speak,
  speakAs: speakAs,
  src: src,
  start: isStringOrNumber,
  stroke: stroke,
  strokeDasharray: strokeDasharray,
  strokeDashoffset: strokeDashoffset,
  strokeLinecap: strokeLinecap,
  strokeLinejoin: strokeLinejoin,
  strokeMiterlimit: strokeMiterlimit,
  strokeOpacity: strokeOpacity,
  strokeWidth: strokeWidth,
  tabSize: tabSize,
  tableLayout: tableLayout,
  textAlign: textAlign,
  textAlignLast: textAlignLast,
  textAnchor: textAnchor,
  textCombineUpright: textCombineUpright,
  textDecoration: textDecoration,
  // textDecorationColor: textDecorationColor,
  // textDecorationLine: textDecorationLine,
  // textDecorationSkip: textDecorationSkip,
  // textDecorationStyle: textDecorationStyle,
  textEmphasis: textEmphasis,
  textEmphasisColor: textEmphasisColor,
  textEmphasisPosition: textEmphasisPosition,
  textEmphasisStyle: textEmphasisStyle,
  textIndent: textIndent,
  textOrientation: textOrientation,
  textOverflow: textOverflow,
  textRendering: textRendering,
  textShadow: textShadow,
  textSizeAdjust: textSizeAdjust,
  textTransform: textTransform,
  textUnderlinePosition: textUnderlinePosition,
  top: top,
  touchAction: touchAction,
  transform: transform,
  transformBox: transformBox,
  transformOrigin: transformOrigin,
  transformStyle: transformStyle,
  transitionDelay: transitionDelay,
  transitionDuration: transitionDuration,
  transitionProperty: transitionProperty,
  transitionTimingFunction: transitionTimingFunction,
  unicodeBidi: unicodeBidi,
  unicodeRange: unicodeRange,
  userSelect: userSelect,
  verticalAlign: verticalAlign,
  visibility: visibility,
  voiceBalance: voiceBalance,
  voiceDuration: voiceDuration,
  voiceFamily: voiceFamily,
  voicePitch: voicePitch,
  voiceRange: voiceRange,
  voiceRate: voiceRate,
  voiceStress: voiceStress,
  voiceVolume: voiceVolume,
  whiteSpace: whiteSpace,
  widows: widows,
  width: width,
  willChange: willChange,
  wordBreak: wordBreak,
  wordSpacing: wordSpacing,
  wordWrap: wordWrap,
  writingMode: writingMode,
  zIndex: zIndex,
};

for (const key of Object.keys(CSSProperties)) {
  CSSProperties[key] = isUnion(CSSProperties[key], all);
}

function isStylexCallee(node) {
  return (
    node.type === 'MemberExpression' &&
    node.object.type === 'Identifier' &&
    node.object.name === 'stylex' &&
    node.property.type === 'Identifier' &&
    node.property.name === 'create'
  );
}

function isStylexDeclaration(node) {
  return (
    node &&
    node.type === 'CallExpression' &&
    isStylexCallee(node.callee) &&
    node.arguments.length === 1 &&
    node.arguments[0].type === 'ObjectExpression'
  );
}

const keyForNestedObject = isUnion(
  isLiteral(':first-child'),
  isLiteral(':last-child'),
  isLiteral(':only-child'),
  isLiteral(':nth-child'),
  isLiteral(':nth-of-type'),
  isLiteral(':hover'),
  isLiteral(':focus'),
  isLiteral(':focus-visible'),
  isLiteral(':active'),
  isLiteral(':disabled'),
  isLiteral('::placeholder'),
  isLiteral('::thumb'),
  // For styling input[type=number]
  isLiteral('::-webkit-inner-spin-button'),
  isLiteral('::-webkit-outer-spin-button'),
  // For styling input[type=search]
  isLiteral('::-webkit-search-decoration'),
  isLiteral('::-webkit-search-cancel-button'),
  isLiteral('::-webkit-search-results-button'),
  isLiteral('::-webkit-search-results-decoration'),
  isRegEx(/^@media/),
);

// Maybe add this later.
// const pseudoAllowlist = new Set([]);

module.exports = {
  create(context) {
    const variables = new Map();

    function checkStyleProperty(style, level = 0) {
      // currently ignoring preset spreads.
      if (style.type === 'Property') {
        if (style.value.type === 'ObjectExpression') {
          if (level > 0) {
            return context.report({
              node: style.value,
              loc: style.value.loc,
              message: 'You cannot nest styles more than one level deep',
            });
          }
          if (!keyForNestedObject(style.key /*not checking variables*/)) {
            return context.report({
              node: style.value,
              loc: style.value.loc,
              message:
                'Nested styles can only be used for the pseudo selectors in the stylex allowlist and for @media queries',
            });
          }
          return style.value.properties.forEach((prop) =>
            checkStyleProperty(prop, level + 1),
          );
        }
        if (style.computed && style.key.type !== 'Literal') {
          return context.report({
            node: style.key,
            loc: style.key.loc,
            message: 'Computed keys are not allowed within stylex.',
          });
        }
        if (style.key.type !== 'Literal' && style.key.type !== 'Identifier') {
          return context.report({
            node: style.key,
            loc: style.key.loc,
            message:
              'All keys in a stylex object must be static literal values.',
          });
        }
        const key =
          style.key.type === 'Identifier' ? style.key.name : style.key.value;
        const keyCheckerFunction = CSSProperties[key];
        if (keyCheckerFunction == null) {
          return context.report({
            node: style.key,
            loc: style.key.loc,
            message: 'This is not a key that is allowed by stylex',
          });
        }
        if (typeof keyCheckerFunction !== 'function') {
          throw new TypeError(`CSSProperties[${key}] is not a function`);
        }
        if (!keyCheckerFunction(style.value, variables)) {
          return context.report({
            node: style.value,
            loc: style.value.loc,
            message: `This is not a valid value that can be used for ${
              style.key.name
            }${
              key === 'lineHeight'
                ? '. Be careful when fixing: lineHeight: 10px is not the same as lineHeight: 10'
                : ''
            }`,
          });
        }
      }
    }

    return {
      Program(node) {
        // Keep track of all the top-level local variable declarations
        // This is because stylex allows you to use local constants in your styles
        node.body
          .filter(({type}) => type === 'VariableDeclaration')
          .map((constDecl) => constDecl.declarations)
          .reduce((arr, curr) => [...arr, ...curr], [])
          .filter((decl) => decl.id.type === 'Identifier')
          .forEach((decl) => variables.set(decl.id.name, decl.init));
      },
      CallExpression(node) {
        if (!isStylexDeclaration(node)) {
          return;
        }

        const namespaces = node.arguments[0];

        namespaces.properties.forEach((property) => {
          if (property.value.type !== 'ObjectExpression') {
            return context.report({
              node: property.value,
              loc: property.value.loc,
              message: 'Styles must be representes as javascript objects',
            });
          }

          const styles = property.value;
          styles.properties.forEach((prop) => checkStyleProperty(prop));
        });
      },
      'Program:exit'() {
        variables.clear();
      },
    };
  },
};

/* eslint-enable object-shorthand */
