export interface WatchlistItem {
  id: number;
  packageName: string;
  appName: string;
  searchTerm: string;
  currentVersion: string;
  lastNotifiedVersion: string | null;
  ignoredVersions: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}
export interface ApkVariant {
  version: string;
  arch: string;
  dpi: string;
  downloadUrl: string;
}
export enum MatchQuality {
  EXACT = 'EXACT',
  ARCH_FALLBACK = 'ARCH_FALLBACK',
  DPI_FALLBACK = 'DPI_FALLBACK',
  BOTH_FALLBACK = 'BOTH_FALLBACK',
  NONE = 'NONE'
}
export interface MatchResult {
  variant: ApkVariant | null;
  matchQuality: MatchQuality;
  message: string;
  allVariants: ApkVariant[];
}