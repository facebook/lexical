/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useEffect} from 'react';
import * as React from 'react';

import lexicalLogo from '@/public/lexical.svg';

import useStore from '../../store';

interface Props {
  tabID: number;
}

function App({tabID}: Props) {
  const {
    devtoolsPanelLoadedForTabID,
    devtoolsPanelUnloadedForTabID,
    counter,
    increase,
    lexicalState,
  } = useStore();
  const states = lexicalState[tabID] ?? {};

  useEffect(() => {
    devtoolsPanelLoadedForTabID(tabID);

    return () => {
      devtoolsPanelUnloadedForTabID(tabID);
    };
  }, [devtoolsPanelLoadedForTabID, devtoolsPanelUnloadedForTabID, tabID]);

  return (
    <>
      <div>
        <a href="https://lexical.dev" target="_blank">
          <img src={lexicalLogo} className="logo" alt="Lexical logo" />
        </a>
      </div>
      <div className="card">
        <button onClick={() => increase(1)}>count is {counter}</button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      {Object.entries(states).map(([key, state]) => (
        <p key={key}>
          <b>ID: {key}</b>
          <br />
          <textarea readOnly={true} value={JSON.stringify(state)} rows={3} />
          <hr />
        </p>
      ))}
    </>
  );
}

export default App;
