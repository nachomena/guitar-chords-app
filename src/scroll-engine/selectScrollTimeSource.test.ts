import { selectScrollTimeSourceForSong } from './selectScrollTimeSource';

describe('selectScrollTimeSourceForSong', () => {
  it('uses the duration engine when durationSeconds is set, even if bpm is also set', () => {
    const selection = selectScrollTimeSourceForSong({
      durationSeconds: 45,
      beatsPerMinute: 120,
      timeSignatureNumerator: 4,
      lineCount: 10,
    });
    expect(selection).toEqual({ isAvailable: true, totalDurationMilliseconds: 45000 });
  });

  it('falls back to the bpm engine when no duration is set', () => {
    const selection = selectScrollTimeSourceForSong({
      durationSeconds: null,
      beatsPerMinute: 120,
      timeSignatureNumerator: 4,
      lineCount: 8,
    });
    // msPerBeat = 500, msPerLine = 2000, total = 8 * 2000 = 16000
    expect(selection).toEqual({ isAvailable: true, totalDurationMilliseconds: 16000 });
  });

  it('reports auto-scroll unavailable when neither duration nor bpm is set', () => {
    const selection = selectScrollTimeSourceForSong({
      durationSeconds: null,
      beatsPerMinute: null,
      timeSignatureNumerator: 4,
      lineCount: 8,
    });
    expect(selection).toEqual({ isAvailable: false });
  });

  it('treats a zero or negative duration as not set', () => {
    const selection = selectScrollTimeSourceForSong({
      durationSeconds: 0,
      beatsPerMinute: 90,
      timeSignatureNumerator: 4,
      lineCount: 4,
    });
    expect(selection.isAvailable).toBe(true);
    if (selection.isAvailable) {
      // falls back to bpm: msPerBeat = 666.67, msPerLine = 2666.67, *4 lines
      expect(selection.totalDurationMilliseconds).toBeCloseTo((60000 / 90) * 4 * 4, 0);
    }
  });
});
