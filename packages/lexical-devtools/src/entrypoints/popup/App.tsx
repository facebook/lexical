/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './App.css';

import {Box, Flex} from '@chakra-ui/react';
import * as React from 'react';
import {useState} from 'react';

import EditorsRefreshCTA from '../../components/EditorsRefreshCTA';
import {useExtensionStore} from '../../store';

interface Props {
  tabID: number;
}

function App({tabID}: Props) {
  const {lexicalState} = useExtensionStore();
  const [errorMessage, setErrorMessage] = useState('');

  const states = lexicalState[tabID];
  const lexicalCount = Object.keys(states ?? {}).length;

  return (
    <Flex direction="column">
      {errorMessage !== '' ? (
        <Box className="error" mb={2} color="red">
          {errorMessage}
        </Box>
      ) : null}
      <Box>
        {states === null ? (
          <span>
            This is a restricted browser page. Lexical DevTools cannot access
            this page.
          </span>
        ) : states === undefined ? (
          <span>Loading...</span>
        ) : (
          <>
            <Box>
              Found <b>{lexicalCount}</b> editor
              {lexicalCount > 1 || lexicalCount === 0 ? 's' : ''} on the page
              {lexicalCount > 0 ? (
                <>
                  {' '}
                  &#x2705;
                  <br />
                  Open the developer tools, and "Lexical" tab will appear to the
                  right.
                </>
              ) : null}
            </Box>

            <Box mt={1}>
              <EditorsRefreshCTA
                tabID={tabID}
                setErrorMessage={setErrorMessage}
              />
            </Box>
          </>
        )}
      </Box>
    </Flex>
  );
}

export default App;
