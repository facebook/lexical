"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.raceAgainstDeadline = raceAgainstDeadline;
exports.ManualPromise = exports.DeadlineRunner = void 0;

var _utils = require("./utils");

let _Symbol$species, _Symbol$toStringTag;

class DeadlineRunner {
  constructor(promise, deadline) {
    this._timer = void 0;
    this.result = new ManualPromise();
    promise.then(result => {
      this._finish({
        result
      });
    }).catch(e => {
      this._finish(undefined, e);
    });
    this.updateDeadline(deadline);
  }

  _finish(success, error) {
    if (this.result.isDone()) return;
    this.updateDeadline(0);
    if (success) this.result.resolve(success);else this.result.reject(error);
  }

  interrupt() {
    this.updateDeadline(-1);
  }

  updateDeadline(deadline) {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = undefined;
    }

    if (deadline === 0) return;
    const timeout = deadline - (0, _utils.monotonicTime)();
    if (timeout <= 0) this._finish({
      timedOut: true
    });else this._timer = setTimeout(() => this._finish({
      timedOut: true
    }), timeout);
  }

}

exports.DeadlineRunner = DeadlineRunner;

async function raceAgainstDeadline(promise, deadline) {
  return new DeadlineRunner(promise, deadline).result;
}

_Symbol$species = Symbol.species;
_Symbol$toStringTag = Symbol.toStringTag;

class ManualPromise extends Promise {
  constructor() {
    let resolve;
    let reject;
    super((f, r) => {
      resolve = f;
      reject = r;
    });
    this._resolve = void 0;
    this._reject = void 0;
    this._isDone = void 0;
    this._isDone = false;
    this._resolve = resolve;
    this._reject = reject;
  }

  isDone() {
    return this._isDone;
  }

  resolve(t) {
    this._isDone = true;

    this._resolve(t);
  }

  reject(e) {
    this._isDone = true;

    this._reject(e);
  }

  static get [_Symbol$species]() {
    return Promise;
  }

  get [_Symbol$toStringTag]() {
    return 'ManualPromise';
  }

}

exports.ManualPromise = ManualPromise;