'use strict';
const {devices} = require('@playwright/test');

const config = {
  projects: [
    {
      name: 'chromium',
      use: {...devices['Desktop Chrome']},
    },
    {
      name: 'firefox',
      use: {...devices['Desktop Firefox']},
    },
    {
      name: 'webkit',
      use: {...devices['Desktop Safari']},
    },
  ],
  retries: 3,
  //   {
  //     name: 'chromium:plain',
  //     use: { ...devices['Desktop Chrome'], textMode: 'plain', },
  //   },
  //   {
  //     name: 'firefox:plain',
  //     use: { ...devices['Desktop Firefox'], textMode: 'plain', },
  //   },
  //   {
  //     name: 'webkit:plain',
  //     use: { ...devices['Desktop Safari'], textMode: 'plain', },
  //   },
  //   {
  //     name: 'chromium:collab',
  //     use: { ...devices['Desktop Chrome'], textMode: 'rich', isCollab: process.env.IS_COLLAB },
  //   },
  //   {
  //     name: 'firefox:collab',
  //     use: { ...devices['Desktop Firefox'], textMode: 'rich', isCollab: process.env.IS_COLLAB },
  //   },
  //   {
  //     name: 'webkit:collab',
  //     use: { ...devices['Desktop Safari'], textMode: 'rich', isCollab: process.env.IS_COLLAB },
  //   },
  // ],
};
module.exports = config;
