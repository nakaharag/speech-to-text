import React, { useState } from 'react';
import './AppStyles.css';

function App() {
  const [transcript, setTranscript] = useState('');
  const [report, setReport] = useState('');
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [stream, setStream] = useState(null);
  const [recording, setRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const handleStartRecording = () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Media devices API not supported in this browser.');
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(newStream => {
        const newMediaRecorder = new MediaRecorder(newStream);
        const audioChunks = [];

        newMediaRecorder.ondataavailable = event => {
          audioChunks.push(event.data);
        };

        newMediaRecorder.onstop = async () => {
          setIsTranscribing(true);
          try {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            const response = await fetch(
              'http://localhost:3000/speech/transcribe',
              {
                method: 'POST',
                body: formData,
              }
            );

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            setTranscript(data.transcription);
            generateReport(data.transcription);
          } catch (error) {
            console.error('Failed to fetch:', error);
            alert(`Error: ${error.message}`);
          } finally {
            setIsTranscribing(false);
            setRecording(false);
          }
        };

        newMediaRecorder.start();
        setMediaRecorder(newMediaRecorder);
        setStream(newStream);
        setRecording(true);
      })
      .catch(error => {
        console.error('Error accessing microphone:', error);
        alert('Error accessing microphone: ' + error.message);
      });
  };

  const handleStopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setRecording(false);
  };

  const generateReport = async text => {
    const response = await fetch('http://localhost:3000/report/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const data = await response.json();
    setReport(data.report);
  };

  const handlePlayReport = async () => {
    const response = await fetch('http://localhost:3000/speech/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: report }),
    });
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();
  };

  const handleClear = () => {
    setTranscript('');
    setReport('');
  };

  return (
    <div>
      <h1 className="title">Áudio para Texto</h1>
      <div className="button-container">
        {!recording && (
          <button onClick={handleStartRecording} className="start-button">
            Começar a Falar
          </button>
        )}
        {recording && (
          <button onClick={handleStopRecording} className="stop-button">
            Parar
          </button>
        )}
      </div>

      {/* Loader Animation */}
      {isTranscribing && (
        <div className="loader-container">
          <div className="loader"></div>
          <p>Transcrevendo áudio...</p>
        </div>
      )}

      <div className="content-container">
        <h2>Transcrição</h2>
        <div className="box transcription-box">
          <p>{transcript}</p>
        </div>
        <h2>Editar</h2>
        <div className="box edit-box">
          <textarea
            value={report}
            onChange={e => setReport(e.target.value)}
            className="edit-textarea"
          />
        </div>
      </div>

      <div className="button-container">
        {report && (
          <>
            <button className="stylish-button" onClick={handlePlayReport}>
              Tocar Relatório
            </button>
            <button className="clear-button" onClick={handleClear}>
              Limpar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default App;