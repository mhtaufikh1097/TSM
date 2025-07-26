// app/api/whatsapp/credential-storage/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { CredentialManager } from '@/lib/whatsapp/credential-manager';

export async function GET() {
  try {
    const status = await CredentialManager.getStorageStatus();
    
    return NextResponse.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting storage status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get storage status'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sessionId = 'main', newMode } = body;

    let result;

    switch (action) {
      case 'migrate-to-database':
        result = await CredentialManager.migrateFileToDatabase(sessionId);
        break;
        
      case 'migrate-to-file':
        result = await CredentialManager.migrateDatabaseToFile(sessionId);
        break;
        
      case 'clear-all':
        result = await CredentialManager.clearAllCredentials(sessionId);
        break;
        
      case 'switch-mode':
        if (!newMode || !['file', 'database'].includes(newMode)) {
          return NextResponse.json({
            success: false,
            error: 'Invalid newMode. Must be "file" or "database"'
          }, { status: 400 });
        }
        result = await CredentialManager.switchStorageMode(newMode, sessionId);
        break;
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Must be one of: migrate-to-database, migrate-to-file, clear-all, switch-mode'
        }, { status: 400 });
    }

    return NextResponse.json({
      success: result.success,
      message: result.message,
      data: result
    }, { status: result.success ? 200 : 400 });

  } catch (error) {
    console.error('Error handling credential storage request:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process request'
    }, { status: 500 });
  }
}
