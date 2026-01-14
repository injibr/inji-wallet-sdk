"use strict";

/**
 * File system adapter for Expo environment
 */
export class ExpoFileSystemAdapter {
  documentDirectory = '';
  constructor() {}
  async initialize() {
    try {
      this.FileSystem = require('expo-file-system');
      this.documentDirectory = this.FileSystem.documentDirectory;
      console.log('[ExpoFileSystemAdapter] Initialized with document directory:', this.documentDirectory);
    } catch (error) {
      console.error('[ExpoFileSystemAdapter] Failed to initialize:', error);
      throw new Error('expo-file-system is required for file operations in Expo');
    }
  }
  async writeFile(fileName, content) {
    if (!this.FileSystem) {
      await this.initialize();
    }
    const fileUri = `${this.documentDirectory}${fileName}`;
    try {
      // Use new File API instead of deprecated writeAsStringAsync
      const file = new this.FileSystem.File(fileUri);
      await file.write(content);
      console.log('[ExpoFileSystemAdapter] File written successfully:', fileUri);
      return fileUri;
    } catch (error) {
      // Fallback to legacy API if new API is not available
      try {
        await this.FileSystem.writeAsStringAsync(fileUri, content, {
          encoding: this.FileSystem.EncodingType.UTF8
        });
        console.log('[ExpoFileSystemAdapter] File written successfully (legacy API):', fileUri);
        return fileUri;
      } catch (legacyError) {
        console.error('[ExpoFileSystemAdapter] Failed to write file:', error);
        throw error;
      }
    }
  }
  async readFile(filePath) {
    if (!this.FileSystem) {
      await this.initialize();
    }
    try {
      // Use new File API instead of deprecated readAsStringAsync
      const file = new this.FileSystem.File(filePath);
      const content = await file.text();
      console.log('[ExpoFileSystemAdapter] File read successfully:', filePath);
      return content;
    } catch (error) {
      // Fallback to legacy API if new API is not available
      try {
        const content = await this.FileSystem.readAsStringAsync(filePath, {
          encoding: this.FileSystem.EncodingType.UTF8
        });
        console.log('[ExpoFileSystemAdapter] File read successfully (legacy API):', filePath);
        return content;
      } catch (legacyError) {
        console.error('[ExpoFileSystemAdapter] Failed to read file:', error);
        throw error;
      }
    }
  }
  async deleteFile(filePath) {
    if (!this.FileSystem) {
      await this.initialize();
    }
    try {
      await this.FileSystem.deleteAsync(filePath, {
        idempotent: true
      });
      console.log('[ExpoFileSystemAdapter] File deleted successfully:', filePath);
    } catch (error) {
      console.error('[ExpoFileSystemAdapter] Failed to delete file:', error);
      throw error;
    }
  }
  async fileExists(filePath) {
    if (!this.FileSystem) {
      await this.initialize();
    }
    try {
      const fileInfo = await this.FileSystem.getInfoAsync(filePath);
      return fileInfo.exists;
    } catch (error) {
      console.warn('[ExpoFileSystemAdapter] Error checking file existence:', error);
      return false;
    }
  }
  async getDocumentDirectory() {
    if (!this.FileSystem) {
      await this.initialize();
    }
    return this.documentDirectory;
  }

  /**
   * Get file information
   */
  async getFileInfo(filePath) {
    if (!this.FileSystem) {
      await this.initialize();
    }
    try {
      return await this.FileSystem.getInfoAsync(filePath);
    } catch (error) {
      console.error('[ExpoFileSystemAdapter] Failed to get file info:', error);
      throw error;
    }
  }

  /**
   * Create directory if it doesn't exist
   */
  async ensureDirectoryExists(dirPath) {
    if (!this.FileSystem) {
      await this.initialize();
    }
    try {
      const dirInfo = await this.FileSystem.getInfoAsync(dirPath);
      if (!dirInfo.exists) {
        await this.FileSystem.makeDirectoryAsync(dirPath, {
          intermediates: true
        });
        console.log('[ExpoFileSystemAdapter] Directory created:', dirPath);
      }
    } catch (error) {
      console.error('[ExpoFileSystemAdapter] Failed to create directory:', error);
      throw error;
    }
  }

  /**
   * List files in directory
   */
  async listFiles(dirPath) {
    if (!this.FileSystem) {
      await this.initialize();
    }
    try {
      const files = await this.FileSystem.readDirectoryAsync(dirPath);
      return files;
    } catch (error) {
      console.error('[ExpoFileSystemAdapter] Failed to list files:', error);
      return [];
    }
  }

  /**
   * Copy file from source to destination
   */
  async copyFile(sourcePath, destinationPath) {
    if (!this.FileSystem) {
      await this.initialize();
    }
    try {
      await this.FileSystem.copyAsync({
        from: sourcePath,
        to: destinationPath
      });
      console.log('[ExpoFileSystemAdapter] File copied successfully:', sourcePath, '->', destinationPath);
    } catch (error) {
      console.error('[ExpoFileSystemAdapter] Failed to copy file:', error);
      throw error;
    }
  }

  /**
   * Move file from source to destination
   */
  async moveFile(sourcePath, destinationPath) {
    if (!this.FileSystem) {
      await this.initialize();
    }
    try {
      await this.FileSystem.moveAsync({
        from: sourcePath,
        to: destinationPath
      });
      console.log('[ExpoFileSystemAdapter] File moved successfully:', sourcePath, '->', destinationPath);
    } catch (error) {
      console.error('[ExpoFileSystemAdapter] Failed to move file:', error);
      throw error;
    }
  }
}
//# sourceMappingURL=ExpoFileSystemAdapter.js.map