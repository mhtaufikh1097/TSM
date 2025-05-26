// services/clientInspectionService.ts - Updated client-side service for API calls
const API_BASE = '/api/inspections';
const USERS_API_BASE = '/api/users';

export interface InspectionData {
  inspectionType: string;
  location: string;
  inspectorId: number;
  findings: string;
  actionRequired: string;
  severity: string;
}

export interface FileData {
  path: string;
  name: string;
  type: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

/**
 * Creates a new inspection via API
 */
export const createInspection = async (inspectionData: InspectionData, files: FileData[] = []): Promise<any> => {
  const response = await fetch(`${API_BASE}/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inspectionData, files }),
  });

  const result: ApiResponse<any> = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Failed to create inspection');
  }

  return result.data;
};

/**
 * Gets inspection details by ID
 */
export const getInspectionById = async (id: number): Promise<any> => {
  const response = await fetch(`${API_BASE}/${id}`);
  const result: ApiResponse<any> = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Failed to fetch inspection');
  }

  return result.data;
};

/**
 * Updates inspection status
 */
export const updateInspectionStatus = async (
  id: number,
  status: 'qc_approved' | 'pm_approved' | 'rejected',
  approverId: number,
  comment?: string
): Promise<any> => {
  const response = await fetch(`${API_BASE}/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status, approverId, comment }),
  });

  const result: ApiResponse<any> = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Failed to update inspection status');
  }

  return result.data;
};

/**
 * Gets pending inspections for a role
 */
export const getPendingInspections = async (role: 'qc' | 'pm'): Promise<any[]> => {
  const response = await fetch(`${API_BASE}/pending?role=${role}`);
  const result: ApiResponse<any[]> = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Failed to fetch pending inspections');
  }

  return result.data;
};

/**
 * Gets all inspections for an inspector
 */
export const getInspectorInspections = async (inspectorId: number): Promise<any[]> => {
  const response = await fetch(`${API_BASE}/inspector/${inspectorId}`);
  const result: ApiResponse<any[]> = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Failed to fetch inspector inspections');
  }

  return result.data;
};

/**
 * Gets users by role (QC or PM)
 */
export const getUsersByRole = async (role: 'qc' | 'pm'): Promise<{id: number, phoneNumber: string}[]> => {
  const response = await fetch(`${USERS_API_BASE}/role/${role}`);
  const result: ApiResponse<{id: number, phoneNumber: string}[]> = await response.json();

  if (!response.ok) {
    throw new Error(result.message || `Failed to fetch ${role} users`);
  }

  return result.data;
};

/**
 * Gets QC and PM upliners for a specific inspector
 */
export const getInspectorUpliners = async (inspectorId: number): Promise<{
  qc: Array<{id: number, phoneNumber: string, fullName: string}>,
  pm: Array<{id: number, phoneNumber: string, fullName: string}>
}> => {
  const response = await fetch(`${API_BASE}/inspector/${inspectorId}/upliners`);
  const result: ApiResponse<{
    qc: Array<{id: number, phoneNumber: string, fullName: string}>,
    pm: Array<{id: number, phoneNumber: string, fullName: string}>
  }> = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Failed to fetch inspector upliners');
  }

  return result.data;
};

/**
 * Helper function to handle API errors consistently
 */
/**
 * Helper function to handle API errors consistently
 */
export const handleApiError = (error: any): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  return 'An unexpected error occurred';
};
