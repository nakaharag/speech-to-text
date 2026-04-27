const API_URL = process.env.REACT_APP_API_URL || '';

export async function transcribeAudio(audioBlob, language = null) {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  if (language) {
    formData.append('language', language);
  }

  const response = await fetch(`${API_URL}/speech/transcribe`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Transcription failed: ${response.status}`);
  }

  return response.json();
}

export async function uploadAudioFile(file, language = null) {
  const formData = new FormData();
  formData.append('file', file);
  if (language) {
    formData.append('language', language);
  }

  const response = await fetch(`${API_URL}/speech/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Upload failed: ${response.status}`);
  }

  return response.json();
}

export async function summarizeText(text) {
  const response = await fetch(`${API_URL}/content/summarize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Summarization failed: ${response.status}`);
  }

  return response.json();
}

export async function createShare(transcript, summary, corrected = null, language = null) {
  const response = await fetch(`${API_URL}/share/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ transcript, summary, corrected, language }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Failed to create share: ${response.status}`);
  }

  return response.json();
}

export async function getShare(id) {
  const response = await fetch(`${API_URL}/share/${id}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Share not found: ${response.status}`);
  }

  return response.json();
}

export async function getLanguages() {
  const response = await fetch(`${API_URL}/languages/`);

  if (!response.ok) {
    // Return default languages if API fails
    return {
      languages: [
        { code: 'en', name: 'English', nativeName: 'English' },
        { code: 'pt', name: 'Portuguese', nativeName: 'Portugues' },
        { code: 'es', name: 'Spanish', nativeName: 'Espanol' },
      ]
    };
  }

  return response.json();
}

export async function trackAnalyticsEvent(shareId, eventType) {
  try {
    await fetch(`${API_URL}/analytics/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ shareId, eventType }),
    });
  } catch (error) {
    // Analytics tracking is non-critical, don't throw
    console.error('Failed to track event:', error);
  }
}

// PDF to Audio API functions
export async function convertPdfToAudio(file, voice = 'alloy', speed = 1.0) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('voice', voice);
  formData.append('speed', speed.toString());

  const response = await fetch(`${API_URL}/pdf/convert`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Conversion failed: ${response.status}`);
  }

  return response.json();
}

export async function getPdfConversionStatus(jobId, includeAudio = false) {
  const url = includeAudio
    ? `${API_URL}/pdf/status/${jobId}?includeAudio=true`
    : `${API_URL}/pdf/status/${jobId}`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Status check failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Poll for PDF conversion completion
 * @param {string} jobId - Job ID to poll
 * @param {function} onProgress - Callback for status updates
 * @param {number} maxWait - Max wait time in ms (default 5 minutes)
 * @returns {Promise<object>} - Final result with audio
 */
export async function pollPdfConversion(jobId, onProgress = () => {}, maxWait = 300000) {
  const startTime = Date.now();
  const pollInterval = 2000; // 2 seconds

  while (Date.now() - startTime < maxWait) {
    const status = await getPdfConversionStatus(jobId);
    onProgress(status);

    if (status.status === 'completed') {
      // Fetch with audio included
      const result = await getPdfConversionStatus(jobId, true);
      return result;
    }

    if (status.status === 'failed') {
      throw new Error(status.errorMessage || 'Conversion failed');
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error('Conversion timed out. Please try again.');
}

export async function getTtsVoices(language = 'en') {
  const response = await fetch(`${API_URL}/pdf/voices?lang=${language}`);

  if (!response.ok) {
    // Return default voices if API fails
    return {
      voices: [
        { id: 'alloy', name: 'Alloy', description: 'Neutral and balanced' },
        { id: 'echo', name: 'Echo', description: 'Warm male voice' },
        { id: 'fable', name: 'Fable', description: 'Expressive storyteller' },
        { id: 'onyx', name: 'Onyx', description: 'Deep and authoritative' },
        { id: 'nova', name: 'Nova', description: 'Friendly female voice' },
        { id: 'shimmer', name: 'Shimmer', description: 'Soft and gentle' },
      ],
    };
  }

  return response.json();
}

export function getPdfDownloadUrl(jobId) {
  return `${API_URL}/pdf/download/${jobId}`;
}

export async function previewVoice(voiceId, language = 'en') {
  const response = await fetch(`${API_URL}/pdf/preview-voice/${voiceId}?lang=${language}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Preview failed: ${response.status}`);
  }

  return response.json();
}

// Contact form
export async function submitContactForm(data) {
  const response = await fetch(`${API_URL}/contact/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Failed to submit: ${response.status}`);
  }

  return response.json();
}
