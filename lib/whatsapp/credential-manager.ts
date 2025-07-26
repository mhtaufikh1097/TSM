// lib/whatsapp/credential-manager.ts
import { PrismaClient } from '@prisma/client';
import { FileCredentialStorage, DatabaseCredentialStorage } from './credential-storage';
import { existsSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

export interface CredentialMigrationResult {
  success: boolean;
  message: string;
  migratedFiles?: number;
  errors?: string[];
}

export class CredentialManager {
  /**
   * Migrate credentials from file storage to database
   */
  static async migrateFileToDatabase(sessionId: string = 'main'): Promise<CredentialMigrationResult> {
    try {
      const fileStorage = new FileCredentialStorage();
      const dbStorage = new DatabaseCredentialStorage(sessionId);
      
      // Check if file credentials exist
      const hasFileCredentials = await fileStorage.hasCredentials();
      if (!hasFileCredentials) {
        return {
          success: false,
          message: 'No file credentials found to migrate'
        };
      }

      // Check if database credentials already exist
      const hasDbCredentials = await dbStorage.hasCredentials();
      if (hasDbCredentials) {
        return {
          success: false,
          message: 'Database credentials already exist. Clear them first if you want to migrate.'
        };
      }

      console.log('🔄 Starting migration from file to database...');

      // Read all files from auth_info_baileys directory
      const fs = await import('fs/promises');
      const path = await import('path');
      const authDir = 'auth_info_baileys';

      let creds: any = null;
      const keys: Record<string, any> = {};
      let fileCount = 0;

      try {
        const files = await fs.readdir(authDir);
        console.log(`📁 Found ${files.length} files in ${authDir}`);

        for (const file of files) {
          if (!file.endsWith('.json')) continue;

          const filePath = path.join(authDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const data = JSON.parse(content);
          fileCount++;

          if (file === 'creds.json') {
            creds = data;
            console.log('📋 Loaded creds.json');
          } else {
            // Store all other files as keys
            const keyName = file.replace('.json', '');
            keys[keyName] = data;
            console.log(`🔑 Loaded key: ${keyName}`);
          }
        }

        console.log(`✅ Processed ${fileCount} files, creds: ${creds ? 'found' : 'not found'}, keys: ${Object.keys(keys).length}`);

      } catch (error) {
        console.log('⚠️ Could not read files:', error instanceof Error ? error.message : 'Unknown error');
        return {
          success: false,
          message: `Could not read credential files: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }

      if (!creds) {
        return {
          success: false,
          message: 'No creds.json found in file storage'
        };
      }

      // Create database credentials with both creds and all keys
      await prisma.whatsAppCredential.create({
        data: {
          sessionId: sessionId,
          creds: JSON.stringify(creds),
          keys: JSON.stringify(keys),
        }
      });

      console.log('✅ Migration completed successfully');
      
      return {
        success: true,
        message: `Successfully migrated ${fileCount} files from file to database for session: ${sessionId}`,
        migratedFiles: fileCount
      };

    } catch (error) {
      console.error('❌ Migration failed:', error);
      return {
        success: false,
        message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Migrate credentials from database to file storage
   */
  static async migrateDatabaseToFile(sessionId: string = 'main'): Promise<CredentialMigrationResult> {
    try {
      const fileStorage = new FileCredentialStorage();
      const dbStorage = new DatabaseCredentialStorage(sessionId);
      
      // Check if database credentials exist
      const hasDbCredentials = await dbStorage.hasCredentials();
      if (!hasDbCredentials) {
        return {
          success: false,
          message: 'No database credentials found to migrate'
        };
      }

      // Check if file credentials already exist
      const hasFileCredentials = await fileStorage.hasCredentials();
      if (hasFileCredentials) {
        return {
          success: false,
          message: 'File credentials already exist. Clear them first if you want to migrate.'
        };
      }

      console.log('🔄 Starting migration from database to file...');

      // Get database credentials
      const session = await prisma.whatsAppCredential.findUnique({
        where: { sessionId: sessionId }
      });

      if (!session || !session.creds) {
        return {
          success: false,
          message: 'No valid credentials found in database'
        };
      }

      // Create file storage and trigger credential save
      const { saveCreds } = await fileStorage.getAuthState();
      const creds = JSON.parse(session.creds);
      
      // Save credentials to file
      await saveCreds(creds);

      console.log('✅ Migration completed successfully');
      
      return {
        success: true,
        message: `Successfully migrated credentials from database to file for session: ${sessionId}`,
        migratedFiles: 1
      };

    } catch (error) {
      console.error('❌ Migration failed:', error);
      return {
        success: false,
        message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Clear all credentials from both storages
   */
  static async clearAllCredentials(sessionId: string = 'main'): Promise<CredentialMigrationResult> {
    try {
      const fileStorage = new FileCredentialStorage();
      const dbStorage = new DatabaseCredentialStorage(sessionId);
      
      const errors: string[] = [];
      let clearedFiles = 0;

      // Clear file credentials
      try {
        if (await fileStorage.hasCredentials()) {
          await fileStorage.clearCredentials();
          clearedFiles++;
          console.log('✅ File credentials cleared');
        }
      } catch (error) {
        const errorMsg = `Failed to clear file credentials: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error('❌', errorMsg);
      }

      // Clear database credentials
      try {
        if (await dbStorage.hasCredentials()) {
          await dbStorage.clearCredentials();
          clearedFiles++;
          console.log('✅ Database credentials cleared');
        }
      } catch (error) {
        const errorMsg = `Failed to clear database credentials: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error('❌', errorMsg);
      }

      if (errors.length > 0) {
        return {
          success: false,
          message: `Partially cleared credentials. ${errors.length} errors occurred.`,
          errors: errors,
          migratedFiles: clearedFiles
        };
      }

      return {
        success: true,
        message: `Successfully cleared all credentials for session: ${sessionId}`,
        migratedFiles: clearedFiles
      };

    } catch (error) {
      console.error('❌ Clear operation failed:', error);
      return {
        success: false,
        message: `Clear operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Get storage status for both modes
   */
  static async getStorageStatus(sessionId: string = 'main'): Promise<{
    file: { exists: boolean; path: string };
    database: { exists: boolean; sessionId: string };
    currentMode: string;
  }> {
    try {
      const fileStorage = new FileCredentialStorage();
      const dbStorage = new DatabaseCredentialStorage(sessionId);
      
      const fileExists = await fileStorage.hasCredentials();
      const dbExists = await dbStorage.hasCredentials();
      const currentMode = process.env.WHATSAPP_CREDENTIAL_STORAGE || 'file';

      return {
        file: {
          exists: fileExists,
          path: 'auth_info_baileys'
        },
        database: {
          exists: dbExists,
          sessionId: sessionId
        },
        currentMode: currentMode
      };

    } catch (error) {
      console.error('❌ Error getting storage status:', error);
      return {
        file: {
          exists: false,
          path: 'auth_info_baileys'
        },
        database: {
          exists: false,
          sessionId: sessionId
        },
        currentMode: process.env.WHATSAPP_CREDENTIAL_STORAGE || 'file'
      };
    }
  }

  /**
   * Switch storage mode by migrating credentials
   */
  static async switchStorageMode(newMode: 'file' | 'database', sessionId: string = 'main'): Promise<CredentialMigrationResult> {
    try {
      const currentMode = process.env.WHATSAPP_CREDENTIAL_STORAGE || 'file';
      
      if (currentMode === newMode) {
        return {
          success: false,
          message: `Already using ${newMode} storage mode`
        };
      }

      console.log(`🔄 Switching storage mode from ${currentMode} to ${newMode}...`);

      let result: CredentialMigrationResult;

      if (newMode === 'database') {
        result = await this.migrateFileToDatabase(sessionId);
      } else {
        result = await this.migrateDatabaseToFile(sessionId);
      }

      if (result.success) {
        console.log(`✅ Storage mode switched to ${newMode}`);
        console.log('⚠️ Update WHATSAPP_CREDENTIAL_STORAGE environment variable to:', newMode);
      }

      return result;

    } catch (error) {
      console.error('❌ Storage mode switch failed:', error);
      return {
        success: false,
        message: `Storage mode switch failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
}
