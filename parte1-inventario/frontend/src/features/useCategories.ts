import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from '../api/endpoints';

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
}
