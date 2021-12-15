/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

// NOTE: duplicate these types in stylex.js in the comet codebase
// so that users can see the default types they are importing easily
// and for proper flow-types.

const absoluteFill = {
  bottom: 0,
  boxSizing: 'border-box',
  end: 0,
  position: 'absolute',
  start: 0,
  top: 0,
};

const absoluteCenter = {
  boxSizing: 'border-box',
  left: '50%',
  position: 'absolute',
  top: '50%',
  transform: 'translate(-50%, -50%)',
};

const blockBase = {
  borderStyle: 'solid',
  borderWidth: 0,
  boxSizing: 'border-box',
  display: 'block',
  flexGrow: 1,
  flexShrink: 0,
  marginBottom: 0,
  marginEnd: 0,
  marginStart: 0,
  marginTop: 0,
  paddingBottom: 0,
  paddingEnd: 0,
  paddingStart: 0,
  paddingTop: 0,
  position: 'relative',
  zIndex: 0,
};

const inlineBase = {
  ...blockBase,
  display: 'inline',
};

const buttonBase = {
  appearance: 'none',
  backgroundColor: 'transparent',
  borderStyle: 'solid',
  borderWidth: 0,
  boxSizing: 'border-box',
  cursor: 'pointer',
  marginBottom: 0,
  marginEnd: 0,
  marginStart: 0,
  marginTop: 0,
  paddingBottom: 0,
  paddingEnd: 0,
  paddingStart: 0,
  paddingTop: 0,
  position: 'relative',
  textAlign: 'inherit',
  zIndex: 0,
};

const flexBase = {
  alignItems: 'stretch',
  borderStyle: 'solid',
  borderWidth: 0,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  flexGrow: 1,
  flexShrink: 1,
  justifyContent: 'space-between',
  marginBottom: 0,
  marginEnd: 0,
  marginStart: 0,
  marginTop: 0,
  minHeight: 0,
  minWidth: 0,
  paddingBottom: 0,
  paddingEnd: 0,
  paddingStart: 0,
  paddingTop: 0,
  position: 'relative',
  zIndex: 0,
};

const flexInlineBase = {
  ...flexBase,
  display: 'inline-flex',
};

const linkBase = {
  backgroundColor: 'transparent',
  backgroundImage: 'none',
  boxSizing: 'border-box',
  color: 'inherit',
  cursor: 'pointer',
  position: 'relative',
  textDecoration: 'none',
  zIndex: 0,
};

const listBase = {
  boxSizing: 'border-box',
  listStyle: 'none',
  marginBottom: 0,
  marginTop: 0,
  paddingStart: 0,
};

const visuallyHidden = {
  clip: 'rect(0, 0, 0, 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  width: 1,
};

module.exports = {
  absoluteFill,
  absoluteCenter,
  blockBase,
  buttonBase,
  flexBase,
  flexInlineBase,
  inlineBase,
  linkBase,
  listBase,
  visuallyHidden,
};
