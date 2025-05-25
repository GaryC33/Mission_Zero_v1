// modules/game-controller/game-controller.js
import { loadDialog, showDialog, hideDialog } from '../dialog/dialog.js';
import { COMMAND_DETAILS, DIALOG_TYPES } from '../utils/constants.js';
import { createRover, moveRover, turnRoverLeft, turnRoverRight, resetRoverTrail } from '../rover/rover.js';
import { createFragments, checkFragmentCollision, resetFragments } from '../fragment/fragment.js';
// Note: CommandPanel et SimulationPanel sont chargés dans main.js et leurs instances/fonctions seront passées
// ou nous utiliserons un EventBus pour la communication. Pour l'instant, on passera des références si besoin.

// Pour l'instant, on va supposer que les instances des modules UI sont accessibles
// ou que le GameController a des méthodes pour les mettre à jour directement.
// Plus tard, on pourra affiner avec un EventBus si la communication directe devient trop complexe.
let commandPanelUI = null; // Référence aux fonctions exportées par command-panel.js
let simulationUI = null; // Référence aux fonctions exportées par simulation.js

// Fallback Elya messages (sera surchargé par les données du niveau)
const DEFAULT_ELYA_MESSAGES = [
  "Excellent travail, Isaac ! Les fragments semblent émettre une sorte d'énergie. Ermès la capte. Poursuis les tests.",
  "Fascinant. Les données entrantes sont de plus en plus complexes. Ces Sphères... elles ne sont pas inertes.",
  "Chaque fragment amplifie le signal. Je crois discerner une structure, un message... Il nous en faut plus !",
  "Les tests sont concluants. Ermès est prêt pour des missions plus complexes. Le mystère des Sphères reste entier."
];


export class GameController {
    constructor(/* eventBus */) {
        // this.eventBus = eventBus; // Si on utilise un EventBus

        this.currentLevelId = 1;
        this.currentLevelData = null;
        this.rover = null;
        this.fragments = [];
        this.collectedFragmentsCount = 0;
        this.totalFragmentsToCollectThisLevel = 0;

        this.isSimulating = false; // Vrai lorsque le rover exécute une séquence ou est en mouvement direct actif
        this.missionActive = false; // Vrai lorsqu'un niveau est chargé et prêt à être joué

        this.initialDialogQueue = [];
        this.currentDialogIndex = 0;

        // Pour les niveaux avec séquences par fragment
        this.checkpoints = [];
        this.currentSegmentIndex = 0;

        // Références aux modules UI (à initialiser via des méthodes ou au constructeur)
        // Ces références seront utilisées pour appeler des fonctions comme commandPanelUI.updateButtonStates(...)
        this.commandPanelAPI = null;
        this.simulationAPI = null;
        this.dialogAPI = { showDialog, hideDialog }; // Accès direct aux fonctions du module dialog

        // Initialisation des gestionnaires d'événements (si on utilise un EventBus)
        // this.setupEventListeners();
    }

    // Méthode pour que main.js injecte les API des modules UI
    registerUIModules(commandPanelAPI, simulationAPI) {
        this.commandPanelAPI = commandPanelAPI;
        this.simulationAPI = simulationAPI;
    }

    async startGame() {
        // Pour l'instant, charge le premier niveau.
        // Plus tard, cela pourrait charger depuis localStorage ou une sélection de niveau.
        await this.loadLevel(this.currentLevelId);
    }

    async loadLevel(levelId) {
        this.isSimulating = false;
        this.missionActive = false; // La mission n'est pas active tant que les dialogues initiaux ne sont pas passés
        try {
            const levelModule = await import(`../../levels/level${levelId}.js`); // Ajustez le chemin si nécessaire
            this.currentLevelData = levelModule[`level${levelId}Data`]; // ex: level1Data
            if (!this.currentLevelData) {
                throw new Error(`Données du niveau ${levelId} non trouvées.`);
            }

            this.currentLevelId = levelId; // Mettre à jour l'ID du niveau actuel
            this.initializeLevelState(); // Prépare rover, fragments etc.

            // Préparer la file d'attente des dialogues initiaux
            this.initialDialogQueue = this.currentLevelData.dialoguesInitiaux ? [...this.currentLevelData.dialoguesInitiaux] : [];
            this.currentDialogIndex = 0;

            if (this.simulationAPI) {
                this.simulationAPI.initializeCanvas(this.currentLevelData.gridWidth, this.currentLevelData.gridHeight);
                // Dessiner l'état initial mais ne pas encore afficher l'objectif principal si des dialogues sont prévus
                this.simulationAPI.drawInitialState(this.rover, this.fragments, this.currentLevelData.labPosition);
                this.simulationAPI.updateFragmentCount(this.collectedFragmentsCount, this.totalFragmentsToCollectThisLevel);
            }
            if (this.commandPanelAPI) {
                this.commandPanelAPI.clearSequence();
                // Les boutons du commandPanel seront désactivés jusqu'à la fin des dialogues initiaux
                this.updateCommandPanelUIState({ initialDialogActive: this.initialDialogQueue.length > 0 });
            }

            // Démarrer la séquence de dialogues initiaux si elle existe
            if (this.initialDialogQueue.length > 0) {
                this.showNextInitialDialog();
            } else {
                this.activateMission(); // Activer directement si pas de dialogues initiaux
            }
        } catch (error) {
            console.error(`Erreur lors du chargement du niveau ${levelId}:`, error);
            this.dialogAPI.showDialog({
                type: DIALOG_TYPES.CONSOLE,
                title: "Erreur Critique",
                message: `Impossible de charger le niveau ${levelId}. Vérifiez la console.`
            });
        }
    }

    showNextInitialDialog() {
        if (this.currentDialogIndex < this.initialDialogQueue.length) {
            const dialogData = this.initialDialogQueue[this.currentDialogIndex];

            this.dialogAPI.showDialog({
                type: dialogData.type, // 'elya', 'isaac', 'console'
                title: this.getTitleForDialogType(dialogData.type), // Utilise une fonction pour le titre
                message: dialogData.message,
                actions: [{
                    text: (this.currentDialogIndex === this.initialDialogQueue.length - 1) ? "Commencer la mission" : "Suivant...",
                    action: () => {
                        this.currentDialogIndex++;
                        this.dialogAPI.hideDialog(); // Cacher le dialogue actuel
                        this.showNextInitialDialog(); // Afficher le suivant ou activer la mission
                    },
                    className: 'bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-md mx-1 orbitron'
                }]
            });
        } else {
            this.activateMission();
        }
    }

    getTitleForDialogType(type) {
        switch(type) {
            case DIALOG_TYPES.ELYA: return "Message d'Elya";
            case DIALOG_TYPES.ISAAC: return "Journal d'Isaac"; // Supposant que vous pourriez avoir un DIALOG_TYPES.ISAAC
            case DIALOG_TYPES.CONSOLE: return "Console Ermes";
            default: return "Message"; // Fallback
        }
    }

    activateMission() {
        this.missionActive = true;
        if (this.simulationAPI) {
            this.simulationAPI.updateStatus(this.currentLevelData.missionObjective || `Niveau ${this.currentLevelId}. Prêt.`);
        }
        if (this.currentLevelData.gameplayMode === 'sequencePerFragment') {
            this.updateObjectiveMessageForSegment();
        }
        this.updateCommandPanelUIState(); // Met à jour l'état des boutons maintenant que la mission est active
    }

    initializeLevelState() {
        this.rover = createRover(this.currentLevelData.initialRoverConfig);
        this.fragments = createFragments(
            this.currentLevelData.fragmentConfig,
            this.currentLevelData.gridWidth,
            this.currentLevelData.gridHeight,
            [this.currentLevelData.initialRoverConfig, this.currentLevelData.labPosition]
        );
        this.collectedFragmentsCount = 0;
        this.totalFragmentsToCollectThisLevel = this.currentLevelData.totalFragmentsRequired;
        this.checkpoints = [];
        this.currentSegmentIndex = 0;
        this.missionActive = false; // La mission ne devient active qu'après les dialogues initiaux
        this.isSimulating = false; // Important pour réinitialiser l'état de simulation

        if (this.currentLevelData.gameplayMode === 'sequencePerFragment') {
            this.updateObjectiveMessageForSegment();
        }
    }

    getGameState() {
        // Méthode pour que le CommandPanel puisse connaître l'état actuel
        return {
            missionActive: this.missionActive,
            isSimulating: this.isSimulating,
            collectedFragments: this.collectedFragmentsCount,
            totalFragmentsRequired: this.totalFragmentsToCollectThisLevel,
            gameplayMode: this.currentLevelData ? this.currentLevelData.gameplayMode : null,
            currentSegmentIndex: this.currentSegmentIndex,
            segmentTargetsLength: this.currentLevelData && this.currentLevelData.segmentTargets ? this.currentLevelData.segmentTargets.length : 0,
            allSegmentsDoneForAnalysis: this.areAllObjectivesMetForAnalysis(),
            initialDialogActive: this.initialDialogQueue.length > 0 && this.currentDialogIndex < this.initialDialogQueue.length
        };
    }

    updateCommandPanelUIState(overrideStates = {}) {
        if (this.commandPanelAPI) {
            const baseState = this.getGameState();
            const finalState = { ...baseState, ...overrideStates };
            this.commandPanelAPI.updateButtonStates(finalState);
        }
    }

    updateObjectiveMessageForSegment() {
        if (!this.currentLevelData || this.currentLevelData.gameplayMode !== 'sequencePerFragment' || !this.simulationAPI) return;

        const targets = this.currentLevelData.segmentTargets;
        if (!targets || this.currentSegmentIndex >= targets.length) return;

        const targetKey = targets[this.currentSegmentIndex];
        let targetDescription = "";

        if (targetKey === 'lab') {
            targetDescription = "le Laboratoire";
        } else if (targetKey && targetKey.startsWith('fragment_')) {
            const fragmentIndex = parseInt(targetKey.split('_')[1]);
            if (this.fragments[fragmentIndex]) {
                targetDescription = `Fragment ${fragmentIndex + 1} (en ${this.fragments[fragmentIndex].x},${this.fragments[fragmentIndex].y})`;
            } else {
                targetDescription = `Fragment ${fragmentIndex + 1}`;
            }
        }
        this.simulationAPI.updateStatus(`Programmez la séquence vers ${targetDescription}.`);
    }


    // --- Gestionnaires d'actions reçues du CommandPanel ---
    handleStartSimulation(sequence) {
        if (this.isSimulating || !this.missionActive) {
            // Si on clique sur "Commencer Mission" (mode direct) et que la mission n'est pas encore active (dialogues initiaux)
            // Cela ne devrait pas arriver car le bouton sera désactivé par updateCommandPanelUIState.
            // Mais si c'est le cas, on ne fait rien.
            console.warn("handleStartSimulation called while mission not active or already simulating.");
            return;
        }

        const mode = this.currentLevelData.gameplayMode;

        if (mode === 'directControl') {
            this.isSimulating = true; // La "simulation" est le mode de pilotage actif
            // Le CommandPanel gère l'activation des boutons D-Pad
            this.simulationAPI.updateStatus("Pilotage direct activé. Utilisez les commandes.");
        } else if (mode === 'sequencePerFragment' || mode === 'fullSequence') {
            if (!sequence || sequence.length === 0) {
                this.dialogAPI.showDialog({
                    type: DIALOG_TYPES.CONSOLE,
                    title: 'Erreur de Programme',
                    message: 'Aucune commande programmée pour cette séquence.'
                });
                return;
            }
            this.executeProgrammedSequence(sequence);
        }
        this.updateCommandPanelUIState();
    }

    handleResetProgram() {
        if (!this.missionActive) return;

        if (this.currentLevelData.gameplayMode === 'sequencePerFragment' && this.checkpoints.length > 0 && this.currentSegmentIndex > 0) {
            this.dialogAPI.showDialog({
                type: DIALOG_TYPES.CONSOLE,
                title: "Confirmation de Réinitialisation",
                message: "Réinitialiser le segment actuel ou tout le niveau ?",
                actions: [
                    { text: "Segment Actuel", action: () => this.resetCurrentSegment(), className: 'bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-md mx-1 orbitron' },
                    { text: "Niveau Entier", action: () => { this.loadLevel(this.currentLevelId); this.dialogAPI.hideDialog(); }, className: 'bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md mx-1 orbitron' },
                    { text: "Annuler", action: () => this.dialogAPI.hideDialog(), className: 'bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-md mx-1 orbitron' }
                ]
            });
        } else {
            this.loadLevel(this.currentLevelId); // Réinitialisation complète du niveau
        }
        if (this.commandPanelAPI) this.commandPanelAPI.clearSequence();
    }

    resetCurrentSegment() {
        this.isSimulating = false;
        const lastCheckpoint = this.checkpoints[this.currentSegmentIndex - 1]; // Le checkpoint est pour le segment *précédent*
        if (lastCheckpoint) {
            this.rover = createRover(lastCheckpoint.roverState); // Recrée le rover depuis l'état sauvegardé
            this.collectedFragmentsCount = lastCheckpoint.collectedFragments;
            // Marquer les fragments comme collectés en fonction du checkpoint
            this.fragments.forEach(f => {
                f.collected = lastCheckpoint.collectedFragmentIds.includes(f.id);
            });
        } else { // Devrait pas arriver si currentSegmentIndex > 0 et checkpoints existent, mais par sécurité
            this.initializeLevelState(); // Réinitialisation complète si pas de checkpoint valide
        }

        if (this.commandPanelAPI) this.commandPanelAPI.clearSequence();
        this.updateObjectiveMessageForSegment();
        this.simulationAPI.drawState(this.rover, this.fragments, this.currentLevelData.labPosition);
        this.simulationAPI.updateFragmentCount(this.collectedFragmentsCount, this.totalFragmentsToCollectThisLevel);
        this.updateCommandPanelUIState();
        this.dialogAPI.hideDialog();
    }


    handleDirectCommand(commandType) {
        if (this.isSimulating && this.currentLevelData.gameplayMode === 'directControl' && this.missionActive) {
            this.processSingleCommand(commandType);
            // Le rendu et la vérification des collisions/fin se font dans processSingleCommand
        }
    }

    async executeProgrammedSequence(sequence) {
        this.isSimulating = true;
        this.updateCommandPanelUIState();
        if (this.simulationAPI) this.simulationAPI.updateStatus('Simulation de séquence en cours...');

        // Réinitialiser le rover au début du segment pour 'sequencePerFragment'
        if (this.currentLevelData.gameplayMode === 'sequencePerFragment') {
            if (this.currentSegmentIndex > 0 && this.checkpoints[this.currentSegmentIndex -1]) {
                const previousCheckpoint = this.checkpoints[this.currentSegmentIndex - 1];
                this.rover = createRover(previousCheckpoint.roverState);
                 this.fragments.forEach(f => { // Assurer la cohérence visuelle des fragments collectés
                    f.collected = previousCheckpoint.collectedFragmentIds.includes(f.id);
                });
                this.collectedFragmentsCount = previousCheckpoint.collectedFragments;

            } else { // Premier segment
                this.rover = createRover(this.currentLevelData.initialRoverConfig);
                resetFragments(this.fragments);
                this.collectedFragmentsCount = 0;
            }
            resetRoverTrail(this.rover); // Important: la trace recommence à chaque segment
            if(this.simulationAPI) {
                this.simulationAPI.updateFragmentCount(this.collectedFragmentsCount, this.totalFragmentsToCollectThisLevel);
                this.simulationAPI.drawState(this.rover, this.fragments, this.currentLevelData.labPosition);
            }
        } else { // Pour 'fullSequence' (si implémenté plus tard)
            this.rover = createRover(this.currentLevelData.initialRoverConfig);
            resetFragments(this.fragments);
            this.collectedFragmentsCount = 0;
            if(this.simulationAPI) {
                this.simulationAPI.updateFragmentCount(this.collectedFragmentsCount, this.totalFragmentsToCollectThisLevel);
                 this.simulationAPI.drawState(this.rover, this.fragments, this.currentLevelData.labPosition);
            }
        }


        for (const commandType of sequence) {
            if (!this.isSimulating) break; // Permet d'interrompre la simulation
            if (this.simulationAPI) this.simulationAPI.updateStatus(`Exécution: ${COMMAND_DETAILS[commandType]?.text || commandType}`);
            this.processSingleCommand(commandType);
            await new Promise(resolve => setTimeout(resolve, 350)); // Délai pour la visualisation
        }

        if (this.isSimulating) { // Si la simulation n'a pas été interrompue
            if (this.currentLevelData.gameplayMode === 'sequencePerFragment') {
                this.checkSegmentCompletion();
            } else { // Pour 'directControl' (déjà géré) ou 'fullSequence'
                this.checkMissionCompletion();
            }
        }
        this.isSimulating = false; // Fin de la simulation de cette séquence
        this.updateCommandPanelUIState();
    }

    processSingleCommand(commandType) {
        const { gridWidth, gridHeight } = this.currentLevelData;
        switch (commandType) {
            case 'cmd_forward':
                moveRover(this.rover, gridWidth, gridHeight);
                break;
            case 'cmd_turn_left':
                turnRoverLeft(this.rover);
                break;
            case 'cmd_turn_right':
                turnRoverRight(this.rover);
                break;
        }

        const collectedFragmentId = checkFragmentCollision(this.rover, this.fragments);
        if (collectedFragmentId) {
            this.collectedFragmentsCount = this.fragments.filter(f => f.collected).length;
            const fragmentJustCollected = this.fragments.find(f => f.id === collectedFragmentId); // Pour les coordonnées

            // Message de la console Ermes
            const consoleMessage = `Fragment ${this.collectedFragmentsCount}/${this.totalFragmentsToCollectThisLevel} collecté en (${fragmentJustCollected.x}, ${fragmentJustCollected.y}).`;
            this.dialogAPI.showDialog({
                type: DIALOG_TYPES.CONSOLE,
                title: "Console Ermes - Rapport",
                message: consoleMessage,
                // Pas d'actions personnalisées, le bouton "Compris" par défaut suffira et cachera le dialogue
            });

            if (this.simulationAPI) {
                // this.simulationAPI.updateStatus(`Fragment collecté !`); // Message bref, peut-être redondant avec le dialogue console
                this.simulationAPI.updateFragmentCount(this.collectedFragmentsCount, this.totalFragmentsToCollectThisLevel);
            }
        }

        if (this.simulationAPI) this.simulationAPI.drawState(this.rover, this.fragments, this.currentLevelData.labPosition);

        // En mode direct, vérifier la complétion de la mission après chaque action, si la mission est active et qu'on n'est pas dans une séquence auto
        if (this.currentLevelData.gameplayMode === 'directControl' && this.missionActive && !this.isSimulating) {
            this.checkMissionCompletion();
        }
    }

    // --- Logique de fin de niveau / segment ---
    checkMissionCompletion() {
        const { labPosition, totalFragmentsRequired, completionMessages } = this.currentLevelData;
        const atLab = this.rover.x === labPosition.x && this.rover.y === labPosition.y;

        if (atLab) {
            if (this.collectedFragmentsCount >= totalFragmentsRequired) {
                if (this.simulationAPI) this.simulationAPI.updateStatus(completionMessages.success);
                this.missionActive = false; // Empêche d'autres actions jusqu'à l'analyse/prochain niveau
                // this.isSimulating = false; // Assurer que la simulation est bien arrêtée
                this.dialogAPI.showDialog({
                    type: DIALOG_TYPES.ELYA,
                    title: `Mission ${this.currentLevelId} Accomplie !`,
                    message: completionMessages.success
                });
            } else {
                const message = completionMessages.labMissingFragments.replace('{missing}', totalFragmentsRequired - this.collectedFragmentsCount);
                if (this.simulationAPI) this.simulationAPI.updateStatus(message);
                this.dialogAPI.showDialog({ type: DIALOG_TYPES.CONSOLE, title: 'Rapport de Mission', message });
            }
        } else {
            // Si pas au labo mais en mode direct, le jeu continue.
            // Pour le mode séquence, si la séquence se termine ailleurs, c'est un échec partiel.
            if (this.currentLevelData.gameplayMode !== 'directControl') {
                 if (this.simulationAPI) this.simulationAPI.updateStatus(completionMessages.objectiveNotMet || 'Objectifs non atteints.');
            }
        }
        this.updateCommandPanelUIState();
    }

    checkSegmentCompletion() {
        const { labPosition, totalFragmentsRequired, completionMessages, segmentTargets } = this.currentLevelData;
        const currentTargetKey = segmentTargets[this.currentSegmentIndex];
        let targetReached = false;
        let isLabTarget = false;

        if (currentTargetKey === 'lab') {
            isLabTarget = true;
            targetReached = this.rover.x === labPosition.x && this.rover.y === labPosition.y;
        } else if (currentTargetKey && currentTargetKey.startsWith('fragment_')) {
            const fragmentIndex = parseInt(currentTargetKey.split('_')[1]);
            const targetFragment = this.fragments[fragmentIndex];
            if (targetFragment && this.rover.x === targetFragment.x && this.rover.y === targetFragment.y) {
                // La collision (et donc la collecte) a déjà été gérée dans processSingleCommand
                targetReached = targetFragment.collected;
            }
        }

        if (targetReached) {
            if (isLabTarget) { // Cible était le laboratoire
                if (this.collectedFragmentsCount >= totalFragmentsRequired) {
                    if (this.simulationAPI) this.simulationAPI.updateStatus(completionMessages.success);
                    this.missionActive = false;
                    this.dialogAPI.showDialog({
                        type: DIALOG_TYPES.ELYA,
                        title: `Mission ${this.currentLevelId} Accomplie !`,
                        message: completionMessages.success
                    });
                } else { // Au labo mais fragments manquants (ne devrait pas arriver si les segments sont bien définis)
                    const message = completionMessages.labMissingFragments.replace('{missing}', totalFragmentsRequired - this.collectedFragmentsCount);
                    if (this.simulationAPI) this.simulationAPI.updateStatus(message);
                    this.dialogAPI.showDialog({ type: DIALOG_TYPES.CONSOLE, title: 'Rapport de Segment', message });
                }
            } else { // Cible était un fragment
                const fragmentNumber = parseInt(currentTargetKey.split('_')[1]) + 1;
                const nextTargetIndex = this.currentSegmentIndex + 1;
                let nextTargetDesc = "";
                if (nextTargetIndex < segmentTargets.length) {
                    const nextKey = segmentTargets[nextTargetIndex];
                    if (nextKey === 'lab') nextTargetDesc = "le Laboratoire";
                    else nextTargetDesc = `Fragment ${parseInt(nextKey.split('_')[1]) + 1}`;
                }

                const checkpointMsg = completionMessages.checkpointReached
                    .replace('{fragmentNumber}', fragmentNumber)
                    .replace('{nextTarget}', nextTargetDesc);

                if (this.simulationAPI) this.simulationAPI.updateStatus(checkpointMsg);
                this.dialogAPI.showDialog({ type: DIALOG_TYPES.CONSOLE, title: "Checkpoint !", message: checkpointMsg });

                this.checkpoints.push({
                    segmentIndex: this.currentSegmentIndex,
                    roverState: JSON.parse(JSON.stringify(this.rover)), // Sauvegarde de l'état profond du rover
                    collectedFragments: this.collectedFragmentsCount,
                    collectedFragmentIds: this.fragments.filter(f => f.collected).map(f => f.id)
                });
                this.currentSegmentIndex++;
                if (this.commandPanelAPI) this.commandPanelAPI.clearSequence();

                if (this.currentSegmentIndex < segmentTargets.length) {
                    this.updateObjectiveMessageForSegment();
                } else { // Tous segments terminés, mais pas encore la vérification finale du labo (géré par le targetKey === 'lab')
                     if (this.simulationAPI) this.simulationAPI.updateStatus("Tous les segments programmés terminés.");
                }
            }
        } else { // Cible du segment non atteinte
             if (this.simulationAPI) this.simulationAPI.updateStatus(completionMessages.objectiveNotMet || 'Objectif du segment non atteint.');
        }
        this.updateCommandPanelUIState();
    }


    areAllObjectivesMetForAnalysis() {
        if (!this.currentLevelData || this.missionActive) return false; // Pas d'analyse si mission en cours

        const { labPosition, totalFragmentsRequired, gameplayMode, segmentTargets } = this.currentLevelData;
        const atLab = this.rover.x === labPosition.x && this.rover.y === labPosition.y;
        const allFragmentsCollected = this.collectedFragmentsCount >= totalFragmentsRequired;

        if (gameplayMode === 'sequencePerFragment') {
            // Pour l'analyse, il faut que le dernier segment (vers le labo) soit complété et que tous les fragments soient là
            return this.currentSegmentIndex >= segmentTargets.length && atLab && allFragmentsCollected;
        }
        // Pour les autres modes (directControl, fullSequence)
        return atLab && allFragmentsCollected;
    }

    
    handleAnalyzeFragments() {
        if (this.commandPanelAPI) this.commandPanelAPI.setAnalyzeSpinner(true);
        if (this.simulationAPI) this.simulationAPI.updateStatus('Analyse des fragments en cours...');

        // Utiliser le texte prédéfini du niveau au lieu d'un appel API
        setTimeout(() => { // Garder un petit délai pour simuler un traitement
            const analysisText = this.currentLevelData.elyaAnalysisText ||
                                 DEFAULT_ELYA_MESSAGES[this.currentLevelId - 1] || // Fallback général
                                 "Analyse des fragments terminée.";                 // Fallback ultime

            this.dialogAPI.showDialog({
                type: DIALOG_TYPES.ELYA,
                title: `Rapport d'Elya - Niveau ${this.currentLevelId}`,
                message: analysisText
            });

            if (this.commandPanelAPI) this.commandPanelAPI.setAnalyzeSpinner(false);
            this.proceedToNextLevel();
        }, 1000); // Réduire le délai car il n'y a plus d'appel réseau
    }
    

    proceedToNextLevel() {
        this.currentLevelId++;
        // TODO: Vérifier s'il y a plus de niveaux disponibles
        // Pour l'instant, on suppose qu'il y a toujours un niveau suivant ou une fin.
        const maxLevels = 2; // À définir en fonction du nombre de fichiers de niveau
        if (this.currentLevelId <= maxLevels) {
            this.dialogAPI.showDialog({
                type: DIALOG_TYPES.CONSOLE,
                title: "Progression",
                message: `Chargement du niveau ${this.currentLevelId}...`
            });
            setTimeout(() => {
                this.dialogAPI.hideDialog();
                this.loadLevel(this.currentLevelId);
            }, 2000);
        } else {
             if (this.simulationAPI) this.simulationAPI.updateStatus('Toutes les missions sont terminées ! Bravo !');
            this.dialogAPI.showDialog({
                type: DIALOG_TYPES.ELYA,
                title: "Fin de la Mission Zéro",
                message: "Félicitations, Commandant ! Vous avez complété toutes les missions de la Phase Zéro. Ermès est prêt pour des explorations plus lointaines et complexes."
            });
            this.missionActive = false;
            this.isSimulating = false; // Assurer que tout est arrêté
            this.updateCommandPanelUIState(); // Mettra à jour les boutons pour refléter la fin
        }
    }
}