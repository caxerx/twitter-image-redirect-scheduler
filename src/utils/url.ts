export function removeUrlQuery(originalUrl: string): string {
  try {
    const url = new URL(originalUrl);
    return url.origin + url.pathname;
  } catch {
    return originalUrl;
  }
}
