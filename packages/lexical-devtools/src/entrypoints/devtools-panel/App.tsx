/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {IInjectedPegasusService} from '../injected/InjectedPegasusService';
import type {EditorState} from 'lexical';

import './App.css';

import {TreeView} from '@lexical/devtools-core';
import {getRPCService} from '@webext-pegasus/rpc';
import * as React from 'react';
import {useMemo, useState} from 'react';

import lexicalLogo from '@/public/lexical.svg';

import EditorsRefreshCTA from '../../components/EditorsRefreshCTA';
import {useExtensionStore} from '../../store';
import {SerializedRawEditorState} from '../../types';

interface Props {
  tabID: number;
}

function App({tabID}: Props) {
  const [errorMessage, setErrorMessage] = useState('');

  const {lexicalState} = useExtensionStore();
  const states = lexicalState[tabID] ?? {};
  const lexicalCount = Object.keys(states ?? {}).length;

  const injectedPegasusService = useMemo(
    () =>
      getRPCService<IInjectedPegasusService>('InjectedPegasusService', {
        context: 'window',
        tabId: tabID,
      }),
    [tabID],
  );

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
          <EditorsRefreshCTA tabID={tabID} setErrorMessage={setErrorMessage} />
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
              injectedPegasusService
                .setEditorReadOnly(key, isReadonly)
                .catch((e) => setErrorMessage(e.stack))
            }
            editorState={state as EditorState}
            setEditorState={(editorState) =>
              injectedPegasusService
                .setEditorState(key, editorState as SerializedRawEditorState)
                .catch((e) => setErrorMessage(e.stack))
            }
            generateContent={(exportDOM) =>
              injectedPegasusService.generateTreeViewContent(key, exportDOM)
            }
          />
          <hr />
        </div>
      ))}
    </>
  );
}

export default App;
