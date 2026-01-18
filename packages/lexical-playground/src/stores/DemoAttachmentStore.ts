/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  AttachmentFile,
  AttachmentStore,
  AttachmentStoreConfig,
  StoredAttachment,
} from './AttachmentStore';

/**
 * DemoAttachmentStore
 *
 * Default implementation using blob URLs with console warnings.
 * Files are stored in memory and will be lost on page reload.
 *
 * For production use, implement a custom AttachmentStore that uploads
 * files to external storage (S3, Cloudflare R2, etc.) and returns
 * permanent URLs.
 */
export class DemoAttachmentStore implements AttachmentStore {
  private urlMap = new Map<
    string,
    {url: string; metadata: StoredAttachment; blob?: Blob}
  >();
  private config: AttachmentStoreConfig;
  private warningShown = false;

  constructor(config: AttachmentStoreConfig = {}) {
    this.config = {
      // Default true for playground compatibility
      demoWarningLevel: 'console',
      serializeAsBase64: true,
      ...config,
    };
  }

  private showWarningOnce(): void {
    if (this.warningShown || this.config.demoWarningLevel === 'none') {
      return;
    }

    if (this.config.demoWarningLevel === 'console') {
      console.warn(
        '[Lexical Attachment] Using demo attachment store. ' +
          'Files are stored as blob URLs and will be lost on page reload. ' +
          'For production use, provide a custom AttachmentStore implementation ' +
          'that uploads files to external storage (S3, Cloudflare R2, etc.).',
      );
      this.warningShown = true;
    }
  }

  async upload(file: AttachmentFile): Promise<StoredAttachment> {
    this.showWarningOnce();

    const id = crypto.randomUUID();
    const url = URL.createObjectURL(file.file);

    const stored: StoredAttachment = {
      fileName: file.fileName,
      fileSize: file.fileSize,
      fileType: file.fileType,
      id,
      isPersistent: false,
      url,
    };

    this.urlMap.set(id, {blob: file.file, metadata: stored, url});
    return stored;
  }

  async getUrl(id: string): Promise<string> {
    const entry = this.urlMap.get(id);
    if (!entry) {
      throw new Error(`Attachment not found: ${id}`);
    }
    return entry.url;
  }

  async delete(id: string): Promise<void> {
    const entry = this.urlMap.get(id);
    if (entry && entry.url.startsWith('blob:')) {
      URL.revokeObjectURL(entry.url);
    }
    this.urlMap.delete(id);
  }

  async toBase64(id: string): Promise<string | null> {
    const entry = this.urlMap.get(id);
    if (!entry) {
      return null;
    }

    try {
      // If we have the original blob, use it directly
      const blob = entry.blob;
      if (blob) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            if (result.startsWith('data:') && entry.metadata.fileType) {
              const base64Data = result.split(',')[1];
              resolve(`data:${entry.metadata.fileType};base64,${base64Data}`);
            } else {
              resolve(result);
            }
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
      }

      // Fallback: fetch from blob URL
      if (entry.url.startsWith('blob:')) {
        const response = await fetch(entry.url);
        const fetchedBlob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            if (result.startsWith('data:') && entry.metadata.fileType) {
              const base64Data = result.split(',')[1];
              resolve(`data:${entry.metadata.fileType};base64,${base64Data}`);
            } else {
              resolve(result);
            }
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(fetchedBlob);
        });
      }

      return null;
    } catch (error) {
      console.warn('Failed to convert attachment to base64:', error);
      return null;
    }
  }

  isPersistent(): boolean {
    return false;
  }

  getConfig(): AttachmentStoreConfig {
    return this.config;
  }

  /**
   * Register an existing attachment (e.g., from imported JSON)
   * This is useful for tracking attachments that were loaded from serialized state
   */
  registerExisting(
    id: string,
    url: string,
    metadata: Omit<StoredAttachment, 'url' | 'id'>,
  ): void {
    const stored: StoredAttachment = {
      ...metadata,
      id,
      url,
    };
    this.urlMap.set(id, {metadata: stored, url});
  }

  /**
   * Clean up all stored attachments
   */
  cleanup(): void {
    for (const [, entry] of this.urlMap) {
      if (entry.url.startsWith('blob:')) {
        URL.revokeObjectURL(entry.url);
      }
    }
    this.urlMap.clear();
  }
}
