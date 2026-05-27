// Cache all elements
let voiceCircle, micIcon, ring1, ring2, ring3, stateLabel;
let dataPanel, moreMenu;
let analysisOverlay, analysisContent;
let reportOverlay, reportContent;
let dataForm, closePanelBtn, saveDataBtn;
let closeAnalysisBtn, closeReportBtn;
let copyReportBtn, downloadReportBtn;
let analysisOption, reportOption, resetOption, closeMenuOption;
let repeatBtn, confirmBtn, dataBtn, moreBtn;

document.addEventListener('DOMContentLoaded', function() {
  // Cache elements
  voiceCircle = document.getElementById('voiceCircle');
  micIcon = document.getElementById('micIcon');
  ring1 = document.getElementById('ring1');
  ring2 = document.getElementById('ring2');
  ring3 = document.getElementById('ring3');
  stateLabel = document.getElementById('stateLabel');
  dataPanel = document.getElementById('dataPanel');
  moreMenu = document.getElementById('moreMenu');
  analysisOverlay = document.getElementById('analysisOverlay');
  analysisContent = document.getElementById('analysisContent');
  reportOverlay = document.getElementById('reportOverlay');
  reportContent = document.getElementById('reportContent');
  dataForm = document.getElementById('dataForm');
  closePanelBtn = document.getElementById('closePanelBtn');
  saveDataBtn = document.getElementById('saveDataBtn');
  closeAnalysisBtn = document.getElementById('closeAnalysisBtn');
  closeReportBtn = document.getElementById('closeReportBtn');
  copyReportBtn = document.getElementById('copyReportBtn');
  downloadReportBtn = document.getElementById('downloadReportBtn');
  analysisOption = document.getElementById('analysisOption');
  reportOption = document.getElementById('reportOption');
  resetOption = document.getElementById('resetOption');
  closeMenuOption = document.getElementById('closeMenuOption');
  repeatBtn = document.getElementById('repeatBtn');
  confirmBtn = document.getElementById('confirmBtn');
  dataBtn = document.getElementById('dataBtn');
  moreBtn = document.getElementById('moreBtn');

  // Bind events
  voiceCircle.onclick = voice.handleCentralButton;

  closePanelBtn.onclick = hideDataPanel;

  saveDataBtn.onclick = collectAndSaveForm;

  closeAnalysisBtn.onclick = hideAnalysis;

  closeReportBtn.onclick = hideReport;

  moreBtn.onclick = toggleMoreMenu;

  analysisOption.onclick = agent.requestAnalysis;

  reportOption.onclick = agent.requestReport;

  resetOption.onclick = storage.reset;

  closeMenuOption.onclick = toggleMoreMenu;

  copyReportBtn.onclick = function() {
    navigator.clipboard.writeText(reportContent.textContent)
      .then(function() {
        showNotification('Testo copiato!', 'success');
      });
  };

  downloadReportBtn.onclick = function() {
    const blob = new Blob([reportContent.textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'relazione-lieviti.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  repeatBtn.onclick = agent.repeatLastMessage;

  confirmBtn.onclick = agent.confirmStep;

  dataBtn.onclick = showDataPanel;

  // Initialize
  const session = storage.load();
  updateProgressBar(session.currentStep);
  setVoiceState('idle');
});

function setVoiceState(state) {
  // Remove all state classes
  voiceCircle.classList.remove('state-idle', 'state-recording', 'state-processing', 'state-speaking');

  // Add current state class
  voiceCircle.classList.add('state-' + state);

  if (state === 'idle') {
    voiceCircle.style.background = '#2d3748';
    voiceCircle.style.animation = 'none';
    voiceCircle.style.boxShadow = 'none';
    ring1.style.animation = 'none';
    ring1.style.opacity = '0';
    ring2.style.animation = 'none';
    ring2.style.opacity = '0';
    ring3.style.animation = 'none';
    ring3.style.opacity = '0';
    micIcon.style.opacity = '1';
    stateLabel.textContent = '';
  } else if (state === 'recording') {
    voiceCircle.style.background = '#e53e3e';
    voiceCircle.style.animation = 'recordPulse 1.5s infinite';
    ring1.style.animation = 'none';
    ring1.style.opacity = '0';
    ring2.style.animation = 'none';
    ring2.style.opacity = '0';
    ring3.style.animation = 'none';
    ring3.style.opacity = '0';
    micIcon.style.opacity = '1';
    stateLabel.textContent = 'Registrazione in corso...';
  } else if (state === 'processing') {
    voiceCircle.style.background = '#dd6b20';
    voiceCircle.style.animation = 'none';
    ring1.style.animation = 'none';
    ring1.style.opacity = '0';
    ring2.style.animation = 'none';
    ring2.style.opacity = '0';
    ring3.style.animation = 'none';
    ring3.style.opacity = '0';
    micIcon.style.opacity = '0';
    stateLabel.textContent = 'Elaboro...';
  } else if (state === 'speaking') {
    voiceCircle.style.background = '#3182ce';
    voiceCircle.style.animation = 'none';
    voiceCircle.style.boxShadow = 'none';
    ring1.style.cssText = 'animation: ringExpand 2s infinite 0s; opacity: 1; background: rgba(49,130,206,0.35);';
    ring2.style.cssText = 'animation: ringExpand 2s infinite 0.6s; opacity: 1; background: rgba(49,130,206,0.35);';
    ring3.style.cssText = 'animation: ringExpand 2s infinite 1.2s; opacity: 1; background: rgba(49,130,206,0.35);';
    micIcon.style.opacity = '0';
    stateLabel.textContent = 'Sto parlando...';
  }
}

function updateProgressBar(currentStep) {
  const dots = [
    document.getElementById('dot0'),
    document.getElementById('dot1'),
    document.getElementById('dot2'),
    document.getElementById('dot3'),
    document.getElementById('dot4')
  ];

  for (let i = 0; i < dots.length; i++) {
    const dot = dots[i];
    dot.classList.remove('dot-complete', 'dot-current', 'dot-future');

    if (i < currentStep) {
      dot.classList.add('dot-complete');
      dot.style.background = '#38a169';
      dot.style.border = 'none';
      dot.style.animation = 'none';
    } else if (i === currentStep) {
      dot.classList.add('dot-current');
      dot.style.background = '#3182ce';
      dot.style.border = 'none';
      dot.style.animation = 'dotPulse 1.5s infinite';
    } else {
      dot.classList.add('dot-future');
      dot.style.background = 'transparent';
      dot.style.border = '2px solid #4a5568';
      dot.style.animation = 'none';
    }
  }
}

function updateMicButton(isActive) {
  // Not needed since there is no mic button in bottom bar
}

function showDataPanel() {
  // Populate form fields from storage
  const session = storage.load();
  const obs = session.observations;

  document.getElementById('platesPrepared').value = obs.platesPrepared || '';
  document.getElementById('agarCondition').value = obs.agarCondition || '';
  document.getElementById('agarUniform').value = obs.agarUniform || '';
  document.getElementById('irregularities').value = obs.irregularities || '';
  document.getElementById('dilutionTubes').value = obs.dilutionTubes || '';
  document.getElementById('sampleCorrect').value = obs.sampleCorrect || '';
  document.getElementById('sampleNotes').value = obs.sampleNotes || '';
  document.getElementById('seededPlates').value = obs.seededPlates || '';
  document.getElementById('newStickEachPlate').value = obs.newStickEachPlate || '';
  document.getElementById('platesInverted').value = obs.platesInverted || '';
  document.getElementById('incubationTemp').value = obs.incubationTemp || '';
  document.getElementById('incubationDays').value = obs.incubationDays || '';
  document.getElementById('immediateObs').value = obs.immediateObs || '';
  document.getElementById('finalObs').value = obs.finalObs || '';
  document.getElementById('growthLevel').value = obs.growthLevel || '';
  document.getElementById('growthDistribution').value = obs.growthDistribution || '';
  document.getElementById('condensation').value = obs.condensation || '';
  document.getElementById('contamination').value = obs.contamination || '';
  document.getElementById('contaminationDesc').value = obs.contaminationDesc || '';
  document.getElementById('finalNotes').value = obs.finalNotes || '';

  dataPanel.style.transform = 'translateY(0)';
}

function hideDataPanel() {
  dataPanel.style.transform = 'translateY(100%)';
}

function collectAndSaveForm() {
  const observations = {
    platesPrepared: document.getElementById('platesPrepared').value,
    agarCondition: document.getElementById('agarCondition').value,
    agarUniform: document.getElementById('agarUniform').value,
    irregularities: document.getElementById('irregularities').value,
    dilutionTubes: document.getElementById('dilutionTubes').value,
    sampleCorrect: document.getElementById('sampleCorrect').value,
    sampleNotes: document.getElementById('sampleNotes').value,
    seededPlates: document.getElementById('seededPlates').value,
    newStickEachPlate: document.getElementById('newStickEachPlate').value,
    platesInverted: document.getElementById('platesInverted').value,
    incubationTemp: document.getElementById('incubationTemp').value,
    incubationDays: document.getElementById('incubationDays').value,
    immediateObs: document.getElementById('immediateObs').value,
    finalObs: document.getElementById('finalObs').value,
    growthLevel: document.getElementById('growthLevel').value,
    growthDistribution: document.getElementById('growthDistribution').value,
    condensation: document.getElementById('condensation').value,
    contamination: document.getElementById('contamination').value,
    contaminationDesc: document.getElementById('contaminationDesc').value,
    finalNotes: document.getElementById('finalNotes').value
  };

  storage.saveObservations(observations);
  hideDataPanel();
  showNotification('Dati salvati.', 'success');

  setTimeout(function() {
    agent.processInput("Ho appena salvato i dati osservativi nella scheda.");
  }, 500);
}

function toggleMoreMenu() {
  if (moreMenu.style.display === 'block') {
    moreMenu.style.display = 'none';
  } else {
    moreMenu.style.display = 'block';
  }
}

function showAnalysis(analysisObject) {
  let html = '<h2 style="color: #e2e8f0; margin-bottom: 12px;">Esito</h2>';
  html += '<p style="color: #e2e8f0; margin-bottom: 20px;">' + analysisObject.outcome + '</p>';

  if (analysisObject.errors && analysisObject.errors.length > 0) {
    html += '<h3 style="color: #e2e8f0; margin-bottom: 12px;">Possibili fonti di errore</h3>';
    html += '<ul style="color: #e2e8f0; margin-left: 20px;">';
    for (let i = 0; i < analysisObject.errors.length; i++) {
      html += '<li style="margin-bottom: 8px;">' + analysisObject.errors[i] + '</li>';
    }
    html += '</ul>';
  }

  analysisContent.innerHTML = html;
  analysisOverlay.style.display = 'block';
}

function hideAnalysis() {
  analysisOverlay.style.display = 'none';
}

function showReport(reportText) {
  reportContent.textContent = reportText;
  reportOverlay.style.display = 'block';
}

function hideReport() {
  reportOverlay.style.display = 'none';
}

function showNotification(message, type) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;

  if (type === 'success') {
    notification.style.borderLeft = '3px solid #38a169';
  } else if (type === 'error') {
    notification.style.borderLeft = '3px solid #e53e3e';
  } else {
    notification.style.borderLeft = '3px solid #3182ce';
  }

  document.body.appendChild(notification);

  setTimeout(function() {
    notification.remove();
  }, 2500);
}

window.ui = {
  setVoiceState,
  updateProgressBar,
  updateMicButton,
  showDataPanel,
  hideDataPanel,
  collectAndSaveForm,
  toggleMoreMenu,
  showAnalysis,
  hideAnalysis,
  showReport,
  hideReport,
  showNotification
};
