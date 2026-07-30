/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {registerEventListeners} from 'lexical';
import {describe, expect, it, vi} from 'vitest';

describe('registerEventListeners', () => {
  it('registers every listener in the map', () => {
    const target = document.createElement('div');
    const onClick = vi.fn();
    const onKeyDown = vi.fn();
    registerEventListeners(target, {click: onClick, keydown: onKeyDown});
    target.dispatchEvent(new Event('click'));
    target.dispatchEvent(new Event('keydown'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  it('returns a dispose function that removes every listener', () => {
    const target = document.createElement('div');
    const onClick = vi.fn();
    const onKeyDown = vi.fn();
    const dispose = registerEventListeners(target, {
      click: onClick,
      keydown: onKeyDown,
    });
    dispose();
    target.dispatchEvent(new Event('click'));
    target.dispatchEvent(new Event('keydown'));
    expect(onClick).not.toHaveBeenCalled();
    expect(onKeyDown).not.toHaveBeenCalled();
  });

  it('forwards the shared options to add and removeEventListener', () => {
    const target = document.createElement('div');
    const addSpy = vi.spyOn(target, 'addEventListener');
    const removeSpy = vi.spyOn(target, 'removeEventListener');
    const onClick = vi.fn();
    const onKeyDown = vi.fn();
    const options = {capture: true};
    const dispose = registerEventListeners(
      target,
      {click: onClick, keydown: onKeyDown},
      options,
    );
    expect(addSpy).toHaveBeenCalledWith('click', onClick, options);
    expect(addSpy).toHaveBeenCalledWith('keydown', onKeyDown, options);
    dispose();
    expect(removeSpy).toHaveBeenCalledWith('click', onClick, options);
    expect(removeSpy).toHaveBeenCalledWith('keydown', onKeyDown, options);
  });
});
