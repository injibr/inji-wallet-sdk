import { IFileSystemAdapter } from '../types';
/**
 * File system adapter for Expo environment
 */
export declare class ExpoFileSystemAdapter implements IFileSystemAdapter {
    private FileSystem;
    private documentDirectory;
    constructor();
    initialize(): Promise<void>;
    writeFile(fileName: string, content: string): Promise<string>;
    readFile(filePath: string): Promise<string>;
    deleteFile(filePath: string): Promise<void>;
    fileExists(filePath: string): Promise<boolean>;
    getDocumentDirectory(): Promise<string>;
    /**
     * Get file information
     */
    getFileInfo(filePath: string): Promise<any>;
    /**
     * Create directory if it doesn't exist
     */
    ensureDirectoryExists(dirPath: string): Promise<void>;
    /**
     * List files in directory
     */
    listFiles(dirPath: string): Promise<string[]>;
    /**
     * Copy file from source to destination
     */
    copyFile(sourcePath: string, destinationPath: string): Promise<void>;
    /**
     * Move file from source to destination
     */
    moveFile(sourcePath: string, destinationPath: string): Promise<void>;
}
//# sourceMappingURL=ExpoFileSystemAdapter.d.ts.map