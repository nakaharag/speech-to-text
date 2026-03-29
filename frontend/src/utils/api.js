const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export async function transcribeAudio(audioBlob) {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');

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

export async function createShare(transcript, summary) {
  const response = await fetch(`${API_URL}/share/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ transcript, summary }),
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
