export enum LibraryPermission {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  INVITE = 'invite',
  MANAGE_MEMBERS = 'manage_members',
  EXPORT = 'export',
  UPLOAD = 'upload',
  DOWNLOAD = 'download',
  SHARE = 'share',
  ADMIN = 'admin'
}

export interface PermissionData {
  [key: string]: boolean | string | number;
}