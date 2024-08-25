/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/* eslint-disable strict */

// eslint-disable-next-line no-unused-vars
function show(enabled, useSettingsInsteadOfPreferences) {
  if (useSettingsInsteadOfPreferences) {
    document.getElementsByClassName('state-on')[0].innerText =
      'Lexical Developer Tools’s extension is currently on. You can turn it off in the Extensions section of Safari Settings.';
    document.getElementsByClassName('state-off')[0].innerText =
      'Lexical Developer Tools’s extension is currently off. You can turn it on in the Extensions section of Safari Settings.';
    document.getElementsByClassName('state-unknown')[0].innerText =
      'You can turn on Lexical Developer Tools’s extension in the Extensions section of Safari Settings.';
    document.getElementsByClassName('open-preferences')[0].innerText =
      'Quit and Open Safari Settings…';
  }

  if (typeof enabled === 'boolean') {
    document.body.classList.toggle(`state-on`, enabled);
    document.body.classList.toggle(`state-off`, !enabled);
  } else {
    document.body.classList.remove(`state-on`);
    document.body.classList.remove(`state-off`);
  }
}

function openPreferences() {
  // eslint-disable-next-line no-undef
  webkit.messageHandlers.controller.postMessage('open-preferences');
}

document
  .querySelector('button.open-preferences')
  .addEventListener('click', openPreferences);
