// lib/inspectionService.ts - Server-side only service
import { prisma } from '@/lib/prisma';
import { FileType } from '@prisma/client';

/**
 * Creates a new inspection record with uploaded files
 * @param {any} inspectionData - Inspection form data
 * @param {Array<{path: string, name: string, type: string}>} files - Uploaded files information
 * @returns {Promise<any>} - Created inspection record with ID
 */
export const createInspection = async (inspectionData: any, files: Array<{path: string, name: string, type: string}> = []): Promise<any> => {
  try {
    // Start a transaction to ensure both inspection and files are saved
    const result = await prisma.$transaction(async (tx) => {
      // First create the inspection record
      const inspection = await tx.inspection.create({
        data: {
          inspectionType: inspectionData.inspectionType,
          location: inspectionData.location,
          inspector: {
            connect: { id: inspectionData.inspectorId }
          },
          findings: inspectionData.findings,
          actionRequired: inspectionData.actionRequired,
          severity: inspectionData.severity,
          status: 'pending'
        }
      });
      
      // Then create records for each uploaded file
      if (files.length > 0) {
        await tx.inspectionFile.createMany({
          data: files.map(file => ({
            inspectionId: inspection.id,
            filePath: file.path,
            fileName: file.name,
            fileType: file.type.startsWith('image/')
              ? FileType.image
              : FileType.document
          }))
        });
      }
      
      // Return the created inspection with its ID
      return inspection;
    });
    
    return result;
  } catch (error) {
    console.error('Error creating inspection:', error);
    throw error;
  }
};

/**
 * Gets inspection details by ID, including files and related approvers
 * @param {number} id - Inspection ID
 * @returns {Promise<any>} - Inspection details
 */
export const getInspectionById = async (id: number): Promise<any> => {
  try {
    const inspection = await prisma.inspection.findUnique({
      where: { id },
      include: {
        inspector: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            role: true
          }
        },
        files: true,
        qcApprovedBy: {
          select: {
            id: true,
            fullName: true,
            role: true
          }
        },
        pmApprovedBy: {
          select: {
            id: true,
            fullName: true,
            role: true
          }
        }
      }
    });
    
    return inspection;
  } catch (error) {
    console.error('Error fetching inspection:', error);
    throw error;
  }
};

/**
 * Updates the approval status of an inspection
 * @param {number} id - Inspection ID
 * @param {'qc_approved'|'pm_approved'|'rejected'} status - New status
 * @param {number} approverId - ID of the approver
 * @param {string} comment - Optional comment with the approval/rejection
 * @returns {Promise<any>} - Updated inspection
 */
export const updateInspectionStatus = async (
  id: number, 
  status: 'qc_approved' | 'pm_approved' | 'rejected',
  approverId: number,
  comment?: string
): Promise<any> => {
  try {
    const updateData: any = { status };
    
    // Set the appropriate fields based on status and role
    if (status === 'qc_approved') {
      updateData.qcApprovedBy = approverId;
      updateData.qcApprovedAt = new Date();
      updateData.qcComment = comment;
    } else if (status === 'pm_approved') {
      updateData.pmApprovedBy = approverId;
      updateData.pmApprovedAt = new Date();
      updateData.pmComment = comment;
    } else if (status === 'rejected') {
      updateData.rejectedBy = approverId;
      updateData.rejectedAt = new Date();
      updateData.rejectionReason = comment;
    }
    
    const updatedInspection = await prisma.inspection.update({
      where: { id },
      data: updateData,
      include: {
        inspector: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true
          }
        }
      }
    });
    
    return updatedInspection;
  } catch (error) {
    console.error('Error updating inspection status:', error);
    throw error;
  }
};

/**
 * Gets pending inspections for a specific role
 * @param {string} role - User role (qc or pm)
 * @returns {Promise<any[]>} - List of pending inspections
 */
export const getPendingInspections = async (role: 'qc' | 'pm'): Promise<any[]> => {
  try {
    // QC sees all pending inspections
    // PM sees only QC-approved inspections
    const status = role === 'qc' ? 'pending' : 'qc_approved';
    
    const inspections = await prisma.inspection.findMany({
      where: { status },
      include: {
        inspector: {
          select: {
            id: true,
            fullName: true
          }
        },
        files: {
          select: {
            id: true,
            filePath: true,
            fileType: true,
            fileName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return inspections;
  } catch (error) {
    console.error('Error fetching pending inspections:', error);
    throw error;
  }
};

/**
 * Gets all inspections for an inspector
 * @param {number} inspectorId - User ID of the inspector
 * @returns {Promise<any[]>} - List of inspections
 */
export const getInspectorInspections = async (inspectorId: number): Promise<any[]> => {
  try {
    const inspections = await prisma.inspection.findMany({
      where: {
        inspectorId
      },
      include: {
        files: {
          select: {
            id: true,
            filePath: true,
            fileType: true,
            fileName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return inspections;
  } catch (error) {
    console.error('Error fetching inspector inspections:', error);
    throw error;
  }
};

/**
 * Gets users by role to send notifications to
 * @param {string} role - User role to filter by
 * @returns {Promise<{id: number, phoneNumber: string}[]>} - List of users with their phone numbers
 */
export const getUsersByRole = async (role: 'qc' | 'pm'): Promise<{id: number, phoneNumber: string}[]> => {
  try {
    const users = await prisma.user.findMany({
      where: { role },
      select: {
        id: true,
        phoneNumber: true
      }
    });
    
    return users;
  } catch (error) {
    console.error(`Error fetching ${role} users:`, error);
    throw error;
  }
};

/**
 * Gets QC and PM upliners for a specific inspector by traversing the hierarchy
 * Hierarchy: inspector -> qc -> pm
 * @param {number} inspectorId - ID of the inspector
 * @returns {Promise<{qc: Array<{id: number, phoneNumber: string, fullName: string}>, pm: Array<{id: number, phoneNumber: string, fullName: string}>}>} - Object containing QC and PM upliners
 */
export const getInspectorUpliners = async (inspectorId: number): Promise<{
  qc: Array<{id: number, phoneNumber: string, fullName: string}>,
  pm: Array<{id: number, phoneNumber: string, fullName: string}>
}> => {
  try {
    // Get the inspector with their upliner chain
    const inspector = await prisma.user.findUnique({
      where: { id: inspectorId },
      include: {
        upliner: {
          include: {
            upliner: true // This will get the PM (upliner of QC)
          }
        }
      }
    });

    if (!inspector) {
      throw new Error(`Inspector with ID ${inspectorId} not found`);
    }

    const qcUsers: Array<{id: number, phoneNumber: string, fullName: string}> = [];
    const pmUsers: Array<{id: number, phoneNumber: string, fullName: string}> = [];

    // Check if inspector has a direct upliner (should be QC)
    if (inspector.upliner) {
      const qcUpliner = inspector.upliner;
      
      // Verify that the direct upliner is actually a QC
      if (qcUpliner.role === 'qc') {
        qcUsers.push({
          id: qcUpliner.id,
          phoneNumber: qcUpliner.phoneNumber,
          fullName: qcUpliner.fullName || `QC User ${qcUpliner.id}`
        });

        // Check if QC has an upliner (should be PM)
        if (qcUpliner.upliner) {
          const pmUpliner = qcUpliner.upliner;
          
          // Verify that the QC's upliner is actually a PM
          if (pmUpliner.role === 'pm') {
            pmUsers.push({
              id: pmUpliner.id,
              phoneNumber: pmUpliner.phoneNumber,
              fullName: pmUpliner.fullName || `PM User ${pmUpliner.id}`
            });
          }
        }
      }
    }

    // If no upliners found through hierarchy, fall back to finding all QC/PM users
    // This handles cases where the hierarchy might not be properly set up
    if (qcUsers.length === 0) {
      console.warn(`No QC upliner found for inspector ${inspectorId}, falling back to all QC users`);
      const allQcUsers = await prisma.user.findMany({
        where: { role: 'qc' },
        select: {
          id: true,
          phoneNumber: true,
          fullName: true
        }
      });
      qcUsers.push(...allQcUsers.map(user => ({
        id: user.id,
        phoneNumber: user.phoneNumber,
        fullName: user.fullName || `QC User ${user.id}`
      })));
    }

    if (pmUsers.length === 0) {
      console.warn(`No PM upliner found for inspector ${inspectorId}, falling back to all PM users`);
      const allPmUsers = await prisma.user.findMany({
        where: { role: 'pm' },
        select: {
          id: true,
          phoneNumber: true,
          fullName: true
        }
      });
      pmUsers.push(...allPmUsers.map(user => ({
        id: user.id,
        phoneNumber: user.phoneNumber,
        fullName: user.fullName || `PM User ${user.id}`
      })));
    }

    return {
      qc: qcUsers,
      pm: pmUsers
    };
  } catch (error) {
    console.error('Error fetching inspector upliners:', error);
    throw error;
  }
};