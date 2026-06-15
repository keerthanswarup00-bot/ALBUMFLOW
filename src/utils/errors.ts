export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number = 400) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class AuthError extends AppError {
  constructor(message: string, code: string = 'AUTH_ERROR') {
    super(message, code, 401);
    this.name = 'AuthError';
  }
}

export class ApiError extends AppError {
  public readonly originalError: unknown;

  constructor(message: string, statusCode: number = 500, originalError?: unknown) {
    super(message, `API_ERROR_${statusCode}`, statusCode);
    this.name = 'ApiError';
    this.originalError = originalError;
  }
}

export class StorageError extends AppError {
  constructor(message: string, originalError?: unknown) {
    super(message, 'STORAGE_ERROR', 500);
    this.name = 'StorageError';
    this.originalError = originalError;
  }

  declare originalError: unknown;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
}

export function getErrorCode(error: unknown): string {
  if (error instanceof AppError) return error.code;
  return 'UNKNOWN_ERROR';
}
