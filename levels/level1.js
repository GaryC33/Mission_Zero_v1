// levels/level1.js
export const level1Data = {
  levelId: 1,
  gridWidth: 6,
  gridHeight: 6,
  totalFragmentsRequired: 2,
  labPosition: { x: 5, y: 5 },
  initialRoverConfig: { x: 0, y: 0, angle: 0, color: '#63B3ED', trail: [] },
  fragmentConfig: { /* ... */ },
  gameplayMode: 'directControl',
  missionTitle: 'Niveau 1: Prise en Main',
  missionObjective: "Mode Découverte: Pilotez Ermès directement pour collecter 2 fragments jaunes et ramenez-les au laboratoire.",
  elyaAnalysisText: "Excellent travail pour cette première mission, Isaac ! [...]", // Texte pour la fin
  dialoguesInitiaux: [
    { type: 'elya', message: "Isaac, pour cette mission, vous devez récupérer 2 fragments énergétiques. Le terrain est relativement stable." },
    { type: 'isaac', message: "Bien reçu, Elya. Ermes est en mode de pilotage direct. Ses commandes devraient être très réactives sur ce type de sol." }
  ],
  completionMessages: { /* ... */ }
};