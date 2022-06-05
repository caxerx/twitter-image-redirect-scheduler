export function parseTweetId(twitterUrl: string): string | null {
  const result = /https?:\/\/twitter\.com\/(.+)\/status\/(\d+)\??.*/.exec(
    twitterUrl,
  );
  if (result == null) {
    return null;
  }
  return result[2];
}
