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
