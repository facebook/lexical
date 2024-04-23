/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './App.css';

import {
  Alert,
  AlertIcon,
  Box,
  ButtonGroup,
  Flex,
  Spacer,
} from '@chakra-ui/react';
import * as React from 'react';
import {useState} from 'react';

import lexicalLogo from '@/public/lexical.svg';

import EditorsRefreshCTA from '../../components/EditorsRefreshCTA';
import {useExtensionStore} from '../../store';
import {EditorInspectorButton} from './components/EditorInspectorButton';
import {EditorsList} from './components/EditorsList';

interface Props {
  tabID: number;
}

function App({tabID}: Props) {
  const [errorMessage, setErrorMessage] = useState('');

  const {lexicalState} = useExtensionStore();
  const states = lexicalState[tabID] ?? {};
  const lexicalCount = Object.keys(states ?? {}).length;

  return (
    <>
      <Flex>
        <Box p="4">
          <ButtonGroup variant="outline" spacing="2">
            <EditorInspectorButton
              tabID={tabID}
              setErrorMessage={setErrorMessage}
            />
            <EditorsRefreshCTA
              tabID={tabID}
              setErrorMessage={setErrorMessage}
            />
          </ButtonGroup>
        </Box>
        <Box p="4" alignContent="center">
          {states === undefined ? (
            <span>Loading...</span>
          ) : (
            <span>
              Found <b>{lexicalCount}</b> editor
              {lexicalCount > 1 || lexicalCount === 0 ? 's' : ''} on the page.
            </span>
          )}
        </Box>
        <Spacer />
        <Box p="2">
          <a href="https://lexical.dev" target="_blank">
            <img
              src={lexicalLogo}
              className="logo"
              width={178}
              height={40}
              alt="Lexical logo"
            />
          </a>
        </Box>
      </Flex>
      {errorMessage !== '' ? (
        <div className="card error">{errorMessage}</div>
      ) : null}

      <Box mt={5}>
        {lexicalCount > 0 ? (
          <EditorsList tabID={tabID} setErrorMessage={setErrorMessage} />
        ) : (
          <Alert status="info">
            <AlertIcon />
            No Lexical editors found on the page.
          </Alert>
        )}
      </Box>
    </>
  );
}

export default App;
