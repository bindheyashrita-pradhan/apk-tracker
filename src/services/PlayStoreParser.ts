export const extractPackageName = (urlOrPackage: string): string | null => {
  const trimmed = urlOrPackage.trim();
  
  // If they just typed "com.whatsapp"
  const packagePattern = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i;
  if (packagePattern.test(trimmed)) return trimmed.toLowerCase();
  
  // If they pasted a full Play Store link
  const urlPatterns = [/[?&]id=([^&]+)/, /details\?id=([^&]+)/, /store\/apps\/details\?id=([^&]+)/];
  for (const pattern of urlPatterns) {
    const match = trimmed.match(pattern);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
};

export const extractAppNameFromPackage = (packageName: string): string => {
  const parts = packageName.split('.');
  let name = parts[parts.length - 1];
  name = name.replace(/^(com|org|net)\./i, '');
  return name.charAt(0).toUpperCase() + name.slice(1);
};

export const generateSearchTerm = (packageName: string): string => {
  const parts = packageName.split('.');
  let searchTerm = parts[parts.length - 1];
  const knownApps: Record<string, string> = {
    'com.whatsapp': 'whatsapp',
    'com.facebook.orca': 'messenger',
    'com.instagram.android': 'instagram',
    'com.twitter.android': 'twitter',
  };
  return knownApps[packageName] || searchTerm.toLowerCase();
};