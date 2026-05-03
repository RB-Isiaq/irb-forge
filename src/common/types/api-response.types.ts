export interface ApiSuccessResponse<T> {
  success: true;
  statusCode: number;
  data: T;
  message: string | null;
  timestamp: string;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiPaginatedResponse<T> extends ApiSuccessResponse<T[]> {
  meta: PaginatedMeta;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  error: {
    code: string;
    message: string;
    details: ApiErrorDetail[];
  };
  path: string;
  timestamp: string;
}
