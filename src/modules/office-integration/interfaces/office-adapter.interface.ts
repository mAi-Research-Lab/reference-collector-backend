import { ConflictData } from "src/modules/sync-sessions/interfaces/conflict-data";

export interface ManifestConfig {
  appId: string;
  version: string;
  displayName: string;
  description: string;
  baseUrl: string;
  permissions: string[];
}

export interface EntryPointConfig {
  baseUrl: string;
  theme: 'light' | 'dark';
  locale: string;
}

export interface SyncResult {
  success: boolean;
  syncedOperations: number;
  conflicts: ConflictData[];
  newVersion: number;
}