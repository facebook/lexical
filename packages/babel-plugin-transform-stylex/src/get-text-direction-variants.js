/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const {animationNameIgnoreSuffix} = require('./constants.js');
const parser = require('postcss-value-parser');

/**
 * Given a CSS property key and value, generate the LTR and RTL variants
 */
function getTextDirectionVariants(key, value) {
  const simpleFlip = simpleDirectionFlips[key];
  if (simpleFlip != null) {
    return {
      ltr: {key: simpleFlip.ltr, value},
      rtl: {key: simpleFlip.rtl, value},
    };
  }

  if (
    key === 'margin' ||
    key === 'padding' ||
    key === 'border-color' ||
    key === 'border-width' ||
    key === 'border-style'
  ) {
    const flippedValue = flipBoxBorderNotation(value);

    if (flippedValue !== value) {
      return {
        ltr: {key, value},
        rtl: {key, value: flippedValue},
      };
    }
  }

  if (
    (key === 'animation-name' || key === 'animation') &&
    !value.endsWith(animationNameIgnoreSuffix)
  ) {
    return {
      ltr: {key, value: value + '-ltr'},
      rtl: {key, value: value + '-rtl'},
    };
  }

  if (key === 'border-radius') {
    const rtl = splitByDivisor(value)
      .map((part) => flipBoxCornerNotation(part).value)
      .join(' / ');

    if (rtl !== value) {
      return {
        ltr: {key, value},
        rtl: {key, value: rtl},
      };
    }
  }

  if (key === 'box-shadow' || key === 'text-shadow') {
    const defs = splitByDivisor(value);
    const builtDefs = [];

    for (const def of defs) {
      const parts = def.split(' ');
      const index = parser.unit(parts[0]) === false ? 1 : 0;
      if (index < parts.length) {
        parts[index] = flipSign(parts[index]);
      }
      builtDefs.push(parts.join(' '));
    }

    const rtl = builtDefs.join(', ');
    if (rtl !== value) {
      return {
        ltr: {key, value},
        rtl: {key, value: rtl},
      };
    }
  }

  if (
    key === 'background' ||
    key === 'background-position' ||
    key === 'background-position-x'
  ) {
    const ltr = transformASTLeftRight(value, true);
    const rtl = transformASTLeftRight(value, false);

    if (ltr !== rtl) {
      return {
        ltr: {key, value: ltr},
        rtl: {key, value: rtl},
      };
    }
  }

  if (key === 'float' || key === 'text-align') {
    if (value === 'start') {
      return {
        ltr: {key, value: 'left'},
        rtl: {key, value: 'right'},
      };
    }

    if (value === 'end') {
      return {
        ltr: {key, value: 'right'},
        rtl: {key, value: 'left'},
      };
    }
  }

  if (key === 'cursor') {
    let rtl = value;

    if (value === 'w-resize') {
      rtl = 'e-resize';
    }

    if (value === 'e-resize') {
      rtl = 'w-resize';
    }

    if (value === 'ne-resize') {
      rtl = 'nw-resize';
    }

    if (value === 'nw-resize') {
      rtl = 'ne-resize';
    }

    if (value === 'se-resize') {
      rtl = 'sw-resize';
    }

    if (value === 'sw-resize') {
      rtl = 'se-resize';
    }

    if (rtl !== value) {
      return {
        ltr: {key, value},
        rtl: {key, value: rtl},
      };
    }
  }

  return {
    ltr: {key, value},
    rtl: null,
  };
}

/**
 * Given a CSS rule value, split it by it's dividers
 */
function splitByDivisor(value) {
  const ast = parser(value);
  const groups = [];

  let currGroup = [];
  function push() {
    if (currGroup.length === 0) {
      return;
    }

    groups.push(parser.stringify(currGroup));
    currGroup = [];
  }

  for (const node of ast.nodes) {
    if (node.type === 'div') {
      push();
    } else {
      currGroup.push(node);
    }
  }

  push();

  return groups;
}

/**
 * Flip the values passed to a rule like border, padding etc.
 */
function flipBoxBorderNotation(value) {
  const parts = value.split(' ');

  if (parts.length === 4) {
    // top | right | bottom | left
    return `${parts[0]} ${parts[3]} ${parts[2]} ${parts[1]}`;
  } else {
    return value;
  }
}

/**
 * Given a notation passed to border-radius, flip the corners it refers to.
 * This is a bit hard to grok because of the various shorthands.
 */
function flipBoxCornerNotation(value) {
  const parts = value.split(' ');

  // top-left | top-right | bottom-right | bottom-left
  if (parts.length === 4) {
    return {
      flipped: true,
      value: `${parts[1]} ${parts[0]} ${parts[3]} ${parts[2]}`,
    };
  }

  // top-left-and-bottom-right | top-right-and-bottom-left
  if (parts.length === 2) {
    return {
      flipped: true,
      value: `${parts[1]} ${parts[0]}`,
    };
  }

  // top-left | top-right-and-bottom-left | bottom-right
  if (parts.length === 3) {
    return {
      flipped: true,
      value: `${parts[1]} ${parts[0]} ${parts[1]} ${parts[2]}`,
    };
  }

  return {
    flipped: false,
    value,
  };
}

function transformASTLeftRight(value, isLTR) {
  const ast = parser(value);

  for (const node of ast.nodes) {
    if (node.type !== 'word') {
      continue;
    }

    if (node.value === 'start') {
      node.value = isLTR ? 'left' : 'right';
    }

    if (node.value === 'end') {
      node.value = isLTR ? 'right' : 'left';
    }
  }

  return ast.toString();
}

// These are simple flips we need to do for RTL
const simpleDirectionFlips = {
  'padding-start': {
    ltr: 'padding-left',
    rtl: 'padding-right',
  },
  'padding-end': {
    ltr: 'padding-right',
    rtl: 'padding-left',
  },
  'margin-start': {
    ltr: 'margin-left',
    rtl: 'margin-right',
  },
  'margin-end': {
    ltr: 'margin-right',
    rtl: 'margin-left',
  },
  start: {
    ltr: 'left',
    rtl: 'right',
  },
  end: {
    ltr: 'right',
    rtl: 'left',
  },
  'border-start': {
    ltr: 'border-left',
    rtl: 'border-right',
  },
  'border-start-color': {
    ltr: 'border-left-color',
    rtl: 'border-right-color',
  },
  'border-start-width': {
    ltr: 'border-left-width',
    rtl: 'border-right-width',
  },
  'border-start-style': {
    ltr: 'border-left-style',
    rtl: 'border-right-style',
  },
  'border-end': {
    ltr: 'border-right',
    rtl: 'border-left',
  },
  'border-end-color': {
    ltr: 'border-right-color',
    rtl: 'border-left-color',
  },
  'border-end-width': {
    ltr: 'border-right-width',
    rtl: 'border-left-width',
  },
  'border-end-style': {
    ltr: 'border-right-style',
    rtl: 'border-left-style',
  },
  'border-top-start-radius': {
    ltr: 'border-top-left-radius',
    rtl: 'border-top-right-radius',
  },
  'border-bottom-start-radius': {
    ltr: 'border-bottom-left-radius',
    rtl: 'border-bottom-right-radius',
  },
  'border-top-end-radius': {
    ltr: 'border-top-right-radius',
    rtl: 'border-top-left-radius',
  },
  'border-bottom-end-radius': {
    ltr: 'border-bottom-right-radius',
    rtl: 'border-bottom-left-radius',
  },
};

function flipSign(value) {
  if (value === '0') {
    return value;
  } else {
    return value[0] === '-' ? value.slice(1) : '-' + value;
  }
}

module.exports = getTextDirectionVariants;
