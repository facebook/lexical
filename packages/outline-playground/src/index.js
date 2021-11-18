/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import './setupEnv';
import React from 'react';
// $FlowFixMe: Flow doesn't understand react-dom
import {createRoot} from 'react-dom';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')).render(<App />);
