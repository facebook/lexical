/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {IInjectedPegasusService} from '../entrypoints/injected/InjectedPegasusService';

import {getRPCService} from '@webext-pegasus/rpc';
import * as React from 'react';
import {useState} from 'react';

interface Props {
  tabID: number;
  setErrorMessage: (value: string) => void;
}

function EditorsRefreshCTA({tabID, setErrorMessage}: Props) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshClick = () => {
    setIsRefreshing(true);

    const injectedPegasusService = getRPCService<IInjectedPegasusService>(
      'InjectedPegasusService',
      {context: 'window', tabId: tabID},
    );

    injectedPegasusService
      .refreshLexicalEditorsForTabID()
      .catch((err) => {
        setErrorMessage(err.message);
        console.error(err);
      })
      .finally(() => setIsRefreshing(false));
  };

  return (
    <button onClick={handleRefreshClick} disabled={isRefreshing}>
      {isRefreshing ? 'Refreshing...' : 'Refresh'}
    </button>
  );
}

export default EditorsRefreshCTA;
