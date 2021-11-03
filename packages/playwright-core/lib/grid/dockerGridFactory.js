"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _http = _interopRequireDefault(require("http"));

var _os = _interopRequireDefault(require("os"));

var utils = _interopRequireWildcard(require("../utils/utils"));

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

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
const dockerFactory = {
  name: 'Agents launched inside Docker container',
  capacity: Infinity,
  launchTimeout: 30000,
  retireTimeout: Infinity,
  launch: async options => {
    const {
      vncUrl
    } = await launchDockerGridAgent(options.agentId, options.gridURL);
    /* eslint-disable no-console */

    console.log(``);
    console.log(`✨ Running browsers inside docker container: ${vncUrl} ✨`);
  }
};
var _default = dockerFactory;
exports.default = _default;

async function launchDockerGridAgent(agentId, gridURL) {
  var _info$NetworkSettings;

  const gridPort = new URL(gridURL).port || '80';
  const images = await getJSON('/images/json');
  let imageName = process.env.PWTEST_IMAGE_NAME;

  if (!imageName) {
    const packageJson = require('../../package.json');

    imageName = `mcr.microsoft.com/playwright:v${packageJson.version}-focal`;
  }

  const pwImage = images.find(image => image.RepoTags.includes(imageName));

  if (!pwImage) {
    throw new Error(`\n` + utils.wrapInASCIIBox([`Failed to find ${imageName} docker image.`, `Please pull docker image with the following command:`, ``, `    npx playwight install docker-image`, ``, `<3 Playwright Team`].join('\n'), 1));
  }

  const Env = ['PW_SOCKS_PROXY_PORT=1' // Enable port forwarding over PlaywrightClient
  ];

  const forwardIfDefined = envName => {
    if (process.env[envName]) Env.push(`CI=${process.env[envName]}`);
  };

  forwardIfDefined('CI');
  forwardIfDefined('PWDEBUG');
  forwardIfDefined('DEBUG');
  forwardIfDefined('DEBUG_FILE');
  forwardIfDefined('SELENIUM_REMOTE_URL');
  const container = await postJSON('/containers/create', {
    Env,
    WorkingDir: '/ms-playwright-agent',
    Cmd: ['bash', 'start_agent.sh', agentId, `http://host.docker.internal:${gridPort}`],
    AttachStdout: true,
    AttachStderr: true,
    Image: pwImage.Id,
    ExposedPorts: {
      '7900/tcp': {}
    },
    HostConfig: {
      Init: true,
      AutoRemove: true,
      ShmSize: 2 * 1024 * 1024 * 1024,
      ExtraHosts: process.platform === 'linux' ? ['host.docker.internal:host-gateway' // Enable host.docker.internal on Linux.
      ] : [],
      PortBindings: {
        '7900/tcp': [{
          HostPort: '0'
        }]
      }
    }
  });
  await postJSON(`/containers/${container.Id}/start`);
  const info = await getJSON(`/containers/${container.Id}/json`);
  const vncPort = info === null || info === void 0 ? void 0 : (_info$NetworkSettings = info.NetworkSettings) === null || _info$NetworkSettings === void 0 ? void 0 : _info$NetworkSettings.Ports['7900/tcp'];
  return {
    vncUrl: `http://localhost:${vncPort[0].HostPort}`
  };
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
  const dockerSocket = _os.default.platform() === 'win32' ? '\\\\.\\pipe\\docker_engine' : '/var/run/docker.sock';
  return new Promise((resolve, reject) => {
    const request = _http.default.request({
      socketPath: dockerSocket,
      path: url,
      method
    }, response => {
      let body = '';
      response.on('data', function (chunk) {
        body += chunk;
      });
      response.on('end', function () {
        if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
          console.error(`ERROR ${method} ${url}`, response.statusCode, body);
          resolve(null);
        } else {
          resolve(body);
        }
      });
    });

    request.on('error', function (e) {
      console.error('Error fetching json: ' + e);
      resolve(null);
    });

    if (body) {
      request.setHeader('Content-Type', 'application/json');
      request.setHeader('Content-Length', body.length);
      request.write(body);
    }

    request.end();
  });
}