"use strict";
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var headless_1 = require("@lexical/headless");
var http = require("http");
var url = require("url");
var hostname = 'localhost';
var port = 1235;
var editorStateJSON = null;
var editor = (0, headless_1.createHeadlessEditor)({
    namespace: 'validation',
    nodes: [],
    onError: function (error) {
        console.error(error);
    }
});
var getJSON = function (req) {
    var body = [];
    return new Promise(function (resolve) {
        req
            .on('data', function (chunk) {
            body.push(chunk);
        })
            .on('end', function () {
            var data = Buffer.concat(body).toString();
            var json = JSON.parse(data);
            resolve(json);
        })
            .on('error', function (error) {
            // eslint-disable-next-line no-console
            console.log(error);
        });
    });
};
var validateEditorState = function (json) {
    return true;
};
var server = http.createServer(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var pathname, method, json, json;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                pathname = url.parse(req.url).pathname;
                method = req.method;
                res.setHeader('Content-Type', 'application/json');
                if (method === 'OPTIONS') {
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.setHeader('Access-Control-Request-Method', '*');
                    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST, GET');
                    res.setHeader('Access-Control-Allow-Headers', '*');
                    res.end();
                    return [2 /*return*/];
                }
                if (!(method === 'POST' && pathname === '/setEditorState')) return [3 /*break*/, 2];
                return [4 /*yield*/, getJSON(req)];
            case 1:
                json = _a.sent();
                editorStateJSON = json;
                res.statusCode = 200;
                res.end();
                return [3 /*break*/, 5];
            case 2:
                if (!(method === 'POST' && pathname === '/updateEditorState')) return [3 /*break*/, 4];
                return [4 /*yield*/, getJSON(req)];
            case 3:
                json = _a.sent();
                if (validateEditorState(json)) {
                    res.statusCode = 200;
                }
                else {
                    res.statusCode = 403;
                }
                res.end();
                return [3 /*break*/, 5];
            case 4:
                res.statusCode = 404;
                res.end();
                _a.label = 5;
            case 5: return [2 /*return*/];
        }
    });
}); });
server.listen(port, hostname, function () {
    // eslint-disable-next-line no-console
    console.log("Read-only validation server running at http://".concat(hostname, ":").concat(port, "/"));
});
