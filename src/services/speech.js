import * as Speech from 'expo-speech';
import Voice from '@react-native-voice/voice';

// Speech integration:
//  - speak(): reads status messages aloud (text-to-speech)
//  - startListening(): converts the user's voice to text (speech-to-text)
// Voice commands are matched against a small command list.

export function speak(text) {
  Speech.stop();
  Speech.speak(text, { language: 'en-US', rate: 1.0 });
}

export function startListening({ onResult, onError }) {
  Voice.onSpeechResults = (e) => onResult?.(e.value?.[0] ?? '');
  Voice.onSpeechError = (e) => onError?.(e.error);
  Voice.start('en-US');
}

export async function stopListening() {
  await Voice.stop();
  await Voice.destroy();
}

// Maps a spoken phrase to an app action.
export function parseCommand(transcript = '') {
  const t = transcript.toLowerCase();
  if (t.includes('file') || t.includes('document')) return { action: 'pickFile' };
  if (t.includes('gallery') || t.includes('photo') || t.includes('video')) return { action: 'pickGallery' };
  if (t.includes('receive') || t.includes('listen')) return { action: 'startReceiving' };
  if (t.includes('stop')) return { action: 'stop' };
  return { action: 'unknown', transcript };
}
