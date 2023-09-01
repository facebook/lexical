/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

var React = require('react');

function _setPrototypeOf(o, p) {
  _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) {
    o.__proto__ = p;
    return o;
  };
  return _setPrototypeOf(o, p);
}

function _inheritsLoose(subClass, superClass) {
  subClass.prototype = Object.create(superClass.prototype);
  subClass.prototype.constructor = subClass;
  _setPrototypeOf(subClass, superClass);
}

var changedArray = function changedArray(a, b) {
  if (a === void 0) {
    a = [];
  }

  if (b === void 0) {
    b = [];
  }

  return a.length !== b.length || a.some(function (item, index) {
    return !Object.is(item, b[index]);
  });
};

var initialState = {
  error: null
};

var ErrorBoundary = /*#__PURE__*/function (_React$Component) {
  _inheritsLoose(ErrorBoundary, _React$Component);

  function ErrorBoundary() {
    var _this;

    for (var _len = arguments.length, _args = new Array(_len), _key = 0; _key < _len; _key++) {
      _args[_key] = arguments[_key];
    }

    _this = _React$Component.call.apply(_React$Component, [this].concat(_args)) || this;
    _this.state = initialState;

    _this.resetErrorBoundary = function () {
      var _this$props;

      for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      _this.props.onReset == null ? void 0 : (_this$props = _this.props).onReset.apply(_this$props, args);

      _this.reset();
    };

    return _this;
  }

  ErrorBoundary.getDerivedStateFromError = function getDerivedStateFromError(error) {
    return {
      error: error
    };
  };

  var _proto = ErrorBoundary.prototype;

  _proto.reset = function reset() {
    this.setState(initialState);
  };

  _proto.componentDidCatch = function componentDidCatch(error, info) {
    var _this$props$onError, _this$props2;

    (_this$props$onError = (_this$props2 = this.props).onError) == null ? void 0 : _this$props$onError.call(_this$props2, error, info);
  };

  _proto.componentDidUpdate = function componentDidUpdate(prevProps, prevState) {
    var error = this.state.error;
    var resetKeys = this.props.resetKeys; // There's an edge case where if the thing that triggered the error
    // happens to *also* be in the resetKeys array, we'd end up resetting
    // the error boundary immediately. This would likely trigger a second
    // error to be thrown.
    // So we make sure that we don't check the resetKeys on the first call
    // of cDU after the error is set

    if (error !== null && prevState.error !== null && changedArray(prevProps.resetKeys, resetKeys)) {
      var _this$props$onResetKe, _this$props3;

      (_this$props$onResetKe = (_this$props3 = this.props).onResetKeysChange) == null ? void 0 : _this$props$onResetKe.call(_this$props3, prevProps.resetKeys, resetKeys);
      this.reset();
    }
  };

  _proto.render = function render() {
    var error = this.state.error;
    var _this$props4 = this.props,
        fallbackRender = _this$props4.fallbackRender,
        FallbackComponent = _this$props4.FallbackComponent,
        fallback = _this$props4.fallback;

    if (error !== null) {
      var _props = {
        error: error,
        resetErrorBoundary: this.resetErrorBoundary
      };

      if ( /*#__PURE__*/React.isValidElement(fallback)) {
        return fallback;
      } else if (typeof fallbackRender === 'function') {
        return fallbackRender(_props);
      } else if (FallbackComponent) {
        return /*#__PURE__*/React.createElement(FallbackComponent, _props);
      } else {
        throw new Error('react-error-boundary requires either a fallback, fallbackRender, or FallbackComponent prop');
      }
    }

    return this.props.children;
  };

  return ErrorBoundary;
}(React.Component);

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
function LexicalErrorBoundary({
  children,
  onError
}) {
  return /*#__PURE__*/React.createElement(ErrorBoundary, {
    fallback: /*#__PURE__*/React.createElement("div", {
      style: {
        border: '1px solid #f00',
        color: '#f00',
        padding: '8px'
      }
    }, "An error was thrown."),
    onError: onError
  }, children);
}

module.exports = LexicalErrorBoundary;
