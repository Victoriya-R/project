import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { ApiResult } from '../services/api/client';

export function useApiQuery<T>(options: UseQueryOptions<ApiResult<T>, Error>) {
  return useQuery(options);
}
