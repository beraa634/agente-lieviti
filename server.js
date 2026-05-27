require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const FormData = require('form-data');

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.static('public'));

const SYSTEM_PROMPT = `Sei un assistente vocale educativo italiano specializzato in microbiologia di laboratorio. Stai guidando uno studente delle scuole superiori durante un esperimento chiamato "Coltura di lieviti su terreno agarizzato".

FASI DELL'ESPERIMENTO:
1. Preparazione del terreno agarizzato nelle piastre
2. Preparazione del lievito con diluizione seriale usando cinque provette partendo da un grammo di lievito
3. Semina sulle piastre di Petri con movimento a zig-zag, bacchetta sterile nuova per ogni piastra
4. Incubazione a trenta gradi Celsius per due giorni, piastre capovolte per evitare la condensa
5. Osservazione finale della crescita dei lieviti

MATERIALI USATI:
- Agar come terreno di coltura
- Microonde per liquefare l'agar
- Piastre di Petri
- Cappa sterile
- Lievito, un grammo di partenza
- Cinque provette per diluizione seriale
- Bacchette di plastica sterili
- Incubatore a trenta gradi Celsius
- Contenitori per smaltimento bacchette

CENNI TEORICI:
- I lieviti sono microrganismi unicellulari
- L'agar solidifica raffreddandosi formando una superficie adatta alla semina
- La diluizione seriale riduce la concentrazione per ottenere colonie separabili
- Le piastre si capovolgono per evitare che la condensa cada sulla coltura
- Le colonie cresciute appaiono come macchioline tondeggianti di colore bianco crema o beige

POSSIBILI ERRORI:
- Contaminazione del campione o del terreno
- Agar non distribuito uniformemente
- Diluizione del lievito non corretta
- Semina poco omogenea
- Mancato cambio bacchetta tra le piastre
- Temperatura o tempo di incubazione errati
- Formazione eccessiva di condensa

REGOLE DI COMPORTAMENTO ASSOLUTE:
- Parla SEMPRE e SOLO in italiano
- Rispondi in modo naturale e conversazionale
- Massimo tre frasi per risposta perché vengono lette ad alta voce
- Non usare mai elenchi puntati o trattini nelle risposte perché suonano male ad alta voce
- Non usare simboli come asterischi o hashtag
- Scrivi sempre i numeri in lettere
- Sii paziente, incoraggiante e chiaro
- Puoi rispondere a qualsiasi domanda sull'esperimento in modo intelligente
- NON avanzare mai automaticamente al passaggio successivo a meno che lo studente non lo chieda esplicitamente
- Se lo studente ha dubbi tecnici o di sicurezza digli di chiamare il docente o il tecnico
- Non inventare procedure diverse da quelle fornite
- La fase corrente è indicata nel messaggio`;

app.post('/api/chat', async (req, res) => {
  const { message, conversationHistory, currentStep } = req.body;

  if (!process.env.OPENAI_API_KEY) {
    return res.json({
      response: "Chiave API non configurata."
    });
  }

  const systemWithStep = SYSTEM_PROMPT +
    '\n\nFASE CORRENTE DELLO STUDENTE: ' +
    currentStep;

  try {
    const response = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: systemWithStep
            },
            ...(conversationHistory || []).slice(-10),
            { role: 'user', content: message }
          ],
          temperature: 0.7,
          max_tokens: 200
        })
      }
    );

    if (!response.ok) {
      const err = await response.json();
      console.error('OpenAI chat error:', err);
      return res.json({
        response: "Errore nella risposta. Riprova."
      });
    }

    const data = await response.json();
    const responseText = data.choices[0].message.content;

    res.json({ response: responseText });

  } catch (error) {
    console.error('Chat error:', error);
    res.json({
      response: "Errore di connessione. Riprova."
    });
  }
});

app.post('/api/speak', async (req, res) => {
  const { text } = req.body;

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: 'API key not configured'
    });
  }

  try {
    const response = await fetch(
      'https://api.openai.com/v1/audio/speech',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: 'nova',
          speed: 1.0
        })
      }
    );

    if (!response.ok) {
      const err = await response.json();
      console.error('TTS error:', err);
      return res.status(500).json({
        error: 'TTS failed'
      });
    }

    const audioBuffer = await response.buffer();
    res.set('Content-Type', 'audio/mpeg');
    res.send(audioBuffer);

  } catch (error) {
    console.error('TTS error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/transcribe', async (req, res) => {
  const { audio } = req.body;

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: 'API key not configured'
    });
  }

  try {
    const base64Data = audio.replace(/^data:audio\/[^;]+;base64,/, '');
    const audioBuffer = Buffer.from(base64Data, 'base64');

    const formData = new FormData();
    formData.append('file', audioBuffer, {
      filename: 'audio.webm',
      contentType: 'audio/webm'
    });
    formData.append('model', 'whisper-1');
    formData.append('language', 'it');

    const response = await fetch(
      'https://api.openai.com/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY,
          ...formData.getHeaders()
        },
        body: formData
      }
    );

    if (!response.ok) {
      const err = await response.json();
      console.error('Whisper error:', err);
      return res.status(500).json({
        error: 'Transcription failed'
      });
    }

    const data = await response.json();
    res.json({ transcript: data.text });

  } catch (error) {
    console.error('Transcribe error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
