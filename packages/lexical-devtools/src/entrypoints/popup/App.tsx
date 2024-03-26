/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './App.css';

import * as React from 'react';
import {useState} from 'react';
import {sendMessage} from 'webext-bridge/popup';

import lexicalLogo from '@/public/lexical.svg';

import EditorsRefreshCTA from '../../components/EditorsRefreshCTA';
import useStore from '../../store';

interface Props {
  tabID: number;
}

function App({tabID}: Props) {
  const {lexicalState} = useStore();
  const [errorMessage, setErrorMessage] = useState('');

  const states = lexicalState[tabID];
  const lexicalCount = Object.keys(states ?? {}).length;

  return (
    <>
      <div>
        <a href="https://lexical.dev" target="_blank">
          <img src={lexicalLogo} className="logo" alt="Lexical logo" />
        </a>
      </div>
      {errorMessage !== '' ? (
        <div className="card error">{errorMessage}</div>
      ) : null}
      <div className="card">
        {states === undefined ? (
          <span>Loading...</span>
        ) : (
          <span>
            Found <b>{lexicalCount}</b> editor{lexicalCount > 1 ? 's' : ''} on
            the page
            {lexicalCount > 0 ? (
              <>
                {' '}
                &#x2705;
                <br />
                Open the developer tools, and "Lexical" tab will appear to the
                right.
              </>
            ) : null}
          </span>
        )}
        <p>
          <EditorsRefreshCTA
            tabID={tabID}
            setErrorMessage={setErrorMessage}
            sendMessage={sendMessage}
          />
        </p>
      </div>
    </>
  );
}

export default App;
