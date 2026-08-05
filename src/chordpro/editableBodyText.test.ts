import { extractEditableChordSheetBodyText } from './editableBodyText';

describe('extractEditableChordSheetBodyText', () => {
  it('strips only the song-level metadata directives, keeping strum/comment/tab directives intact', () => {
    const chordSheetText = [
      '{title: Good Riddance}',
      '{artist: Green Day}',
      '{key: G}',
      '{bpm: 96}',
      '{time: 4/4}',
      '',
      '{comment: Intro}',
      '{start_of_tab}',
      'e|-------0-----0-|',
      '{end_of_tab}',
      '',
      '{comment: Verse 1}',
      '{strum: Finger picking}',
      '[G]Another turning point',
    ].join('\n');

    const editableBodyText = extractEditableChordSheetBodyText(chordSheetText);

    expect(editableBodyText).toBe(
      [
        '{comment: Intro}',
        '{start_of_tab}',
        'e|-------0-----0-|',
        '{end_of_tab}',
        '',
        '{comment: Verse 1}',
        '{strum: Finger picking}',
        '[G]Another turning point',
      ].join('\n'),
    );
  });
});
