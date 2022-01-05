/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const parser = require('postcss-value-parser');

function printNode(node) {
  switch (node.type) {
    case 'word':
    case 'string':
      return `${node.value}`;
    case 'function':
      return `${node.value}(${node.nodes.map(printNode).join('')})`;
    default:
      return node.value;
  }
}

// Using split(' ') Isn't enough bcause of values like calc.
function splitValue(str) {
  if (Array.isArray(str)) {
    return str;
  }

  const parsed = parser(str.trim());

  const nodes = parsed.nodes
    .filter((node) => node.type !== 'space' && node.type !== 'div')
    .map(printNode);

  if (
    nodes.length > 1 &&
    nodes[nodes.length - 1].toLowerCase() === '!important'
  ) {
    return nodes.slice(0, nodes.length - 1).map((node) => node + ' !important');
  }
  return nodes;
}

const expansions = {
  border: (rawValue) => {
    return [
      {rawKey: 'borderTop', rawValue},
      {rawKey: 'borderEnd', rawValue},
      {rawKey: 'borderBottom', rawValue},
      {rawKey: 'borderStart', rawValue},
    ];
  },
  borderColor: (rawValue) => {
    const [top, right = top, bottom = top, left = right] = splitValue(rawValue);

    return [
      {rawKey: 'borderTopColor', rawValue: top},
      {rawKey: 'borderEndColor', rawValue: right},
      {rawKey: 'borderBottomColor', rawValue: bottom},
      {rawKey: 'borderStartColor', rawValue: left},
    ];
  },
  borderHorizontal: (rawValue) => {
    return [
      {rawKey: 'borderStart', rawValue},
      {rawKey: 'borderEnd', rawValue},
    ];
  },
  borderStyle: (rawValue) => {
    const [top, right = top, bottom = top, left = right] = splitValue(rawValue);

    return [
      {rawKey: 'borderTopStyle', rawValue: top},
      {rawKey: 'borderEndStyle', rawValue: right},
      {rawKey: 'borderBottomStyle', rawValue: bottom},
      {rawKey: 'borderStartStyle', rawValue: left},
    ];
  },
  borderVertical: (rawValue) => {
    return [
      {rawKey: 'borderTop', rawValue},
      {rawKey: 'borderBottom', rawValue},
    ];
  },
  borderWidth: (rawValue) => {
    const [top, right = top, bottom = top, left = right] =
      typeof rawValue === 'number' ? [rawValue] : splitValue(rawValue);

    return [
      {rawKey: 'borderTopWidth', rawValue: top},
      {rawKey: 'borderEndWidth', rawValue: right},
      {rawKey: 'borderBottomWidth', rawValue: bottom},
      {rawKey: 'borderStartWidth', rawValue: left},
    ];
  },

  borderRadius: (rawValue) => {
    const [top, right = top, bottom = top, left = right] =
      typeof rawValue === 'string'
        ? splitValue(rawValue)
        : typeof rawValue === 'number'
        ? [rawValue]
        : rawValue; // remove

    return [
      {rawKey: 'borderTopStartRadius', rawValue: top},
      {rawKey: 'borderTopEndRadius', rawValue: right},
      {rawKey: 'borderBottomEndRadius', rawValue: bottom},
      {rawKey: 'borderBottomStartRadius', rawValue: left},
    ];
  },

  margin: (rawValue) => {
    const [top, right = top, bottom = top, left = right] =
      typeof rawValue === 'number' ? [rawValue] : splitValue(rawValue);

    return [
      {rawKey: 'marginTop', rawValue: top},
      {rawKey: 'marginEnd', rawValue: right},
      {rawKey: 'marginBottom', rawValue: bottom},
      {rawKey: 'marginStart', rawValue: left},
    ];
  },
  marginHorizontal: (rawValue) => {
    return [
      {rawKey: 'marginEnd', rawValue},
      {rawKey: 'marginStart', rawValue},
    ];
  },
  marginVertical: (rawValue) => {
    return [
      {rawKey: 'marginTop', rawValue},
      {rawKey: 'marginBottom', rawValue},
    ];
  },

  overflow: (rawValue) => {
    const [x, y = x] = splitValue(rawValue);
    return [
      {rawKey: 'overflowX', rawValue: x},
      {rawKey: 'overflowY', rawValue: y},
    ];
  },

  padding: (rawValue) => {
    const [top, right = top, bottom = top, left = right] =
      typeof rawValue === 'number' ? [rawValue] : splitValue(rawValue);

    return [
      {rawKey: 'paddingTop', rawValue: top},
      {rawKey: 'paddingEnd', rawValue: right},
      {rawKey: 'paddingBottom', rawValue: bottom},
      {rawKey: 'paddingStart', rawValue: left},
    ];
  },
  paddingHorizontal: (rawValue) => {
    return [
      {rawKey: 'paddingEnd', rawValue},
      {rawKey: 'paddingStart', rawValue},
    ];
  },
  paddingVertical: (rawValue) => {
    return [
      {rawKey: 'paddingTop', rawValue},
      {rawKey: 'paddingBottom', rawValue},
    ];
  },
};

function mapValuePathToProperty(rawKey, rawValue) {
  if (expansions[rawKey]) {
    return expansions[rawKey](rawValue);
  }
  return [{rawKey, rawValue}];
}

module.exports = mapValuePathToProperty;
