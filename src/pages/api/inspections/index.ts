import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: number;
    role: 'inspector' | 'qc' | 'pm';
  };
}

// Authentication middleware
const authenticateToken = (req: AuthenticatedRequest, res: NextApiResponse, next: () => void) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  console.log('Auth header:', authHeader);
  console.log('Extracted token:', token ? `${token.substring(0, 20)}...` : 'None');

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
    console.log('Using JWT_SECRET:', JWT_SECRET.substring(0, 10) + '...');
    
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    console.log('Decoded token:', { userId: decoded.userId, role: decoded.role });
    
    // Map JWT payload to expected user object structure
    req.user = {
      id: decoded.userId,
      role: decoded.role
    };
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ error: 'Invalid token', details: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate the request
  authenticateToken(req, res, async () => {
    try {
      const { page = 1, limit = 10, search, status, severity } = req.query;
      const pageNumber = parseInt(page as string);
      const limitNumber = parseInt(limit as string);
      const offset = (pageNumber - 1) * limitNumber;

      // Build base query conditions
      const whereConditions: any = {};

      // Role-based filtering
      if (req.user?.role === 'inspector') {
        // Inspectors only see their own inspections
        whereConditions.inspectorId = req.user.id;
      }
      // QC and PM roles see all inspections (no additional filter needed)

      // Add search filter
      if (search) {
        whereConditions.OR = [
          {
            inspectionType: {
              contains: search as string
            }
          },
          {
            location: {
              contains: search as string
            }
          },
          {
            inspector: {
              fullName: {
                contains: search as string
              }
            }
          }
        ];
      }

      // Add status filter
      if (status && status !== 'all') {
        whereConditions.status = status;
      }

      // Add severity filter
      if (severity && severity !== 'all') {
        whereConditions.severity = severity;
      }

      // Get total count for pagination
      const totalCount = await prisma.inspection.count({
        where: whereConditions
      });

      // Fetch inspections with pagination
      const inspections = await prisma.inspection.findMany({
        where: whereConditions,
        include: {
          inspector: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true
            }
          },
          qcApprovedBy: {
            select: {
              id: true,
              fullName: true
            }
          },
          pmApprovedBy: {
            select: {
              id: true,
              fullName: true
            }
          },
          onHoldBy: {
            select: {
              id: true,
              fullName: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limitNumber
      });

      const totalPages = Math.ceil(totalCount / limitNumber);

      res.status(200).json({
        inspections,
        pagination: {
          currentPage: pageNumber,
          totalPages,
          totalCount,
          hasNext: pageNumber < totalPages,
          hasPrev: pageNumber > 1
        }
      });
    } catch (error) {
      console.error('Error fetching inspections:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}
