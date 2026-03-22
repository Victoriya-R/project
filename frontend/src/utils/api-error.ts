import axios from 'axios';

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === 'string' && data.trim()) return data;
    if (data && typeof data === 'object') {
      const errorMessage = 'error' in data && typeof data.error === 'string' ? data.error : undefined;
      const message = 'message' in data && typeof data.message === 'string' ? data.message : undefined;
      const missingFields = 'missing_fields' in data && Array.isArray(data.missing_fields) ? data.missing_fields.join(', ') : undefined;
      return [errorMessage ?? message, missingFields ? `Fields: ${missingFields}` : undefined].filter(Boolean).join('. ') || fallback;
    }
    return error.message || fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
