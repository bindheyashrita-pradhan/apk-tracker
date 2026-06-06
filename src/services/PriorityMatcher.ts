import { ApkVariant, MatchResult, MatchQuality } from '../types';
import { ARCH_PRIORITY, DPI_PRIORITY } from '../utils/constants';

export const findBestVariant = (variants: ApkVariant[]): MatchResult => {
  if (!variants || variants.length === 0) {
    return { variant: null, matchQuality: MatchQuality.NONE, message: 'No variants found', allVariants: [] };
  }
  
  // 1. Prioritize arm64-v8a (Your Realme Narzo 50 architecture)
  // 2. Fall back to 'universal' if arm64 isn't available
  for (const arch of ARCH_PRIORITY) {
    const archMatches = variants.filter(v => v.arch === arch);
    if (archMatches.length === 0) continue;
    
    // Check DPI (Prefer nodpi or universally compatible ones)
    for (const dpi of DPI_PRIORITY) {
      const exactMatch = archMatches.find(v => v.dpi === dpi);
      if (exactMatch) {
        return {
          variant: exactMatch,
          matchQuality: arch === 'arm64-v8a' ? MatchQuality.EXACT : MatchQuality.ARCH_FALLBACK,
          message: arch === 'arm64-v8a' ? '✅ Perfect Match (arm64-v8a)' : `⚠️ Universal Match (${arch})`,
          allVariants: variants
        };
      }
    }
  }
  
  return {
    variant: null,
    matchQuality: MatchQuality.NONE,
    message: '❌ No compatible variant found for your device',
    allVariants: variants
  };
};