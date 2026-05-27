// State
let conversationHistory = [];
let isProcessing = false;
let lastAgentMessage = "";
let currentStepIndex = 0;
let silenceTimer = null;

function getCurrentStepName() {
  const step = EXPERIMENT.steps[currentStepIndex];
  return step ? step.name : "Esperimento completato";
}

function resetSilenceTimer() {
  clearTimeout(silenceTimer);
  silenceTimer = setTimeout(function() {
    if (!isProcessing) {
      processInput("Lo studente non risponde. Chiedi se è ancora lì e se ha bisogno di aiuto.");
    }
  }, 60000);
}

async function processInput(userText) {
  if (isProcessing) return;
  isProcessing = true;
  resetSilenceTimer();

  voice.stopSpeaking();
  ui.setVoiceState('processing');

  conversationHistory.push({
    role: 'user',
    content: userText
  });

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userText,
        conversationHistory: conversationHistory.slice(-10),
        currentStep: getCurrentStepName()
      })
    });

    if (!response.ok) {
      throw new Error('Chat failed');
    }

    const data = await response.json();
    const agentText = data.response;

    conversationHistory.push({
      role: 'assistant',
      content: agentText
    });

    lastAgentMessage = agentText;

    voice.speak(agentText, function() {
      isProcessing = false;
      ui.setVoiceState('idle');
    });

  } catch (error) {
    console.error('Agent error:', error);
    isProcessing = false;
    voice.speak("Errore di connessione. Riprova.", function() {
      ui.setVoiceState('idle');
    });
  }
}

function confirmStep() {
  if (isProcessing) return;

  if (currentStepIndex < 4) {
    storage.markStepComplete(currentStepIndex);
    currentStepIndex++;
    storage.setCurrentStep(currentStepIndex);
    ui.updateProgressBar(currentStepIndex);

    processInput(
      "Lo studente ha confermato manualmente di aver completato il passaggio. " +
      "Confermalo e guidalo nel passaggio: " +
      EXPERIMENT.steps[currentStepIndex].name
    );
  } else {
    processInput(
      "Lo studente ha completato tutte le fasi. " +
      "Congratulati con lui e digli di compilare la scheda dati e fare l'analisi."
    );
  }
}

function repeatLastMessage() {
  if (!lastAgentMessage || isProcessing) return;
  isProcessing = true;
  voice.speak(lastAgentMessage, function() {
    isProcessing = false;
    ui.setVoiceState('idle');
  });
}

function generateAnalysis(obs) {
  let outcome = "";
  let errors = [];

  const hasGrowth = obs.growthLevel && obs.growthLevel !== "assente";
  const correctTemp = parseFloat(obs.incubationTemp) === 30;
  const correctTime = parseFloat(obs.incubationDays) >= 2;

  if (!obs.growthLevel && !obs.incubationTemp) {
    return {
      outcome: "Dati insufficienti. Compila prima la scheda dati.",
      errors: [],
      incomplete: true
    };
  }

  if (hasGrowth && correctTemp && correctTime) {
    outcome = "L'esperimento è riuscito. La crescita dei lieviti conferma che il terreno era adatto, la semina corretta e le condizioni di incubazione favorevoli.";
  } else {
    outcome = "Il risultato non è pienamente coerente con quanto atteso.";
    if (!hasGrowth) {
      errors.push("Crescita assente o scarsa");
    }
    if (!correctTemp && obs.incubationTemp) {
      errors.push("Temperatura non corretta (attesa 30°C)");
    }
    if (!correctTime && obs.incubationDays) {
      errors.push("Tempo di incubazione insufficiente");
    }
  }

  if (obs.growthDistribution === "non uniforme") {
    errors.push("Distribuzione non uniforme: possibile semina poco omogenea o condensa");
  }
  if (obs.contamination === "sì") {
    errors.push("Contaminazione rilevata" + (obs.contaminationDesc ? ": " + obs.contaminationDesc : ""));
  }
  if (obs.agarUniform === "no") {
    errors.push("Agar non uniforme");
  }
  if (obs.newStickEachPlate === "no") {
    errors.push("Bacchetta non cambiata tra piastre");
  }
  if (obs.platesInverted === "no") {
    errors.push("Piastre non capovolte");
  }

  return { outcome: outcome, errors: errors, incomplete: false };
}

function requestAnalysis() {
  ui.toggleMoreMenu();
  const session = storage.load();
  const analysis = generateAnalysis(session.observations);
  ui.showAnalysis(analysis);
  voice.speak("Ho generato l'analisi. Puoi leggerla.", function() {
    ui.setVoiceState('idle');
  });
}

function generateReportText(obs, analysis) {
  const d = function(val) {
    return val && val.toString().trim() ? val : "[dato non raccolto]";
  };

  let text = "RELAZIONE DI LABORATORIO\n";
  text += "═".repeat(48) + "\n\n";
  text += "Titolo: " + EXPERIMENT.title + "\n";
  text += "Componenti del gruppo: " + EXPERIMENT.student + "\n";
  text += "Classe: " + EXPERIMENT.className + "\n";
  text += "Data: " + EXPERIMENT.date + "\n\n";
  text += "OBIETTIVO\n" + EXPERIMENT.objective + "\n\n";
  text += "BREVI CENNI TEORICI\n" + EXPERIMENT.theory + "\n\n";
  text += "MATERIALI E STRUMENTI UTILIZZATI\n";
  for (let i = 0; i < EXPERIMENT.materials.length; i++) {
    text += "- " + EXPERIMENT.materials[i] + "\n";
  }
  text += "\nPROCEDIMENTO\n\n";
  text += "1. Preparazione del terreno\n";
  text += "L'agar è stato scaldato nel microonde e versato nelle piastre di Petri.\n";
  text += "Piastre preparate: " + d(obs.platesPrepared) + "\n\n";
  text += "2. Preparazione del lievito\n";
  text += "Diluizione seriale con " + d(obs.dilutionTubes) + " provette.\n\n";
  text += "3. Semina\n";
  text += "Piastre seminate: " + d(obs.seededPlates) + "\n";
  text += "Bacchetta nuova per piastra: " + d(obs.newStickEachPlate) + "\n\n";
  text += "4. Incubazione\n";
  text += "Temperatura: " + d(obs.incubationTemp) + "°C\n";
  text += "Durata: " + d(obs.incubationDays) + " giorni\n";
  text += "Piastre capovolte: " + d(obs.platesInverted) + "\n\n";
  text += "5. Osservazione finale\n";
  text += d(obs.finalObs) + "\n\n";
  text += "RISULTATI\n";
  text += "Crescita lieviti: " + d(obs.growthLevel) + "\n";
  text += "Distribuzione: " + d(obs.growthDistribution) + "\n";
  text += "Condensa: " + d(obs.condensation) + "\n";
  text += "Contaminazione: " + d(obs.contamination) + "\n\n";
  text += analysis.outcome + "\n\n";
  text += "POSSIBILI FONTI DI ERRORE\n";
  if (analysis.errors && analysis.errors.length > 0) {
    for (let i = 0; i < analysis.errors.length; i++) {
      text += "- " + analysis.errors[i] + "\n";
    }
  } else {
    for (let i = 0; i < EXPERIMENT.possibleErrors.length; i++) {
      text += "- " + EXPERIMENT.possibleErrors[i] + "\n";
    }
  }
  text += "\nCONCLUSIONI\n";
  text += analysis.outcome;
  if (obs.finalNotes) {
    text += "\n\nNote: " + obs.finalNotes;
  }
  text += "\n\n" + "═".repeat(48);

  return text;
}

function requestReport() {
  ui.toggleMoreMenu();
  const session = storage.load();
  const analysis = generateAnalysis(session.observations);
  const reportText = generateReportText(session.observations, analysis);
  ui.showReport(reportText);
}

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
  const session = storage.load();
  currentStepIndex = session.currentStep;

  setTimeout(function() {
    processInput(
      "Dai il benvenuto allo studente, presentati brevemente come assistente di laboratorio e inizia subito a guidarlo nel primo passaggio della preparazione del terreno."
    );
  }, 1000);
});

window.agent = {
  processInput,
  confirmStep,
  repeatLastMessage,
  requestAnalysis,
  requestReport
};
