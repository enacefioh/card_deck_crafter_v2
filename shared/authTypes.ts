export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  passwordHash: string | null;
  role: UserRole;
  storageQuotaMb: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserSummary {
  id: string;
  email: string;
  role: UserRole;
  hasPassword: boolean;
  storageQuotaMb: number;
  createdAt: string;
}

export interface AuthSession {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}

export interface AuthStatusResponse {
  initialized: boolean;
  usersCount: number;
}

export interface AuthMeResponse {
  user: {
    id: string;
    email: string;
    role: UserRole;
  } | null;
}

export interface LoginResponse {
  status: 'OK' | 'REQUIRES_ACTIVATION';
  email: string;
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
  error?: string;
}

export interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
}

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  createUser(email: string, role?: UserRole, passwordHash?: string | null, storageQuotaMb?: number): Promise<User>;
  setPassword(userId: string, passwordHash: string): Promise<void>;
  resetPassword(userId: string): Promise<void>;
  updateRole(userId: string, role: UserRole): Promise<void>;
  updateStorageQuota(userId: string, quotaMb: number): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  countUsers(): Promise<number>;
  listUsers(): Promise<UserSummary[]>;
  getDashboardMetrics(): Promise<DashboardMetrics>;
}

export interface CloudProjectMetadata {
  id: string;
  userId: string;
  filename: string;
  name: string;
  description: string;
  cardCount: number;
  documentCount: number;
  fileSizeBytes: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserStorageInfo {
  quotaMb: number;
  quotaBytes: number;
  usedBytes: number;
  usedMb: number;
  availableBytes: number;
  availableMb: number;
  percentUsed: number;
}
