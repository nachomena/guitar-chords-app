// Selection order at playback time (SPEC.md §5.2): if the song has a durationSeconds
// use the duration engine (duration always wins when both are set); else if it has a
// bpm use the BPM engine; else auto-scroll is unavailable for that song (manual
// scroll still works).
import { computeTotalDurationMillisecondsFromBpmClock } from './timeSources/bpmClock';
import { computeTotalDurationMillisecondsFromDurationClock } from './timeSources/durationClock';

export type ScrollTimeSourceSelection =
  | { isAvailable: true; totalDurationMilliseconds: number }
  | { isAvailable: false };

export function selectScrollTimeSourceForSong(parameters: {
  durationSeconds: number | null;
  beatsPerMinute: number | null;
  timeSignatureNumerator: number;
  lineCount: number;
}): ScrollTimeSourceSelection {
  if (parameters.durationSeconds !== null && parameters.durationSeconds > 0) {
    return {
      isAvailable: true,
      totalDurationMilliseconds: computeTotalDurationMillisecondsFromDurationClock(
        parameters.durationSeconds,
      ),
    };
  }
  if (parameters.beatsPerMinute !== null && parameters.beatsPerMinute > 0) {
    return {
      isAvailable: true,
      totalDurationMilliseconds: computeTotalDurationMillisecondsFromBpmClock({
        beatsPerMinute: parameters.beatsPerMinute,
        beatsPerLine: parameters.timeSignatureNumerator,
        lineCount: parameters.lineCount,
      }),
    };
  }
  return { isAvailable: false };
}
