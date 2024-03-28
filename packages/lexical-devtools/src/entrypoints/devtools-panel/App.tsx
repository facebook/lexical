/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as React from 'react';
import {useState} from 'react';
import {sendMessage} from 'webext-bridge/devtools';

import lexicalLogo from '@/public/lexical.svg';

import EditorsRefreshCTA from '../../components/EditorsRefreshCTA';
import useStore from '../../store';

interface Props {
  tabID: number;
}

function App({tabID}: Props) {
  const [errorMessage, setErrorMessage] = useState('');

  const {lexicalState} = useStore();
  const states = lexicalState[tabID] ?? {};
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
      {Object.entries(states).map(([key, state]) => (
        <p key={key}>
          <b>ID: {key}</b>
          <br />
          <textarea
            readOnly={true}
            value={JSON.stringify(state)}
            rows={5}
            cols={150}
          />
          <hr />
        </p>
      ))}
    </>
  );
}

export default App;
