// levels/level1.js
export const level1Data = {
  levelId: 1,
  gridWidth: 6,
  gridHeight: 6,
  totalFragmentsRequired: 2, // Renamed for clarity
  labPosition: { x: 5, y: 5 }, // Assuming 0-indexed grid
  initialRoverConfig: { x: 0, y: 0, angle: 0, color: '#63B3ED', trail: [] },
  fragmentConfig: {
    type: 'random', // 'random' or 'fixed'
    count: 2,
    color: '#F6E05E', // Yellowish
    // Ensure fragments don't spawn on rover start or lab if random
    avoid: [{ x: 0, y: 0 }, { x: 5, y: 5 }]
    // For fixed: positions: [{x: 1, y: 1}, {x: 3, y: 4}]
  },
  gameplayMode: 'directControl',
  missionTitle: 'Niveau 1: Prise en Main',
  missionObjective: "Mode Découverte: Pilotez Ermès directement pour collecter 2 fragments jaunes et ramenez-les au laboratoire (case verte). Utilisez les flèches du Panneau de Commande.",
  elyaPrompt: "Vous êtes Elya, une IA s'adressant à Isaac, l'opérateur du rover Ermès. Le rover vient de terminer le Niveau 1 (contrôle direct, 2 fragments collectés sur une grille 6x6 et retour au labo). Les fragments émettent une énergie. Commentez la réussite de la mission, l'importance des fragments, et encouragez Isaac pour la suite, qui introduira la programmation de séquences.",
  completionMessages: {
    success: "Mission Niveau 1 accomplie ! Tous les fragments ont été rapportés au laboratoire.",
    labMissingFragments: "Retour au labo, mais il manque {missing} fragment(s). Continuez l'exploration.",
    objectiveNotMet: "Objectifs non atteints. Le rover n'est pas au laboratoire ou des fragments manquent."
  }
};