import { ApiErrorResponse } from '../types';

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly provider?: string;
  public readonly details?: any;

  constructor(
    message: string,
    code = 'INTERNAL_ERROR',
    statusCode = 500,
    provider?: string,
    details?: any
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.provider = provider;
    this.details = details;
  }
}

export function formatErrorResponse(
  error: unknown,
  defaultProvider?: string
): { response: ApiErrorResponse; status: number } {
  if (error instanceof AppError) {
    return {
      response: {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
          provider: error.provider || defaultProvider,
          details: error.details,
        },
      },
      status: error.statusCode,
    };
  }

  const err = error as any;
  const isTimeout =
    err?.name === 'TimeoutError' ||
    err?.name === 'AbortError' ||
    err?.message?.includes('timed out');

  if (isTimeout) {
    return {
      response: {
        ok: false,
        error: {
          code: 'PROVIDER_TIMEOUT',
          message: 'Upstream provider request timed out',
          provider: defaultProvider,
        },
      },
      status: 504,
    };
  }

  return {
    response: {
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err?.message || 'An unexpected error occurred',
        provider: defaultProvider,
      },
    },
    status: 500,
  };
}
