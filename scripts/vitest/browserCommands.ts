/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Custom commands for the browser test project. They run in the Vitest
// process with the Playwright provider's page, and tests call them through
// `commands` from 'vitest/browser', whose types are derived from these in
// packages/lexical/src/__tests__/browser/utils/vitest.d.ts.

import type {} from '@vitest/browser-playwright';
import type {BrowserCommandContext} from 'vitest/node';

import {strict as assert} from 'node:assert';

type Point = [x: number, y: number];

/**
 * Drive a real mouse drag through `points` (relative to the top-left of
 * `selector`'s border box), so the browser's own hit testing and
 * drag-extension logic decide the selection. Synthetic
 * Selection.setBaseAndExtent/extend calls do not model that. The mouse moves
 * between the points in steps of at most `maxStep` pixels. A clickCount above
 * 1 makes the press that drags the last click of a double or triple click.
 */
async function mouseDrag(
  {frame, page}: BrowserCommandContext,
  selector: string,
  points: [first: Point, ...rest: Point[]],
  {
    clickCount = 1,
    maxStep = Infinity,
  }: {clickCount?: number; maxStep?: number} = {},
): Promise<void> {
  const testFrame = await frame();
  const target = testFrame.locator(selector);
  const [first, ...rest] = points;
  // The element stays put during a drag, so look it up once and move the
  // mouse to page coordinates from its box.
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  assert(box !== null, `mouseDrag target ${selector} is not visible`);
  await page.mouse.move(box.x + first[0], box.y + first[1]);
  // A person's mouse events arrive far enough apart that the browser and the
  // editor have handled each one, and the selection changes it caused,
  // before the next. Count the pointer events the frame has dispatched, and
  // remember the selection each selectionchange reported, so that each step
  // can wait for exactly that instead of for a while.
  const tracker = await testFrame.evaluateHandle(() => {
    const getPoints = () => {
      const selection = document.getSelection();
      return selection === null
        ? []
        : [
            selection.anchorNode,
            selection.anchorOffset,
            selection.focusNode,
            selection.focusOffset,
          ];
    };
    const controller = new AbortController();
    const listenerOptions = {capture: true, signal: controller.signal};
    const state = {
      dispose: () => controller.abort(),
      events: 0,
      getPoints,
      notified: getPoints(),
    };
    for (const type of ['pointerdown', 'pointermove', 'pointerup']) {
      window.addEventListener(
        type,
        () => {
          state.events++;
        },
        listenerOptions,
      );
    }
    window.addEventListener(
      'selectionchange',
      () => {
        state.notified = getPoints();
      },
      listenerOptions,
    );
    return state;
  });
  let events = 0;
  // Wait until the frame has dispatched the step's pointer event, then until
  // the tasks it queued have run (the editor adjusts a drag's selection in
  // one) and no selectionchange is still to be dispatched and handled.
  const settle = async (step: string) => {
    const result = await tracker.evaluate(async (state, expected) => {
      const nextTask = () =>
        new Promise<void>(resolve => setTimeout(resolve, 0));
      const isPending = () =>
        state.getPoints().some((value, i) => value !== state.notified[i]);
      // Never hang a test on an event the browser coalesced or a selection
      // that keeps changing.
      const deadline = performance.now() + 1000;
      let isSettled = false;
      do {
        await nextTask();
        isSettled = state.events >= expected && !isPending();
      } while (!isSettled && performance.now() < deadline);
      return {events: state.events, isSettled};
    }, events + 1);
    // Count from what the frame saw, so that a step that dispatched more
    // than one pointer event doesn't let later steps stop waiting early.
    events = result.events;
    if (!result.isSettled) {
      console.warn(`mouseDrag ${selector}: ${step} did not settle in 1s`);
    }
  };
  let isPressed = false;
  try {
    for (let count = 1; count < clickCount; count++) {
      await page.mouse.down({clickCount: count});
      await settle(`press ${count}`);
      await page.mouse.up({clickCount: count});
      await settle(`release ${count}`);
    }
    await page.mouse.down({clickCount});
    isPressed = true;
    await settle('press');
    // Chromium collapses the selection at the pointer on the first drag move
    // after a press that placed a caret, and extends it from there, so a
    // drag's anchor is where it first moved. A hand starts a drag with a
    // move of a pixel or two, so make the first move one.
    let [lastX, lastY] = first;
    if (rest.length > 0) {
      const [x, y] = rest[0];
      const distance = Math.hypot(x - lastX, y - lastY);
      if (distance > 2) {
        lastX += ((x - lastX) * 2) / distance;
        lastY += ((y - lastY) * 2) / distance;
        await page.mouse.move(box.x + lastX, box.y + lastY);
        await settle('first move');
      }
    }
    for (const [x, y] of rest) {
      const steps = Math.max(
        1,
        Math.ceil(Math.hypot(x - lastX, y - lastY) / maxStep),
      );
      for (let i = 1; i <= steps; i++) {
        await page.mouse.move(
          box.x + lastX + ((x - lastX) * i) / steps,
          box.y + lastY + ((y - lastY) * i) / steps,
        );
        await settle(`move to (${x}, ${y})`);
      }
      [lastX, lastY] = [x, y];
    }
    await page.mouse.up({clickCount});
    isPressed = false;
    await settle('release');
  } finally {
    // Leave no button held or listener behind for the next test, without
    // hiding the error that got here behind one from a frame that is gone.
    const ignore = () => {};
    if (isPressed) {
      await page.mouse.up({clickCount}).catch(ignore);
    }
    await tracker.evaluate(state => state.dispose()).catch(ignore);
    await tracker.dispose().catch(ignore);
  }
}

/**
 * Vitest's keyboard descriptor parser splits non-BMP text into UTF-16 code
 * units. Native Playwright typing preserves code points, matching the E2E
 * driver's input behavior. Bound each code point so long input can make
 * progress on a busy runner, and stop if the fixture is removed. Keep the
 * loop in one command to avoid a Vitest RPC round trip for every character.
 */
async function typeText(
  {frame}: BrowserCommandContext,
  text: string,
  selector: string,
): Promise<void> {
  // Capture the element once: type() fails immediately if it detaches,
  // instead of resolving another fixture's editor.
  const target = await (await frame())
    .locator(selector)
    .elementHandle({timeout: 5000});
  assert(target !== null, 'typeText target was removed');
  try {
    for (const character of text) {
      await target.type(character, {timeout: 5000});
    }
  } finally {
    await target.dispose();
  }
}

export const browserCommands = {mouseDrag, typeText};
