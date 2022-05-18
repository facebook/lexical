"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "DispatcherConnection", {
  enumerable: true,
  get: function () {
    return _dispatcher.DispatcherConnection;
  }
});
Object.defineProperty(exports, "PlaywrightDispatcher", {
  enumerable: true,
  get: function () {
    return _playwrightDispatcher.PlaywrightDispatcher;
  }
});
Object.defineProperty(exports, "Registry", {
  enumerable: true,
  get: function () {
    return _registry.Registry;
  }
});
Object.defineProperty(exports, "Root", {
  enumerable: true,
  get: function () {
    return _dispatcher.Root;
  }
});
Object.defineProperty(exports, "createPlaywright", {
  enumerable: true,
  get: function () {
    return _playwright.createPlaywright;
  }
});
Object.defineProperty(exports, "installBrowsersForNpmInstall", {
  enumerable: true,
  get: function () {
    return _registry.installBrowsersForNpmInstall;
  }
});
Object.defineProperty(exports, "installDefaultBrowsersForNpmInstall", {
  enumerable: true,
  get: function () {
    return _registry.installDefaultBrowsersForNpmInstall;
  }
});
Object.defineProperty(exports, "registry", {
  enumerable: true,
  get: function () {
    return _registry.registry;
  }
});
Object.defineProperty(exports, "registryDirectory", {
  enumerable: true,
  get: function () {
    return _registry.registryDirectory;
  }
});
Object.defineProperty(exports, "writeDockerVersion", {
  enumerable: true,
  get: function () {
    return _registry.writeDockerVersion;
  }
});

var _registry = require("./registry");

var _dispatcher = require("./dispatchers/dispatcher");

var _playwrightDispatcher = require("./dispatchers/playwrightDispatcher");

var _playwright = require("./playwright");