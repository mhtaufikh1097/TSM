// lib/whatsapp/credential-storage.ts
import { AuthenticationCreds, AuthenticationState, SignalDataTypeMap } from '@whiskeysockets/baileys';
import { PrismaClient } from '@prisma/client';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

const convertMigratedData = (data: any): any => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const converted: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object') {
      // Handle the specific case of Baileys Buffer format: {type: 'Buffer', data: 'base64string'}
      if ((value as any).type === 'Buffer' && typeof (value as any).data === 'string') {
        // This is a base64 encoded string, decode it to proper Buffer
        converted[key] = Buffer.from((value as any).data, 'base64');
      } 
      // Handle case where Buffer was incorrectly converted to array elements
      else if ((value as any).type === 'Buffer' && Array.isArray((value as any).data)) {
        // Convert array back to Buffer, but check if it looks like ASCII/base64 first
        const buffer = Buffer.from((value as any).data);
        
        // Check if this looks like it was meant to be base64 data
        // Base64 strings typically have certain characteristics
        const str = buffer.toString('utf8');
        if (/^[A-Za-z0-9+/]+=*$/.test(str) && str.length > 0) {
          // This looks like base64, decode it
          try {
            const decodedBuffer = Buffer.from(str, 'base64');
            // Validate the decoded length makes sense for cryptographic keys
            if (decodedBuffer.length === 32 || decodedBuffer.length === 64) {
              converted[key] = decodedBuffer;
            } else {
              // If decoded length doesn't make sense, use original buffer
              converted[key] = buffer;
            }
          } catch (error) {
            // If base64 decode fails, use original buffer
            converted[key] = buffer;
          }
        } else {
          // Not base64, use as-is
          converted[key] = buffer;
        }
      }
      // Handle nested objects recursively
      else {
        converted[key] = convertMigratedData(value);
      }
    } else {
      converted[key] = value;
    }
  }
  
  return converted;
};

// Helper functions untuk serialization
const serializeKeys = (keys: any): string => {
  const serializable: any = {};
  for (const [key, value] of Object.entries(keys)) {
    if (value && typeof value === 'object') {
      // Convert Buffers to base64 strings
      if (Buffer.isBuffer(value)) {
        serializable[key] = { __type: 'Buffer', data: value.toString('base64') };
      } else if (value.constructor === Uint8Array) {
        serializable[key] = { __type: 'Uint8Array', data: Buffer.from(value).toString('base64') };
      } else {
        // Handle nested objects
        const nested: any = {};
        for (const [nestedKey, nestedValue] of Object.entries(value)) {
          if (Buffer.isBuffer(nestedValue)) {
            nested[nestedKey] = { __type: 'Buffer', data: nestedValue.toString('base64') };
          } else if (nestedValue && nestedValue.constructor === Uint8Array) {
            nested[nestedKey] = { __type: 'Uint8Array', data: Buffer.from(nestedValue).toString('base64') };
          } else {
            nested[nestedKey] = nestedValue;
          }
        }
        serializable[key] = nested;
      }
    } else {
      serializable[key] = value;
    }
  }
  return JSON.stringify(serializable);
};

const deserializeKeys = (serialized: string): any => {
  try {
    const parsed = JSON.parse(serialized);
    const deserialized: any = {};
    
    for (const [key, value] of Object.entries(parsed)) {
      if (value && typeof value === 'object' && (value as any).__type) {
        const typedValue = value as { __type: string; data: string };
        if (typedValue.__type === 'Buffer') {
          deserialized[key] = Buffer.from(typedValue.data, 'base64');
        } else if (typedValue.__type === 'Uint8Array') {
          deserialized[key] = new Uint8Array(Buffer.from(typedValue.data, 'base64'));
        }
      } else if (value && typeof value === 'object') {
        // Handle nested objects
        const nested: any = {};
        for (const [nestedKey, nestedValue] of Object.entries(value)) {
          if (nestedValue && typeof nestedValue === 'object' && (nestedValue as any).__type) {
            const typedNestedValue = nestedValue as { __type: string; data: string };
            if (typedNestedValue.__type === 'Buffer') {
              nested[nestedKey] = Buffer.from(typedNestedValue.data, 'base64');
            } else if (typedNestedValue.__type === 'Uint8Array') {
              nested[nestedKey] = new Uint8Array(Buffer.from(typedNestedValue.data, 'base64'));
            }
          } else {
            nested[nestedKey] = nestedValue;
          }
        }
        deserialized[key] = nested;
      } else {
        deserialized[key] = value;
      }
    }
    
    return deserialized;
  } catch (error) {
    console.error('❌ Error deserializing keys:', error);
    return {};
  }
};

export interface CredentialStorage {
  getAuthState(): Promise<{ state: AuthenticationState; saveCreds: (creds: Partial<AuthenticationCreds>) => Promise<void> }>;
  clearCredentials(): Promise<void>;
  hasCredentials(): Promise<boolean>;
}

export class FileCredentialStorage implements CredentialStorage {
  private authDir: string;

  constructor(authDir: string = 'auth_info_baileys') {
    this.authDir = authDir;
    
    // Ensure auth directory exists
    if (!existsSync(this.authDir)) {
      mkdirSync(this.authDir, { recursive: true });
    }
  }

  async getAuthState(): Promise<{ state: AuthenticationState; saveCreds: (creds: Partial<AuthenticationCreds>) => Promise<void> }> {
    const { useMultiFileAuthState } = await import('@whiskeysockets/baileys');
    return await useMultiFileAuthState(this.authDir);
  }

  async clearCredentials(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      if (existsSync(this.authDir)) {
        const files = await fs.readdir(this.authDir);
        for (const file of files) {
          await fs.unlink(path.join(this.authDir, file));
        }
        console.log(`🗑️ [FILE] Cleared credentials from ${this.authDir}`);
      }
    } catch (error) {
      console.error('❌ [FILE] Error clearing credentials:', error);
      throw error;
    }
  }

  async hasCredentials(): Promise<boolean> {
    try {
      const credsPath = join(this.authDir, 'creds.json');
      return existsSync(credsPath);
    } catch (error) {
      console.error('❌ [FILE] Error checking credentials:', error);
      return false;
    }
  }
}

export class DatabaseCredentialStorage implements CredentialStorage {
  private sessionId: string;

  constructor(sessionId: string = 'main') {
    this.sessionId = sessionId;
  }

  async getAuthState(): Promise<{ state: AuthenticationState; saveCreds: (creds: Partial<AuthenticationCreds>) => Promise<void> }> {
    // Load existing credentials from database
    const session = await prisma.whatsAppCredential.findUnique({
      where: { sessionId: this.sessionId }
    });

    let creds: Partial<AuthenticationCreds> | undefined = undefined;
    let keys: any = {};

    if (session) {
      try {
        // Parse and convert credentials with Buffer conversion
        if (session.creds) {
          const rawCreds = JSON.parse(session.creds);
          creds = convertMigratedData(rawCreds); // Convert any Buffer-like objects in creds
        }
        
        if (session.keys) {
          const parsedKeys = JSON.parse(session.keys);
          
          // Check if keys are in migrated format (direct file format) or runtime format (type:id)
          if (typeof parsedKeys === 'object' && parsedKeys !== null) {
            // If keys contain entries like "pre-key-1", convert to runtime format
            if (Object.keys(parsedKeys).some(key => key.includes('-') && !key.includes(':'))) {
              console.log('🔄 [DB] Converting migrated keys to runtime format');
              keys = {};
              
              for (const [fileName, data] of Object.entries(parsedKeys)) {
                // Convert raw migrated data to proper Buffer/Uint8Array format
                const convertedData = convertMigratedData(data);
                
                // Convert file names to type:id format
                if (fileName.startsWith('app-state-sync-key-')) {
                  const id = fileName.replace('app-state-sync-key-', '');
                  keys[`app-state-sync-key:${id}`] = convertedData;
                } else if (fileName.startsWith('pre-key-')) {
                  const id = fileName.replace('pre-key-', '');
                  keys[`pre-key:${id}`] = convertedData;
                } else if (fileName.startsWith('sender-key-')) {
                  const id = fileName.replace('sender-key-', '');
                  keys[`sender-key:${id}`] = convertedData;
                } else if (fileName.startsWith('session-')) {
                  const id = fileName.replace('session-', '');
                  keys[`session:${id}`] = convertedData;
                } else if (fileName.startsWith('app-state-sync-version-')) {
                  const id = fileName.replace('app-state-sync-version-', '');
                  keys[`app-state-sync-version:${id}`] = convertedData;
                } else {
                  // Fallback for unknown formats
                  keys[fileName] = convertedData;
                }
              }
              
              console.log(`🔑 [DB] Converted ${Object.keys(keys).length} keys from migration format`);
            } else {
              // Keys are already in runtime format or deserialized format
              keys = deserializeKeys(session.keys);
            }
          }
        }
        
        console.log('📖 [DB] Loaded credentials from database with', Object.keys(keys).length, 'keys');
      } catch (error) {
        console.error('❌ [DB] Error parsing credentials:', error);
        creds = undefined;
        keys = {};
      }
    } else {
      console.log('🆕 [DB] No existing credentials found, creating new session');
    }

    const state: AuthenticationState = {
      creds: creds as any, // Type assertion for compatibility with Baileys
      keys: {
        get: (type: keyof SignalDataTypeMap, ids: string[]) => {
          const result: any = {};
          for (const id of ids) {
            const key = `${type}:${id}`;
            if (keys[key]) {
              const keyData = keys[key];
              
              // Keys from migration are already properly converted, just return them
              // Only convert base64 strings to Buffer if they're still strings
              if (keyData && typeof keyData === 'object' && keyData.keyData && typeof keyData.keyData === 'string') {
                // Only convert if it looks like base64 and has correct length characteristics
                try {
                  const buffer = Buffer.from(keyData.keyData, 'base64');
                  // Validate reasonable key length (typically 32 bytes for curve25519)
                  if (buffer.length === 32 || buffer.length === 64) {
                    const convertedData = {
                      ...keyData,
                      keyData: buffer
                    };
                    result[id] = convertedData;
                  } else {
                    // Length doesn't match expected key size, keep as string
                    result[id] = keyData;
                  }
                } catch (error) {
                  // If base64 decode fails, keep original
                  result[id] = keyData;
                }
              } else {
                result[id] = keyData;
              }
            }
          }
          return result;
        },
        set: (data: any) => {
          for (const [type, idData] of Object.entries(data)) {
            for (const [id, value] of Object.entries(idData as any)) {
              const key = `${type}:${id}`;
              if (value) {
                keys[key] = value;
              } else {
                delete keys[key];
              }
            }
          }
        }
      }
    };

    const saveCreds = async (newCreds: Partial<AuthenticationCreds>) => {
      try {
        // Merge with existing creds
        if (creds) {
          creds = { ...creds, ...newCreds };
        } else {
          creds = newCreds;
        }

        await prisma.whatsAppCredential.upsert({
          where: { sessionId: this.sessionId },
          update: {
            creds: JSON.stringify(creds),
            keys: serializeKeys(keys), // Use proper serialization
            updatedAt: new Date()
          },
          create: {
            sessionId: this.sessionId,
            creds: JSON.stringify(creds),
            keys: serializeKeys(keys) // Use proper serialization
          }
        });
        console.log('💾 [DB] Credentials saved to database');
      } catch (error) {
        console.error('❌ [DB] Error saving credentials:', error);
        throw error;
      }
    };

    return { state, saveCreds };
  }

  async clearCredentials(): Promise<void> {
    try {
      await prisma.whatsAppCredential.deleteMany({
        where: { sessionId: this.sessionId }
      });
      console.log(`🗑️ [DB] Cleared credentials for session ${this.sessionId}`);
    } catch (error) {
      console.error('❌ [DB] Error clearing credentials:', error);
      throw error;
    }
  }

  async hasCredentials(): Promise<boolean> {
    try {
      const session = await prisma.whatsAppCredential.findUnique({
        where: { sessionId: this.sessionId }
      });
      return session !== null && session.creds !== null;
    } catch (error) {
      console.error('❌ [DB] Error checking credentials:', error);
      return false;
    }
  }
}

// Factory function to create appropriate storage based on environment
export function createCredentialStorage(): CredentialStorage {
  const storageMode = process.env.WHATSAPP_CREDENTIAL_STORAGE || 'file';
  
  switch (storageMode) {
    case 'database':
      console.log('🏗️ Using Database Credential Storage');
      return new DatabaseCredentialStorage();
    case 'file':
    default:
      console.log('🏗️ Using File Credential Storage (auth_info_baileys)');
      return new FileCredentialStorage();
  }
}
