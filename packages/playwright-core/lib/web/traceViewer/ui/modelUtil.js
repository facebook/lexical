"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.indexModel = indexModel;
exports.context = context;
exports.next = next;
exports.stats = stats;
exports.eventsForAction = eventsForAction;
exports.resourcesForAction = resourcesForAction;

/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const contextSymbol = Symbol('context');
const nextSymbol = Symbol('next');
const eventsSymbol = Symbol('events');
const resourcesSymbol = Symbol('resources');

function indexModel(context) {
  for (const page of context.pages) page[contextSymbol] = context;

  for (let i = 0; i < context.actions.length; ++i) {
    const action = context.actions[i];
    action[contextSymbol] = context;
    action[nextSymbol] = context.actions[i + 1];
  }

  for (const event of context.events) event[contextSymbol] = context;
}

function context(action) {
  return action[contextSymbol];
}

function next(action) {
  return action[nextSymbol];
}

function stats(action) {
  let errors = 0;
  let warnings = 0;
  const c = context(action);

  for (const event of eventsForAction(action)) {
    if (event.metadata.method === 'console') {
      var _c$objects$guid;

      const {
        guid
      } = event.metadata.params.message;
      const type = (_c$objects$guid = c.objects[guid]) === null || _c$objects$guid === void 0 ? void 0 : _c$objects$guid.type;
      if (type === 'warning') ++warnings;else if (type === 'error') ++errors;
    }

    if (event.metadata.method === 'pageError') ++errors;
  }

  return {
    errors,
    warnings
  };
}

function eventsForAction(action) {
  let result = action[eventsSymbol];
  if (result) return result;
  const nextAction = next(action);
  result = context(action).events.filter(event => {
    return event.metadata.startTime >= action.metadata.startTime && (!nextAction || event.metadata.startTime < nextAction.metadata.startTime);
  });
  action[eventsSymbol] = result;
  return result;
}

function resourcesForAction(action) {
  let result = action[resourcesSymbol];
  if (result) return result;
  const nextAction = next(action);
  result = context(action).resources.filter(resource => {
    return resource._monotonicTime > action.metadata.startTime && (!nextAction || resource._monotonicTime < nextAction.metadata.startTime);
  });
  action[resourcesSymbol] = result;
  return result;
}