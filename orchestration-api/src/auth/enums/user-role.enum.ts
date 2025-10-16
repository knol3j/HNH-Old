export enum UserRole {
  MINER = 'MINER',
  VENDOR = 'VENDOR',
  COMMUNITY = 'COMMUNITY',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum Permission {
  READ_STATS = 'read:stats',
  WRITE_JOBS = 'write:jobs',
  MANAGE_USERS = 'manage:users',
  ADMIN_ACCESS = 'admin:access',
  READ_WORKERS = 'read:workers',
  WRITE_WORKERS = 'write:workers',
  READ_VENDORS = 'read:vendors',
  WRITE_VENDORS = 'write:vendors',
}
