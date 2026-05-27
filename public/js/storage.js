const STORAGE_KEY = "agente-lieviti-v3";

const DEFAULT_SESSION = {
  currentStep: 0,
  completedSteps: [false, false, false, false, false],
  observations: {
    platesPrepared: "",
    agarCondition: "",
    agarUniform: "",
    irregularities: "",
    dilutionTubes: "",
    sampleCorrect: "",
    sampleNotes: "",
    seededPlates: "",
    newStickEachPlate: "",
    platesInverted: "",
    incubationTemp: "",
    incubationDays: "",
    immediateObs: "",
    finalObs: "",
    growthLevel: "",
    growthDistribution: "",
    condensation: "",
    contamination: "",
    contaminationDesc: "",
    finalNotes: ""
  }
};

function load() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return JSON.parse(JSON.stringify(DEFAULT_SESSION));
    return JSON.parse(saved);
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_SESSION));
  }
}

function save(session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function reset() {
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
}

function markStepComplete(n) {
  const s = load();
  s.completedSteps[n] = true;
  save(s);
}

function setCurrentStep(n) {
  const s = load();
  s.currentStep = n;
  save(s);
}

function saveObservations(formData) {
  const s = load();
  s.observations = { ...s.observations, ...formData };
  save(s);
}

function isStepComplete(n) {
  return load().completedSteps[n];
}

function allStepsComplete() {
  return load().completedSteps.every(Boolean);
}

window.storage = {
  load,
  save,
  reset,
  markStepComplete,
  setCurrentStep,
  saveObservations,
  isStepComplete,
  allStepsComplete
};
