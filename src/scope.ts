export function normalizePath(value: string): string {
  let normalized = value.replace(/\\/g, "/");
  if (normalized.startsWith("./")) {
    normalized = normalized.slice(2);
  }
  return normalized;
}

export function isInScope(filePath: string, allowedPaths: string[]): boolean {
  const normalizedFile = normalizePath(filePath);
  return allowedPaths.some((allowed) => {
    const normalizedAllowed = normalizePath(allowed);
    if (!normalizedAllowed) {
      return false;
    }
    return normalizedFile.startsWith(normalizedAllowed);
  });
}
