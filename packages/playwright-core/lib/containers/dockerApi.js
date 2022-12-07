"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.checkEngineRunning = checkEngineRunning;
exports.commitContainer = commitContainer;
exports.getContainerLogs = getContainerLogs;
exports.launchContainer = launchContainer;
exports.listContainers = listContainers;
exports.listImages = listImages;
exports.removeContainer = removeContainer;
exports.removeImage = removeImage;
exports.stopContainer = stopContainer;
var _http = _interopRequireDefault(require("http"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Docker engine API.
// See https://docs.docker.com/engine/api/v1.41/

const DOCKER_API_VERSION = '1.41';
async function listContainers() {
  var _await$getJSON;
  const containers = (_await$getJSON = await getJSON('/containers/json')) !== null && _await$getJSON !== void 0 ? _await$getJSON : [];
  return containers.map(container => {
    var _container$Names, _container$Ports$map, _container$Ports, _container$Labels;
    return {
      containerId: container.Id,
      imageId: container.ImageID,
      state: container.State,
      // Note: container names are usually prefixed with '/'.
      // See https://github.com/moby/moby/issues/6705
      names: ((_container$Names = container.Names) !== null && _container$Names !== void 0 ? _container$Names : []).map(name => name.startsWith('/') ? name.substring(1) : name),
      portBindings: (_container$Ports$map = (_container$Ports = container.Ports) === null || _container$Ports === void 0 ? void 0 : _container$Ports.map(portInfo => ({
        ip: portInfo.IP,
        hostPort: portInfo.PublicPort,
        containerPort: portInfo.PrivatePort
      }))) !== null && _container$Ports$map !== void 0 ? _container$Ports$map : [],
      labels: (_container$Labels = container.Labels) !== null && _container$Labels !== void 0 ? _container$Labels : {}
    };
  });
}
async function launchContainer(options) {
  var _options$labels;
  const ExposedPorts = {};
  const PortBindings = {};
  for (const port of (_options$ports = options.ports) !== null && _options$ports !== void 0 ? _options$ports : []) {
    var _options$ports;
    ExposedPorts[`${port.container}/tcp`] = {};
    PortBindings[`${port.container}/tcp`] = [{
      HostPort: port.host + '',
      HostIp: '127.0.0.1'
    }];
  }
  const container = await postJSON(`/containers/create` + (options.name ? '?name=' + options.name : ''), {
    Cmd: options.command,
    WorkingDir: options.workingDir,
    Labels: (_options$labels = options.labels) !== null && _options$labels !== void 0 ? _options$labels : {},
    AttachStdout: true,
    AttachStderr: true,
    Image: options.imageId,
    ExposedPorts,
    Env: dockerProtocolEnv(options.env),
    HostConfig: {
      Init: true,
      AutoRemove: options.autoRemove,
      ShmSize: 2 * 1024 * 1024 * 1024,
      PortBindings
    }
  });
  await postJSON(`/containers/${container.Id}/start`);
  if (options.waitUntil) await postJSON(`/containers/${container.Id}/wait?condition=${options.waitUntil}`);
  return container.Id;
}
async function stopContainer(options) {
  var _options$waitUntil;
  await Promise.all([
  // Make sure to wait for the container to be removed.
  postJSON(`/containers/${options.containerId}/wait?condition=${(_options$waitUntil = options.waitUntil) !== null && _options$waitUntil !== void 0 ? _options$waitUntil : 'not-running'}`), postJSON(`/containers/${options.containerId}/kill`)]);
}
async function removeContainer(containerId) {
  await Promise.all([
  // Make sure to wait for the container to be removed.
  postJSON(`/containers/${containerId}/wait?condition=removed`), callDockerAPI('delete', `/containers/${containerId}`)]);
}
async function getContainerLogs(containerId) {
  const rawLogs = await callDockerAPI('get', `/containers/${containerId}/logs?stdout=true&stderr=true`).catch(e => '');
  if (!rawLogs) return [];
  // Docker might prefix every log line with 8 characters. Stip them out.
  // See https://github.com/moby/moby/issues/7375
  // This doesn't happen if the containers is launched manually with attached terminal.
  return rawLogs.split('\n').map(line => {
    if ([0, 1, 2].includes(line.charCodeAt(0))) return line.substring(8);
    return line;
  });
}
function dockerProtocolEnv(env) {
  const result = [];
  for (const [key, value] of Object.entries(env !== null && env !== void 0 ? env : {})) result.push(`${key}=${value}`);
  return result;
}
async function commitContainer(options) {
  await postJSON(`/commit?container=${options.containerId}&repo=${options.repo}&tag=${options.tag}`, {
    Entrypoint: options.entrypoint,
    WorkingDir: options.workingDir,
    Env: dockerProtocolEnv(options.env)
  });
}
async function listImages() {
  var _await$getJSON2;
  const rawImages = (_await$getJSON2 = await getJSON('/images/json')) !== null && _await$getJSON2 !== void 0 ? _await$getJSON2 : [];
  return rawImages.map(rawImage => {
    var _rawImage$RepoTags;
    return {
      imageId: rawImage.Id,
      names: (_rawImage$RepoTags = rawImage.RepoTags) !== null && _rawImage$RepoTags !== void 0 ? _rawImage$RepoTags : []
    };
  });
}
async function removeImage(imageId) {
  await callDockerAPI('delete', `/images/${imageId}`);
}
async function checkEngineRunning() {
  try {
    await callDockerAPI('get', '/info');
    return true;
  } catch (e) {
    return false;
  }
}
async function getJSON(url) {
  const result = await callDockerAPI('get', url);
  if (!result) return result;
  return JSON.parse(result);
}
async function postJSON(url, json = undefined) {
  const result = await callDockerAPI('post', url, json ? JSON.stringify(json) : undefined);
  if (!result) return result;
  return JSON.parse(result);
}
function callDockerAPI(method, url, body = undefined) {
  const dockerSocket = process.platform === 'win32' ? '\\\\.\\pipe\\docker_engine' : '/var/run/docker.sock';
  return new Promise((resolve, reject) => {
    const request = _http.default.request({
      socketPath: dockerSocket,
      path: `/v${DOCKER_API_VERSION}${url}`,
      timeout: 30000,
      method
    }, response => {
      let body = '';
      response.on('data', function (chunk) {
        body += chunk;
      });
      response.on('end', function () {
        if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) reject(new Error(`${method} ${url} FAILED with statusCode ${response.statusCode} and body\n${body}`));else resolve(body);
      });
    });
    request.on('error', function (e) {
      reject(e);
    });
    if (body) {
      request.setHeader('Content-Type', 'application/json');
      request.setHeader('Content-Length', body.length);
      request.write(body);
    } else {
      request.setHeader('Content-Type', 'text/plain');
    }
    request.end();
  });
}