/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable sort-keys */

'use strict';

// This is a list of unitless CSS properties that we shouldn't append `px` to
// when they're used as a number
const unitlessNumberProperties = new Set([
  'animation-iteration-count',
  'border-image-outset',
  'border-image-slice',
  'border-image-width',
  'column-count',
  'flex',
  'flex-grow',
  'flex-positive',
  'flex-shrink',
  'flex-order',
  'grid-row',
  'grid-column',
  'font-weight',
  'line-clamp',
  'line-height',
  'opacity',
  'order',
  'orphans',
  'tab-size',
  'widows',
  'z-index',
  'fill-opacity',
  'flood-opacity',
  'stop-opacity',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-miterlimit',
  'stroke-opacity',
  'stroke-width',
]);

// List of properties that have custom suffixes for numbers
const numberPropertySuffixes = {
  'animation-delay': 'ms',
  'animation-duration': 'ms',
  'transition-delay': 'ms',
  'transition-duration': 'ms',
  'voice-duration': 'ms',
};

// Whitelist of allowed pseudo selectors
const pseudoSelectorWhitelist = new Set([
  ':active',
  ':disabled',
  ':focus',
  ':hover',
  ':first-child',
  ':last-child',
  ':only-child',
  '::placeholder',
  // Generic pseudo-class so we don't repeat rules for vendor prefixes:
  // `::-webkit-slider-thumb`, `::-moz-range-thumb`, `::-ms-thumb`
  '::thumb',
  // For styling input[type=number]
  '::-webkit-inner-spin-button',
  '::-webkit-outer-spin-button',
  '::-webkit-scrollbar',
]);

// Whitelist of allowed pseudo selectors that can take arguments
const pseudoSelectorArgWhitelist = new Set([':nth-child', ':nth-of-type']);

// Properties that are considered invalid in older versions of webkit when they
// contain a CSS variable, AND are valid webkit properties. If you
// find yourself adding a property to this set, please refer to
// [this](https://developer.mozilla.org/en-US/docs/Web/CSS/WebKit_Extensions)
// for a list of valid webkit properties
const webkitCSSVariableEdgeCaseProperties = new Set(['box-shadow']);

// Order of priority to apply pseudo selectors
const pseudoPriorities = [
  ':first-child',
  ':last-child',
  ':only-child',
  ':nth-child',
  ':nth-of-type',
  ':hover',
  ':focus',
  ':active',
  ':disabled',
  '::placeholder',
  '::thumb',
  // '::-webkit-slider-thumb',
  // '::-moz-range-thumb',
  // '::-ms-thumb',
  // For styling input[type=number]
  '::-webkit-inner-spin-button',
  '::-webkit-outer-spin-button',
];

// List of properties that when present, override others declared before them
const overrideProperties = {
  padding: [
    'padding-left',
    'padding-right',
    'padding-top',
    'padding-bottom',
    'padding-block-end',
    'padding-block-start',
  ],
  margin: [
    'margin-left',
    'margin-right',
    'margin-top',
    'margin-bottom',
    'margin-block-end',
    'margin-block-start',
    'margin-inline-end',
    'margin-inline-start',
  ],
  border: [
    'border-block-end',
    'border-block-end-color',
    'border-block-end-style',
    'border-block-end-width',
    'border-block-start',
    'border-block-start-color',
    'border-block-start-style',
    'border-block-start-width',
    'border-bottom',
    'border-bottom-color',
    'border-bottom-style',
    'border-bottom-width',
    'border-collapse',
    'border-color',
    'border-image',
    'border-image-outset',
    'border-image-repeat',
    'border-image-slice',
    'border-image-source',
    'border-image-width',
    'border-inline-end',
    'border-inline-end-color',
    'border-inline-end-style',
    'border-inline-end-width',
    'border-inline-start',
    'border-inline-start-color',
    'border-inline-start-style',
    'border-inline-start-width',
    'border-left',
    'border-left-color',
    'border-left-style',
    'border-left-width',
    'border-right',
    'border-right-color',
    'border-right-style',
    'border-right-width',
    'border-spacing',
    'border-style',
    'border-top',
    'border-top-color',
    'border-top-style',
    'border-top-width',
    'border-width',
  ],
  'border-inline-end': [
    'border-inline-end-color',
    'border-inline-end-style',
    'border-inline-end-width',
  ],
  'border-inline-start': [
    'border-inline-start-color',
    'border-inline-start-style',
    'border-inline-start-width',
  ],
  'border-top': ['border-top-color', 'border-top-style', 'border-top-width'],
  'border-bottom': [
    'border-bottom-color',
    'border-bottom-style',
    'border-bottom-width',
  ],
  'border-left': [
    'border-left-color',
    'border-left-style',
    'border-left-width',
  ],
  'border-right': [
    'border-right-color',
    'border-right-style',
    'border-right-width',
  ],
  font: [
    'font-family',
    'font-feature-settings',
    'font-kerning',
    'font-language-override',
    'font-size',
    'font-size-adjust',
    'font-stretch',
    'font-style',
    'font-synthesis',
    'font-variant',
    'font-variant-alternates',
    'font-variant-caps',
    'font-variant-east-asian',
    'font-variant-ligatures',
    'font-variant-numeric',
    'font-variant-position',
    'font-weight',
  ],
  grid: [
    'grid-area',
    'grid-auto-columns',
    'grid-auto-flow',
    'grid-auto-rows',
    'grid-column',
    'grid-column-end',
    'grid-column-gap',
    'grid-column-start',
    'grid-gap',
    'grid-row',
    'grid-row-end',
    'grid-row-gap',
    'grid-row-start',
    'grid-template',
    'grid-template-areas',
    'grid-template-columns',
    'grid-template-rows',
  ],
  lexical: [
    'lexical',
    'lexical-color',
    'lexical-offset',
    'lexical-style',
    'lexical-width',
  ],
  overflow: [
    'overflow',
    'overflow-clip-box',
    'overflow-wrap',
    'overflow-x',
    'overflow-y',
  ],
  background: [
    'background-attachment',
    'background-blend-mode',
    'background-clip',
    'background-color',
    'background-image',
    'background-origin',
    'background-position',
    'background-position-x',
    'background-position-y',
    'background-repeat',
    'background-size',
  ],
  borderRadius: [
    'border-bottom-left-radius',
    'border-bottom-right-radius',
    'border-top-left-radius',
    'border-top-right-radius',
  ],
  'list-style': ['list-style-image', 'list-style-position', 'list-style-type'],
  animation: [
    'animation-delay',
    'animation-direction',
    'animation-duration',
    'animation-fill-mode',
    'animation-iteration-count',
    'animation-name',
    'animation-play-state',
    'animation-timing-function',
  ],
  flex: [
    'flex-basis',
    'flex-direction',
    'flex-flow',
    'flex-grow',
    'flex-shrink',
    'flex-wrap',
  ],
  'text-decoration': [
    'text-decoration-color',
    'text-decoration-line',
    'text-decoration-skip',
    'text-decoration-style',
  ],
  transition: [
    'transition-delay',
    'transition-duration',
    'transition-property',
    'transition-timing-function',
  ],
  transform: ['transform-box', 'transform-origin', 'transform-style'],
};

// Order of priority to apply to specific rules
const rulePriorities = {
  // The border rule is complicated and has multiple levels
  'border-bottom-color': 0.4,
  'border-end-color': 0.4,
  'border-left-color': 0.4,
  'border-right-color': 0.4,
  'border-start-color': 0.4,
  'border-top-color': 0.4,
  'border-bottom-style': 0.4,
  'border-end-style': 0.4,
  'border-left-style': 0.4,
  'border-right-style': 0.4,
  'border-start-style': 0.4,
  'border-top-style': 0.4,
  'border-bottom-width': 0.4,
  'border-end-width': 0.4,
  'border-left-width': 0.4,
  'border-right-width': 0.4,
  'border-start-width': 0.4,
  'border-top-width': 0.4,
  'border-bottom': 0.3,
  'border-end': 0.3,
  'border-left': 0.3,
  'border-right': 0.3,
  'border-start': 0.3,
  'border-top': 0.3,
  'border-inline-start': 0.2,
  'border-inline-end': 0.2,
  'border-color': 0.2,
  'border-width': 0.2,
  'border-style': 0.2,
  border: 0.1,

  // These rules have two levels
  'font-variant': 0.2,
  font: 0.1,
  'grid-template': 0.2,
  grid: 0.1,

  // These rules only have one "root"
  margin: 0.1,
  padding: 0.1,
  lexical: 0.1,
  background: 0.1,
  borderRadius: 0.1,
  'list-style': 0.1,
  animation: 0.1,
  flex: 0.1,
  overflow: 0.1,
  'text-decoration': 0.1,
  transition: 0.1,
  transform: 0.1,
};

// This is a map of properties to an array of prefixes that we should create
// duplicate rules for
const ALL_VENDORS = ['-moz-', '-webkit-', '-ms-'];
const vendorPrefixedRules = {
  appearance: ALL_VENDORS,
  'user-select': ALL_VENDORS,
};

// This is a map of properties to an array of specific pseudo-class prefixes that we should create
// duplicate rules for
const vendorPrefixedPseudoClasses = {
  '::thumb': ['::-webkit-slider-thumb', '::-moz-range-thumb', '::-ms-thumb'],
};

// We use this suffix to skip doing RTL flips for keyframes that don't need it
const animationNameIgnoreSuffix = '-B';

module.exports = {
  animationNameIgnoreSuffix,
  numberPropertySuffixes,
  overrideProperties,
  pseudoPriorities,
  pseudoSelectorArgWhitelist,
  pseudoSelectorWhitelist,
  rulePriorities,
  unitlessNumberProperties,
  vendorPrefixedRules,
  vendorPrefixedPseudoClasses,
  webkitCSSVariableEdgeCaseProperties,
};
