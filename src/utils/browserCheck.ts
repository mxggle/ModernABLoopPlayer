/**
 * Utility functions for checking browser capabilities
 */

import { isElectron } from './platform';

export interface BrowserCapabilities {
    supportsMediaRecorder: boolean;
    supportsGetUserMedia: boolean;
    supportsAudioRecording: boolean;
    browserName: string;
    isMobile: boolean;
}

/**
 * Check if the browser supports audio recording
 * Now supports all browsers including iOS Safari through Web Audio API fallback
 */
export function checkAudioRecordingSupport(): BrowserCapabilities {
    // In Electron, navigator.userAgent contains "Electron" — never treat as mobile
    const isMobile = !isElectron() && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // Detect browser name for better error messages
    let browserName = 'Unknown';
    if (isElectron()) {
        browserName = 'Electron';
    } else if (navigator.userAgent.indexOf('Safari') !== -1 && navigator.userAgent.indexOf('Chrome') === -1) {
        browserName = 'Safari';
    } else if (navigator.userAgent.indexOf('Chrome') !== -1) {
        browserName = 'Chrome';
    } else if (navigator.userAgent.indexOf('Firefox') !== -1) {
        browserName = 'Firefox';
    }

    const supportsGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const supportsMediaRecorder = typeof MediaRecorder !== 'undefined';

    // Audio recording is now supported on all browsers with getUserMedia
    // We use MediaRecorder where available, and fall back to Web Audio API on iOS Safari
    const supportsAudioRecording = supportsGetUserMedia;

    return {
        supportsMediaRecorder,
        supportsGetUserMedia,
        supportsAudioRecording,
        browserName,
        isMobile,
    };
}

/**
 * Get a user-friendly error message for why recording is not supported
 */
export function getRecordingUnsupportedMessage(capabilities: BrowserCapabilities): string {
    const { supportsGetUserMedia } = capabilities;

    if (!supportsGetUserMedia) {
        return 'Your browser does not support microphone access. Please use a modern browser like Chrome, Firefox, Safari, or Edge.';
    }

    return 'Audio recording is not supported in your browser. Please update to the latest version or try a different browser.';
}
