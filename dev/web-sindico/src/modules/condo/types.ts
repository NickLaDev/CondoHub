export interface CondoProfile {
  id: string;
  name: string;
  address: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateCondoProfileRequest {
  name?: string;
  address?: string;
  phone?: string;
}