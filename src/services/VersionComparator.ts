export const isNewerVersion = (current: string, latest: string): boolean => {
  // Try to extract standard version numbers (e.g., 2.24.10)
  const currentMatch = current.match(/(\d+)\.(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  const latestMatch = latest.match(/(\d+)\.(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  
  if (!currentMatch || !latestMatch) {
    // If they use weird versions like "v1-alpha", just do a basic text check
    return current !== latest;
  }
  
  // Compare Major, Minor, Patch, and Build numbers
  for (let i = 1; i <= 4; i++) {
    const currNum = parseInt(currentMatch[i] || '0', 10);
    const lateNum = parseInt(latestMatch[i] || '0', 10);
    
    if (lateNum > currNum) return true; // Found an update!
    if (lateNum < currNum) return false; // It's an older version
  }
  
  return false; // They are exactly the same
};