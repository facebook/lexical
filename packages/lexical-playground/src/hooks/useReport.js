/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {useCallback, useEffect, useRef} from 'react';

const getElement = (): HTMLElement => {
  let element = document.getElementById('report-container');
  if (element === null) {
    element = document.createElement('div');
    element.id = 'report-container';
    element.style.position = 'fixed';
    element.style.top = '50%';
    element.style.left = '50%';
    element.style.fontSize = '32px';
    element.style.transform = 'translate(-50%, -50px)';
    element.style.padding = '20px';
    element.style.background = 'rgba(240, 240, 240, 0.4)';
    element.style.borderRadius = '20px';
    if (document.body) {
      document.body.appendChild(element);
    }
  }
  return element;
};

export default function useReport(): (string) => TimeoutID {
  const timer = useRef<TimeoutID | null>(null);
  const cleanup = useCallback(() => {
    clearTimeout(timer.current);
    if (document.body) {
      document.body.removeChild(getElement());
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return useCallback(
    (content) => {
      console.log(content);
      const element = getElement();
      clearTimeout(timer.current);
      element.innerHTML = content;
      timer.current = setTimeout(cleanup, 1000);
      return timer.current;
    },
    [cleanup],
  );
}
