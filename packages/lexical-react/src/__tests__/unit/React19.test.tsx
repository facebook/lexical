/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as React from 'react';
import {createRoot, Root} from 'react-dom/client';
import * as ReactTestUtils from 'shared/react-test-utils';

const IS_REACT_19 = parseInt(React.version.split('.')[0], 10) >= 19;
const OVERRIDE_REACT_VERSION = process.env.OVERRIDE_REACT_VERSION ?? '';

describe(`React expectations (${React.version}) OVERRIDE_REACT_VERSION=${OVERRIDE_REACT_VERSION}`, () => {
  let container: HTMLDivElement;
  let reactRoot: Root;
  beforeEach(() => {
    container = document.createElement('div');
    reactRoot = createRoot(container);
    document.body.appendChild(container);
  });
  // This checks our assumption that we are testing against the correct version of React
  // The inverse is not checked so the test doesn't fail when our dependencies
  // are upgraded.
  if (OVERRIDE_REACT_VERSION) {
    test(`Expecting React >= 19`, () => {
      expect(IS_REACT_19).toBe(true);
    });
  }
  const cacheExpect = IS_REACT_19 ? 'cached' : 'not cached';
  test(`StrictMode useMemo is ${cacheExpect}`, () => {
    const memoFun = jest
      .fn()
      .mockReturnValueOnce('cached')
      .mockReturnValue('not cached');
    function MemoComponent() {
      return React.useMemo(memoFun, []);
    }
    ReactTestUtils.act(() => {
      reactRoot.render(
        <React.StrictMode>
          <MemoComponent />
        </React.StrictMode>,
      );
    });
    expect(container.textContent).toBe(cacheExpect);
    expect(memoFun).toBeCalledTimes(2);
  });
});
