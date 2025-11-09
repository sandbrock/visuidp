export interface User {
  name: string;
  email: string;
  roles?: string[];
}

export const isAdmin = (user: User | null): boolean => {
  return user?.roles?.includes('admin') ?? false;
}
