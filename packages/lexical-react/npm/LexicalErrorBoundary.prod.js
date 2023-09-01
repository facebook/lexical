/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';var h=require("react");function m(b,c){m=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(g,a){g.__proto__=a;return g};return m(b,c)}function n(b,c){b.prototype=Object.create(c.prototype);b.prototype.constructor=b;m(b,c)}function r(b,c){void 0===b&&(b=[]);void 0===c&&(c=[]);return b.length!==c.length||b.some(function(g,a){return!Object.is(g,c[a])})}
var t={error:null},u=function(b){function c(){for(var a,d=arguments.length,f=Array(d),e=0;e<d;e++)f[e]=arguments[e];a=b.call.apply(b,[this].concat(f))||this;a.state=t;a.resetErrorBoundary=function(){for(var k,p=arguments.length,q=Array(p),l=0;l<p;l++)q[l]=arguments[l];null==a.props.onReset?void 0:(k=a.props).onReset.apply(k,q);a.reset()};return a}n(c,b);c.getDerivedStateFromError=function(a){return{error:a}};var g=c.prototype;g.reset=function(){this.setState(t)};g.componentDidCatch=function(a,d){var f,
e;null==(f=(e=this.props).onError)?void 0:f.call(e,a,d)};g.componentDidUpdate=function(a,d){var f=this.props.resetKeys;if(null!==this.state.error&&null!==d.error&&r(a.resetKeys,f)){var e,k;null==(e=(k=this.props).onResetKeysChange)?void 0:e.call(k,a.resetKeys,f);this.reset()}};g.render=function(){var a=this.state.error,d=this.props,f=d.fallbackRender,e=d.FallbackComponent;d=d.fallback;if(null!==a){a={error:a,resetErrorBoundary:this.resetErrorBoundary};if(h.isValidElement(d))return d;if("function"===
typeof f)return f(a);if(e)return h.createElement(e,a);throw Error("react-error-boundary requires either a fallback, fallbackRender, or FallbackComponent prop");}return this.props.children};return c}(h.Component);module.exports=function({children:b,onError:c}){return h.createElement(u,{fallback:h.createElement("div",{style:{border:"1px solid #f00",color:"#f00",padding:"8px"}},"An error was thrown."),onError:c},b)}
