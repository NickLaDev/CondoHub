export interface Block {
  id: string;
  name: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface CreateBlockRequest {
  name: string;
}

export interface UpdateBlockRequest {
  name?: string;
}

export interface BlocksResponse {
  data: Block[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Unit {
  id: string;
  blockId: string;
  block: Block;
  number: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface CreateUnitRequest {
  blockId: string;
  number: string;
}

export interface UpdateUnitRequest {
  blockId?: string;
  number?: string;
}

export interface UnitsResponse {
  data: Unit[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}