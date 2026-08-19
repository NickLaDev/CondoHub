export interface Resident {
  id: string;
  name: string;
  email: string;
  phone?: string;
  unitId: string;
  unit: {
    id: string;
    number: string;
    block: {
      id: string;
      name: string;
    };
  };
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface CreateResidentRequest {
  name: string;
  email: string;
  phone?: string;
  unitId: string;
}

export interface UpdateResidentRequest {
  name?: string;
  email?: string;
  phone?: string;
  unitId?: string;
}

export interface ResidentsResponse {
  data: Resident[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type StaffRole = 'FUNC_ENTREGAS' | 'FUNC_MANUTENCAO';

export interface Staff {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: StaffRole;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffRequest {
  name: string;
  email: string;
  phone?: string;
  role: StaffRole;
}

export interface UpdateStaffRequest {
  name?: string;
  email?: string;
  phone?: string;
  role?: StaffRole;
}

export interface StaffResponse {
  data: Staff[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}