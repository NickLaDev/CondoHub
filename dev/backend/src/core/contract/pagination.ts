import { Request, Response } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  order: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export function parsePagination(query: Request['query']): PaginationParams {
  let page = parseInt(query.page as string, 10);
  if (isNaN(page) || page < 1) page = 1;

  let limit = parseInt(query.limit as string, 10);
  if (isNaN(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100;

  const sort = (query.sort as string) || undefined;

  let order: 'asc' | 'desc' = 'asc';
  if (query.order === 'desc') order = 'desc';

  return { page, limit, sort, order };
}

export function respondPaginated<T>(
  res: Response,
  items: T[],
  total: number,
  page: number,
  limit: number,
): void {
  const body: PaginatedResponse<T> = { items, total, page, limit };
  res.json(body);
}
