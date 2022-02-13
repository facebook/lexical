'use strict';

const fs = require('fs-extra');

const packages = {
  '@lexical/file': 'lexical-file',
  '@lexical/helpers': 'lexical-helpers',
  '@lexical/list': 'lexical-list',
  '@lexical/react': 'lexical-react',
  '@lexical/yjs': 'lexical-yjs',
  lexical: 'lexical',
  'lexical-playground': 'lexical-playground',
};

function updateVersion() {
  const version = getVersionFromFile();
  Object.values(packages).forEach((pkg) => {
    const packageJSON = fs.readJsonSync(`./packages/${pkg}/package.json`);
    packageJSON.version = version;
    updateDependencies(packageJSON, version);
    console.log(packageJSON);
    //fs.writeJsonSync(`./packages/${pkg}/package.json`, packageJSON);
  });
}

function updateDependencies(packageJSON, version) {
  const {dependencies, peerDependencies} = packageJSON;
  if (dependencies !== undefined) {
    Object.keys(dependencies).forEach((dep) => {
      if (packages[dep] !== undefined) {
        dependencies[dep] = version;
      }
    });
  }
  if (peerDependencies !== undefined) {
    Object.keys(peerDependencies).forEach((peerDep) => {
      if (packages[peerDep] !== undefined) {
        peerDependencies[peerDep] = version;
      }
    });
  }
}

function getVersionFromFile() {
  const fileContent = fs.readFileSync(
    './packages/lexical/src/LexicalVersion.js',
    'utf8',
  );
  const regex = /VERSION = '(\d{1,3}\.\d{1,3}\.\d{1,3})'/;
  const version = regex.exec(fileContent)[1];
  return version;
}

updateVersion();
