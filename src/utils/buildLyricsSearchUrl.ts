/**
 * Builds a Google search URL for a song's lyrics from its title/artist, for the
 * "View QR" feature on the song detail screen. Pure and offline — this only
 * constructs the URL string; nothing here makes a network request.
 *
 * Returns null when there's nothing meaningful to search for (both fields empty or
 * whitespace-only), so callers can show a graceful fallback instead of a broken URL.
 */
export function buildLyricsSearchUrl(title: string, artist: string): string | null {
  const queryParts = [title.trim(), artist.trim()].filter((part) => part.length > 0);
  if (queryParts.length === 0) return null;

  const searchQuery = `${queryParts.join(' ')} letra`;
  return `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
}
