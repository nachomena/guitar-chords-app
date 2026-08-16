import { buildLyricsSearchUrl } from './buildLyricsSearchUrl';

describe('buildLyricsSearchUrl', () => {
  it('builds a Google search URL from title and artist', () => {
    expect(buildLyricsSearchUrl('Wonderwall', 'Oasis')).toBe(
      'https://www.google.com/search?q=Wonderwall%20Oasis%20letra',
    );
  });

  it('escapes accents, ñ, and other special characters', () => {
    const url = buildLyricsSearchUrl('Bicho de Ciudad', 'Los Piojos');
    expect(url).toBe('https://www.google.com/search?q=Bicho%20de%20Ciudad%20Los%20Piojos%20letra');

    const urlWithAccent = buildLyricsSearchUrl('Año 0', 'Léo');
    expect(urlWithAccent).toBe(
      `https://www.google.com/search?q=${encodeURIComponent('Año 0 Léo letra')}`,
    );
  });

  it('falls back to whichever field is present when the other is empty', () => {
    expect(buildLyricsSearchUrl('Wonderwall', '')).toBe(
      'https://www.google.com/search?q=Wonderwall%20letra',
    );
    expect(buildLyricsSearchUrl('', 'Oasis')).toBe(
      'https://www.google.com/search?q=Oasis%20letra',
    );
  });

  it('treats whitespace-only fields as empty', () => {
    expect(buildLyricsSearchUrl('  ', 'Oasis')).toBe(
      'https://www.google.com/search?q=Oasis%20letra',
    );
  });

  it('returns null when both title and artist are empty, instead of a broken URL', () => {
    expect(buildLyricsSearchUrl('', '')).toBeNull();
    expect(buildLyricsSearchUrl('  ', '  ')).toBeNull();
  });
});
