/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {lazy} from 'react';

import Atomonedark from './atom-one-dark';

const Coldarkcold = lazy(() => import('./coldark-cold'));
const Onedark = lazy(() => import('./one-dark'));
const A11dark = lazy(() => import('./a11-dark'));
const Materialdark = lazy(() => import('./material-dark'));
const Materiallight = lazy(() => import('./material-light'));
const Materialocenic = lazy(() => import('./material-ocenic'));
const Onelight = lazy(() => import('./one-light'));
const Synthwave84 = lazy(() => import('./synthwave84'));
const Coldarkdark = lazy(() => import('./coldark-dark'));
const Nightowl = lazy(() => import('./night-owl'));
const Nord = lazy(() => import('./nord'));
const Shadesofpurple = lazy(() => import('./shades-of-purple'));
const Solarizeddarkatom = lazy(() => import('./solarized-dark-atom'));
const Vscdarkplus = lazy(() => import('./vsc-dark-plus'));
const Ztouch = lazy(() => import('./z-touch'));

const codeBlockThemes = {
  'a11-dark': A11dark,
  'atom-one-dark': Atomonedark,
  'coldark-cold': Coldarkcold,
  'coldark-dark': Coldarkdark,
  'material-dark': Materialdark,
  'material-light': Materiallight,
  'material-ocenic': Materialocenic,
  'night-owl': Nightowl,
  nord: Nord,
  'one-dark': Onedark,
  'one-light': Onelight,
  'shades-of-purple': Shadesofpurple,
  'solarized-dark-atom': Solarizeddarkatom,
  synthwave84: Synthwave84,
  'vsc-dark-plus': Vscdarkplus,
  'z-touch': Ztouch,
};

export default codeBlockThemes;
