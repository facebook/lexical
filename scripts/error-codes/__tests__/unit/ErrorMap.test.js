/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @ts-check
'use strict';

const ErrorMap = require('../../ErrorMap');

/** @returns {Promise<void>} */
function waitTick() {
  return new Promise((resolve) => queueMicrotask(resolve));
}

describe('ErrorMap', () => {
  [
    {initialMessages: []},
    {
      initialMessages: ['known message', 'another known message'],
    },
  ].forEach(({name, initialMessages}) => {
    const initialMap = Object.fromEntries(
      initialMessages.map((message, i) => [`${i}`, message]),
    );
    describe(`with ${initialMessages.length} message(s)`, () => {
      test('does not insert unless extractCodes is true', async () => {
        const flush = jest.fn();
        const errorMap = new ErrorMap(initialMap, flush);
        expect(errorMap.getOrAddToErrorMap('unknown message', false)).toBe(
          undefined,
        );
        await waitTick();
        expect(flush).not.toBeCalled();
        expect(Object.keys(errorMap.errorMap).length).toEqual(
          initialMessages.length,
        );
      });
      if (initialMessages.length > 0) {
        test('looks up existing messages', async () => {
          const flush = jest.fn();
          const errorMap = new ErrorMap(initialMap, flush);
          initialMessages.forEach((msg, i) => {
            expect(errorMap.getOrAddToErrorMap(msg, false)).toBe(i);
          });
          expect(errorMap.dirty).toBe(false);
          initialMessages.forEach((msg, i) => {
            expect(errorMap.getOrAddToErrorMap(msg, true)).toBe(i);
          });
          expect(errorMap.dirty).toBe(false);
          await waitTick();
          expect(flush).not.toBeCalled();
        });
      }
      test('inserts with extractCodes true', async () => {
        const flush = jest.fn();
        const errorMap = new ErrorMap(initialMap, flush);
        const msg = 'unknown message';
        const beforeSize = initialMessages.length;
        expect(errorMap.getOrAddToErrorMap(msg, true)).toBe(beforeSize);
        expect(Object.keys(errorMap.errorMap).length).toEqual(1 + beforeSize);
        expect(Object.keys(errorMap.inverseErrorMap).length).toEqual(
          1 + beforeSize,
        );
        expect(errorMap.errorMap[beforeSize]).toBe(msg);
        expect(errorMap.inverseErrorMap[msg]).toBe(beforeSize);
        expect(errorMap.maxId).toBe(beforeSize);
        expect(flush).not.toBeCalled();
        expect(errorMap.dirty).toBe(true);
        await waitTick();
        expect(errorMap.dirty).toBe(false);
        expect(flush).toBeCalledWith({...initialMap, [`${beforeSize}`]: msg});
      });
      test('inserts two messages with extractCodes true', async () => {
        const flush = jest.fn();
        const errorMap = new ErrorMap(initialMap, flush);
        const msgs = ['unknown message', 'another unknown message'];
        msgs.forEach((msg, i) => {
          const beforeSize = i + initialMessages.length;
          expect(errorMap.getOrAddToErrorMap(msg, true)).toBe(beforeSize);
          expect(Object.keys(errorMap.errorMap).length).toEqual(1 + beforeSize);
          expect(Object.keys(errorMap.inverseErrorMap).length).toEqual(
            1 + beforeSize,
          );
          expect(errorMap.errorMap[beforeSize]).toBe(msg);
          expect(errorMap.inverseErrorMap[msg]).toBe(beforeSize);
          expect(errorMap.maxId).toBe(beforeSize);
          expect(flush).not.toBeCalled();
        });
        expect(errorMap.dirty).toBe(true);
        await waitTick();
        expect(errorMap.dirty).toBe(false);
        expect(flush).toBeCalledTimes(1);
        expect(flush).toBeCalledWith({
          ...initialMap,
          ...Object.fromEntries(
            msgs.map((msg, i) => [`${initialMessages.length + i}`, msg]),
          ),
        });
      });
    });
  });
});
