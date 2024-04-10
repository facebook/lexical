/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './App.css';

import {TreeView} from '@lexical/devtools-core';
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
          <img
            src={lexicalLogo}
            className="logo"
            width={150}
            alt="Lexical logo"
          />
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
            the page.
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
        <div key={key}>
          <b>ID: {key}</b>
          <br />
          <TreeView
            viewClassName="tree-view-output"
            treeTypeButtonClassName="debug-treetype-button"
            timeTravelPanelClassName="debug-timetravel-panel"
            timeTravelButtonClassName="debug-timetravel-button"
            timeTravelPanelSliderClassName="debug-timetravel-panel-slider"
            timeTravelPanelButtonClassName="debug-timetravel-panel-button"
            setEditorReadOnly={(isReadonly) =>
              sendMessage(
                'setEditorReadOnly',
                {isReadonly, key},
                `window@${tabID}`,
              ).catch((e) => setErrorMessage(e.stack))
            }
            editorState={state}
            setEditorState={(editorState) =>
              sendMessage(
                'setEditorState',
                {key, state: editorState},
                `window@${tabID}`,
              ).catch((e) => setErrorMessage(e.stack))
            }
            generateContent={(exportDOM) =>
              sendMessage(
                'generateTreeViewContent',
                {exportDOM, key},
                `window@${tabID}`,
              )
            }
          />
          <hr />
        </div>
      ))}
    </>
  );
}

export default App;
