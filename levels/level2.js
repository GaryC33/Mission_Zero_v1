// levels/level2.js
export const level2Data = {
  levelId: 2,
  gridWidth: 6,
  gridHeight: 6,
  totalFragmentsRequired: 2,
  labPosition: { x: 5, y: 5 },
  initialRoverConfig: { x: 0, y: 0, angle: 0, color: '#63B3ED', trail: [] },
  fragmentConfig: {
    type: 'random',
    count: 2,
    color: '#FBBF24', // Amber
    avoid: [{ x: 0, y: 0 }, { x: 5, y: 5 }]
  },
  gameplayMode: 'sequencePerFragment',
  missionTitle: 'Niveau 2: Premières Séquences',
  missionObjective: "Programmation Séquentielle: Programmez Ermès pour collecter le premier fragment orange. Un checkpoint sera activé. Puis, programmez vers le second fragment. Enfin, programmez le retour au laboratoire.",
  elyaPrompt: "Vous êtes Elya. Isaac a terminé le Niveau 2 (programmation séquentielle par étapes, 2 fragments sur grille 6x6). Il a programmé des séquences pour chaque fragment, puis pour le retour au labo. Confirmez la réussite, soulignez l'efficacité de la programmation par séquences et préparez-le à des défis plus complexes.",
  completionMessages: {
    success: "Mission Niveau 2 accomplie ! Programmation séquentielle maîtrisée.",
    labMissingFragments: "Retour au labo, mais il manque {missing} fragment(s) pour ce segment. Réinitialisez le programme ou le segment.",
    objectiveNotMet: "Objectif du segment non atteint. Vérifiez votre séquence.",
    checkpointReached: "Fragment {fragmentNumber} collecté ! Checkpoint. Programmez la séquence vers {nextTarget}."
  },
  segmentTargets: ['fragment_0', 'fragment_1', 'lab'] // Defines the order of targets for sequencePerFragment
};