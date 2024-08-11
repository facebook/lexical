/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const entries: [string, string][] = [
  ['Arabian', '#7d0000'],
  ['Appaloosa', '#640000'],
  ['Friesian', '#990000'],
  ['Thoroughbred', '#bf0000'],
  ['Warmblood', '#bf4000'],
  ['Saddlebred', '#004000'],
  ['Mustang', '#007f00'],
  ['Trakehner', '#407f00'],
  ['Quarter Horse', '#7f7f00'],
  ['Clydesdale', '#000099'],
  ['Paint', '#0000bf'],
  ['Icelandic', '#0000ff'],
  ['Andalusian', '#004040'],
  ['Tennessee Walker', '#404040'],
  ['Ukrainian Riding Horse', '#7f0040'],
  ['Percheron', '#bf0040'],
];

export interface UserProfile {
  name: string;
  color: string;
}

export function getRandomUserProfile(): UserProfile {
  const entry = entries[Math.floor(Math.random() * entries.length)];
  return {
    color: entry[1],
    name: entry[0],
  };
}
