import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';

interface ApprovalLink {
  role: 'qc' | 'pm';
  token: string;
  inspectionId: number;
}

interface TokenValidationResult extends ApprovalLink {
  isUsed: boolean;
  expiresAt: Date;
}


/**
 * Menyimpan token ke database
 */
export const storeApprovalToken = async (
  inspectionId: number,
  role: 'qc' | 'pm',
  expirationHours: number = 24
): Promise<string> => {
  try {
    const token = nanoid(12); // Lebih panjang untuk keamanan
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expirationHours);

    await prisma.approvalToken.create({
      data: {
        token,
        inspectionId,
        role,
        expiresAt,
      },
    });

    return token;
  } catch (error) {
    console.error('Error storing approval token:', error);
    throw new Error('Failed to store approval token');
  }
};

/**
 * Validasi token dari database
 */
export const validateApprovalTokenFromDB = async (
  token: string
): Promise<TokenValidationResult | null> => {
  try {
    const tokenData = await prisma.approvalToken.findUnique({
      where: { token },
      include: {
        inspection: true,
      },
    });

    if (!tokenData) {
      return null;
    }

    // Cek apakah token sudah expired
    if (tokenData.expiresAt < new Date()) {
      console.log('Token expired:', token);
      return null;
    }

    return {
      token: tokenData.token,
      inspectionId: tokenData.inspectionId,
      role: tokenData.role as 'qc' | 'pm',
      isUsed: tokenData.isUsed,
      expiresAt: tokenData.expiresAt,
    };
  } catch (error) {
    console.error('Error validating token:', error);
    return null;
  }
};

/**
 * Tandai token sebagai sudah digunakan
 */
export const markTokenAsUsed = async (token: string): Promise<boolean> => {
  try {
    const result = await prisma.approvalToken.update({
      where: { token },
      data: { isUsed: true },
    });

    return !!result;
  } catch (error) {
    console.error('Error marking token as used:', error);
    return false;
  }
};

/**
 * Hapus token yang sudah expired
 */
export const cleanupExpiredTokens = async (): Promise<number> => {
  try {
    const result = await prisma.approvalToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    console.log(`Cleaned up ${result.count} expired tokens`);
    return result.count;
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
    return 0;
  }
};

/**
 * Dapatkan semua token untuk inspection tertentu
 */
export const getInspectionTokens = async (inspectionId: number) => {
  try {
    return await prisma.approvalToken.findMany({
      where: { 
        inspectionId,
        expiresAt: { gte: new Date() } // Hanya yang belum expired
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error('Error getting inspection tokens:', error);
    return [];
  }
};