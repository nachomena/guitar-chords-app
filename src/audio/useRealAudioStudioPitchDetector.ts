// Wires the validated pitch-detection algorithm (pitchDetectionAlgorithm.ts) up to a
// real microphone stream via @siteed/audio-studio.
//
// Only ever reached through the guarded require() in usePitchDetector.ts — never
// statically imported from anywhere else in the app. Evaluating '@siteed/audio-studio'
// calls expo-modules-core's requireNativeModule('AudioStudio') immediately at
// import time, which throws in Expo Go: that native module isn't part of the fixed
// set Expo Go ships with, so merely importing this file there would crash the whole
// app on startup, not just the Tuner screen.
//
// UNVERIFIED ON A REAL DEVICE: this environment has no simulator or physical device
// to build an Expo Dev Client against (see the implementation plan) — this needs a
// real on-device pass before being trusted. What's confirmed so far, without a
// device: the algorithm itself (pitchDetectionAlgorithm.test.ts, against synthetic
// tones) and that @siteed/audio-studio's Expo config plugin resolves and applies
// cleanly (`npx expo config --type introspect`, no crash, correct
// NSMicrophoneUsageDescription/RECORD_AUDIO output) — see app.json.
import { useCallback, useMemo, useRef } from 'react';
import { AudioStudioModule, useAudioRecorder } from '@siteed/audio-studio';
import type { AudioDataEvent } from '@siteed/audio-studio';

import {
  createGuitarStringPitchDetectionFunction,
  GUITAR_STRING_PITCH_DETECTION_ANALYSIS_WINDOW_SAMPLE_COUNT,
} from './pitchDetectionAlgorithm';
import { appendSamplesToSlidingAnalysisWindow } from './slidingAudioAnalysisWindow';
import type { PitchDetectionSampleListener, PitchDetector } from './PitchDetector';

const RECORDING_SAMPLE_RATE_HERTZ = 44100;

export function useRealAudioStudioPitchDetector(): PitchDetector {
  const audioRecorder = useAudioRecorder();
  // useAudioRecorder() returns a new object identity on every render (e.g. right
  // after startRecording() flips its internal isRecording state) — closing over it
  // directly in the memoized PitchDetector below would change that object's identity
  // too, which would retrigger useTuner's effect and cause a start/stop/start loop
  // (that's what produced the "resolved" immediately followed by "Failed to start
  // recording" — the effect tore down and restarted mid-flight). Reading the latest
  // recorder through a ref keeps the returned PitchDetector's identity stable.
  const audioRecorderRef = useRef(audioRecorder);
  audioRecorderRef.current = audioRecorder;

  const detectGuitarStringPitch = useRef(
    createGuitarStringPitchDetectionFunction(RECORDING_SAMPLE_RATE_HERTZ),
  ).current;
  const analysisWindowRef = useRef<Float32Array>(new Float32Array(0));
  const sampleListenerRef = useRef<PitchDetectionSampleListener | null>(null);

  const handleAudioStreamEvent = useCallback(
    async (event: AudioDataEvent) => {
      if (!(event.data instanceof Float32Array)) return;

      analysisWindowRef.current = appendSamplesToSlidingAnalysisWindow(
        analysisWindowRef.current,
        event.data,
        GUITAR_STRING_PITCH_DETECTION_ANALYSIS_WINDOW_SAMPLE_COUNT,
      );

      if (
        analysisWindowRef.current.length <
        GUITAR_STRING_PITCH_DETECTION_ANALYSIS_WINDOW_SAMPLE_COUNT
      ) {
        // Still filling the window for the first time after startListening().
        return;
      }

      const estimatedFrequencyHz = detectGuitarStringPitch(analysisWindowRef.current);
      sampleListenerRef.current?.({
        // Onset detection (vs. a sustained note still ringing) isn't needed for the
        // Tuner's continuous-tracking mode — Follow Mode will need real onset logic
        // here when it's built.
        isOnsetDetected: false,
        isFundamentalFrequencyPresent: estimatedFrequencyHz !== null,
        estimatedFrequencyHz,
      });
    },
    [detectGuitarStringPitch],
  );

  return useMemo<PitchDetector>(
    () => ({
      isImplemented: true,
      requestMicrophonePermission: async () => {
        const permissionResult: { granted?: boolean } =
          await AudioStudioModule.requestPermissionsAsync();
        return permissionResult?.granted === true;
      },
      startListening: async (onSample) => {
        sampleListenerRef.current = onSample;
        analysisWindowRef.current = new Float32Array(0);
        await audioRecorderRef.current.startRecording({
          sampleRate: RECORDING_SAMPLE_RATE_HERTZ,
          channels: 1,
          encoding: 'pcm_32bit',
          streamFormat: 'float32',
          onAudioStream: handleAudioStreamEvent,
        });
      },
      stopListening: async () => {
        sampleListenerRef.current = null;
        if (audioRecorderRef.current.isRecording) {
          await audioRecorderRef.current.stopRecording();
        }
      },
    }),
    // Deliberately stable — see the comment on audioRecorderRef above. This should
    // only ever be recomputed if handleAudioStreamEvent's own identity changes,
    // which it doesn't (it only depends on detectGuitarStringPitch, a ref value
    // established once on mount).
    [handleAudioStreamEvent],
  );
}
