// State variables
let currentAudio = null;
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let selectedFallbackVoice = null;

// Load fallback browser voice
function loadFallbackVoice() {
  const voices = speechSynthesis.getVoices();
  selectedFallbackVoice =
    voices.find(function(v) {
      return v.name.toLowerCase().includes('google') && v.lang.startsWith('it');
    }) ||
    voices.find(function(v) {
      return v.lang.startsWith('it') && !v.localService;
    }) ||
    voices.find(function(v) {
      return v.lang.startsWith('it');
    }) ||
    voices[0];
}

speechSynthesis.onvoiceschanged = loadFallbackVoice;
loadFallbackVoice();

// TTS with OpenAI
async function speak(text, onEnd) {
  stopSpeaking();
  ui.setVoiceState('speaking');

  try {
    const response = await fetch('/api/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text })
    });

    if (!response.ok) {
      throw new Error('TTS failed');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    currentAudio = new Audio(url);

    currentAudio.onended = function() {
      URL.revokeObjectURL(url);
      currentAudio = null;
      if (onEnd) {
        onEnd();
      }
    };

    currentAudio.onerror = function() {
      URL.revokeObjectURL(url);
      currentAudio = null;
      fallbackSpeak(text, onEnd);
    };

    await currentAudio.play();

  } catch (error) {
    console.error('TTS error:', error);
    fallbackSpeak(text, onEnd);
  }
}

function fallbackSpeak(text, onEnd) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'it-IT';
  u.rate = 0.85;
  u.pitch = 1.0;
  u.volume = 1.0;
  if (selectedFallbackVoice) {
    u.voice = selectedFallbackVoice;
  }
  u.onend = function() {
    if (onEnd) {
      onEnd();
    }
  };
  speechSynthesis.speak(u);
}

function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  speechSynthesis.cancel();
}

function isSpeaking() {
  return currentAudio !== null && !currentAudio.paused;
}

// STT with MediaRecorder + Whisper
async function startListening() {
  if (isRecording) return;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    audioChunks = [];

    const mimeType = MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : 'audio/mp4';

    mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });

    isRecording = true;
    ui.setVoiceState('recording');

    mediaRecorder.ondataavailable = function(e) {
      if (e.data.size > 0) {
        audioChunks.push(e.data);
      }
    };

    mediaRecorder.onstop = async function() {
      stream.getTracks().forEach(function(t) {
        t.stop();
      });
      isRecording = false;

      const audioBlob = new Blob(audioChunks, { type: mimeType });

      if (audioBlob.size < 500) {
        ui.setVoiceState('idle');
        return;
      }

      await transcribeAndProcess(audioBlob, mimeType);
    };

    mediaRecorder.start();

  } catch (error) {
    console.error('Mic error:', error);
    isRecording = false;
    ui.setVoiceState('idle');
    ui.showNotification(
      'Permesso microfono negato. Controlla le impostazioni del browser.',
      'error'
    );
  }
}

function stopListening() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
  }
}

async function transcribeAndProcess(blob, mimeType) {
  ui.setVoiceState('processing');

  try {
    const reader = new FileReader();

    reader.onloadend = async function() {
      const base64 = reader.result;

      try {
        const response = await fetch('/api/transcribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ audio: base64 })
        });

        if (!response.ok) {
          throw new Error('Transcription failed');
        }

        const data = await response.json();
        const transcript = data.transcript;

        if (transcript && transcript.trim().length > 2) {
          agent.processInput(transcript.trim());
        } else {
          ui.setVoiceState('idle');
        }

      } catch (error) {
        console.error('Transcribe error:', error);
        ui.setVoiceState('idle');
        ui.showNotification('Errore trascrizione. Riprova.', 'error');
      }
    };

    reader.readAsDataURL(blob);

  } catch (error) {
    console.error('Transcribe error:', error);
    ui.setVoiceState('idle');
    ui.showNotification('Errore trascrizione. Riprova.', 'error');
  }
}

// Central button logic
function handleCentralButton() {
  if (isSpeaking()) {
    // Interrupt AI and start listening
    stopSpeaking();
    ui.setVoiceState('idle');
    setTimeout(function() {
      startListening();
    }, 300);
  } else if (isRecording) {
    // Stop recording and send to Whisper
    stopListening();
  } else {
    // Start listening
    startListening();
  }
}

function toggleListening() {
  handleCentralButton();
}

function isMicActive() {
  return isRecording;
}

window.voice = {
  speak,
  stopSpeaking,
  isSpeaking,
  startListening,
  stopListening,
  toggleListening,
  handleCentralButton,
  isMicActive
};
