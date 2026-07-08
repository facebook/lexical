/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ReactNode} from 'react';

import {
  buildStackBlitzUri,
  galleryExamples,
  getScreenshotPreview,
} from './galleryExamples';

export type Example = {
  description: string;
  title: string;
  uri?: string;
  preview?: string;
  renderPreview?: () => ReactNode;
  tags: string[];
};

export const plugins = (customFields: {[key: string]: unknown}): Example[] =>
  galleryExamples.map(example => ({
    description: example.description,
    preview: getScreenshotPreview(example),
    tags: example.tags,
    title: example.title,
    uri: buildStackBlitzUri(example, customFields.STACKBLITZ_PREFIX as string),
  }));
