/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export type TestCase<TInput> = {
  name: string;
  only?: boolean;
} & TInput;

export type TestCases<TInput> = Array<TestCase<TInput>>;

type Callback<TInput> = (input: TInput) => void;

function testManyImpl<TInput>(
  testCases: TestCases<TInput>,
  cb: Callback<TInput>,
  only: boolean,
): void {
  for (const {name, only: testCaseOnly, ...input} of testCases) {
    // eslint-disable-next-line no-only-tests/no-only-tests
    const test_ = only || testCaseOnly === true ? test.only : test;
    // @ts-ignore
    test_(name, () => cb(input));
  }
}

function testManyOnly<TInput>(
  testCases: TestCases<TInput>,
  cb: Callback<TInput>,
): void {
  return testManyImpl(testCases, cb, true);
}

/*
 * testMany<string, string>(
 * [{name: '1 plus 1', input: '1+1', expected: '2'}],
 * ({input, expected}) => {
 *   expect(calc(input)).toBe(expected);
 * });
 */
export default function testMany<TInput>(
  testCases: TestCases<TInput>,
  cb: Callback<TInput>,
): void {
  return testManyImpl(testCases, cb, false);
}

testMany.only = testManyOnly;
