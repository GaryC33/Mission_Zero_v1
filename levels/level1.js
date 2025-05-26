// levels/level1.js
export const level1Data = {
  levelId: 1,
  gridWidth: 6, // Taille de la grille en largeur
  gridHeight: 6, // Taille de la grille en hauteur
  totalFragmentsRequired: 2, // Nombre total de fragments à collecter pour ce niveau
  labPosition: { x: 5, y: 5 }, // Position du laboratoire
  initialRoverConfig: { x: 0, y: 0, angle: 0, color: '#63B3ED', trail: [] }, // Configuration initiale du rover

  // Configuration des fragments pour le niveau 1
  fragmentConfig: {
    type: 'fixed', // Type de placement des fragments: 'fixed' ou 'random'
    count: 2, // Doit correspondre à totalFragmentsRequired
    color: '#FBBF24', // Couleur des fragments (jaune/ambre)
    // Positions spécifiques si type 'fixed'. S'assurer qu'elles sont dans la grille et pas sur le rover/labo initial.
    positions: [
      { x: 2, y: 1 },
      { x: 4, y: 3 }
    ],
    // 'avoid' est plus pertinent pour le type 'random', mais peut être listé pour information.
    // avoid: [{ x: 0, y: 0 }, { x: 5, y: 5 }] // Éviter la position initiale du rover et du laboratoire
  },

  gameplayMode: 'directControl', // Mode de jeu: 'directControl', 'sequencePerFragment', 'fullSequence'
  missionTitle: 'Niveau 1: Prise en Main',
  missionObjective: "Mode Découverte: Pilotez Ermès directement pour collecter 2 fragments jaunes et ramenez-les au laboratoire.",

  // Texte pour Elya lorsque le joueur clique sur "Analyser les Fragments" après avoir réussi le niveau.
  elyaAnalysisText: "Excellent travail pour cette première mission, Isaac ! Les fragments que vous avez collectés émettent une signature énergétique distincte. Cela confirme nos théories sur leur potentiel. Ermès a bien réagi aux commandes directes. Préparez-vous pour la suite, nous allons introduire des séquences de commandes programmées.",

  // Dialogues initiaux affichés au début du niveau
  dialoguesInitiaux: [
    { type: 'elya', message: "Bienvenue, Isaac. Pour cette première mission de la Phase Zéro, vous allez prendre en main Ermès. Votre objectif est simple : collecter les deux fragments énergétiques jaunes dispersés sur la zone et les ramener au laboratoire. Le pilotage est direct pour cette phase." },
    { type: 'isaac', message: "Compris, Elya. Ermès est initialisé en mode de pilotage direct. Je vais récupérer ces fragments. Ses capteurs semblent stables." }
  ],

  // Messages de complétion de mission/segment
  completionMessages: {
    success: "Mission de Niveau 1 accomplie ! Les fragments sont sécurisés au laboratoire. Excellent pilotage !",
    labMissingFragments: "Retour au laboratoire, mais il manque encore {missing} fragment(s) pour valider la mission. Continuez l'exploration !",
    objectiveNotMet: "Objectif non atteint. Le rover doit retourner au laboratoire avec tous les fragments requis.",
    // 'checkpointReached' n'est généralement pas utilisé pour le mode 'directControl'
  }
  // 'segmentTargets' n'est pas utilisé pour le mode 'directControl'
};