/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {registerEventListener} from 'lexical';
import {describe, expect, it, vi} from 'vitest';

describe('registerEventListener', () => {
  it('adds the listener and dispatches events to it', () => {
    const target = document.createElement('div');
    const listener = vi.fn();
    registerEventListener(target, 'click', listener);
    target.dispatchEvent(new Event('click'));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('returns a dispose function that removes the listener', () => {
    const target = document.createElement('div');
    const listener = vi.fn();
    const dispose = registerEventListener(target, 'click', listener);
    dispose();
    target.dispatchEvent(new Event('click'));
    expect(listener).not.toHaveBeenCalled();
  });

  it('forwards the capture option to addEventListener and removeEventListener', () => {
    const target = document.createElement('div');
    const addSpy = vi.spyOn(target, 'addEventListener');
    const removeSpy = vi.spyOn(target, 'removeEventListener');
    const listener = vi.fn();
    const options = {capture: true};
    const dispose = registerEventListener(target, 'click', listener, options);
    expect(addSpy).toHaveBeenCalledWith('click', listener, options);
    dispose();
    expect(removeSpy).toHaveBeenCalledWith('click', listener, options);
  });
});
