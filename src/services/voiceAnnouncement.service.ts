import { useVoiceNotificationStore } from '@store/voiceNotification.store';

const SUPPORTED = typeof window !== 'undefined' && 'speechSynthesis' in window;

/**
 * Thin wrapper over the browser SpeechSynthesis API. Speaks nothing if the
 * browser doesn't support it or the user has Voice Notifications set to OFF
 * (Settings page). speechSynthesis queues utterances natively, so multiple
 * announcements in quick succession are read one after another rather than
 * overlapping.
 */
export function speakAnnouncement(text: string): void {
  if (!SUPPORTED) return;
  if (!useVoiceNotificationStore.getState().enabled) return;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-IN';
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}
