/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * AttachmentStore Interface
 *
 * A pluggable storage abstraction for attachment files that supports:
 * - Demo mode: Uses blob URLs (session-scoped, no persistence)
 * - Production: External storage (S3, R2) with just URLs in documents
 * - Optional: Base64 for self-contained export
 */

export interface AttachmentStoreConfig {
  /** Whether to serialize attachments as base64 in exportJSON/exportDOM */
  serializeAsBase64?: boolean;
  /** Warning level for demo mode: 'none' | 'console' | 'ui' */
  demoWarningLevel?: 'none' | 'console' | 'ui';
}

export interface AttachmentFile {
  file: File;
  fileName: string;
  fileSize: number;
  fileType: string;
}

export interface StoredAttachment {
  /** The URL to access the file (blob:, https://, or data:) */
  url: string;
  /** Unique identifier for the stored file */
  id: string;
  /** Original file metadata */
  fileName: string;
  fileSize: number;
  fileType: string;
  /** Whether this is a persistent URL (survives page reload) */
  isPersistent: boolean;
}

export interface AttachmentStore {
  /**
   * Upload a file and return storage information
   * For demo mode: creates blob URL
   * For production: uploads to external storage and returns permanent URL
   */
  upload(file: AttachmentFile): Promise<StoredAttachment>;

  /**
   * Get the current URL for a stored attachment
   * Useful when URLs might change or need refreshing (signed URLs, etc.)
   */
  getUrl(id: string): Promise<string>;

  /**
   * Delete a stored attachment and clean up resources
   */
  delete(id: string): Promise<void>;

  /**
   * Convert an attachment to base64 data URL (for self-contained export)
   * Returns null if conversion is not possible
   */
  toBase64(id: string): Promise<string | null>;

  /**
   * Check if the store supports persistent storage
   */
  isPersistent(): boolean;

  /**
   * Get configuration for serialization behavior
   */
  getConfig(): AttachmentStoreConfig;
}
