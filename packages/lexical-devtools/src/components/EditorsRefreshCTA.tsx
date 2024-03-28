/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as React from 'react';
import {useState} from 'react';

interface Props {
  tabID: number;
  setErrorMessage: (value: string) => void;
  sendMessage: (message: string, t: null, target: string) => Promise<unknown>;
}

function EditorsRefreshCTA({tabID, setErrorMessage, sendMessage}: Props) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    sendMessage('refreshLexicalEditorsForTabID', null, `window@${tabID}`)
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
