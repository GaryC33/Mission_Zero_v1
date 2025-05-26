// modules/game-controller/game-controller.js
import { loadDialog, showDialog, hideDialog } from '../dialog/dialog.js';
import { COMMAND_DETAILS, DIALOG_TYPES } from '../utils/constants.js';
import { createRover, moveRover, turnRoverLeft, turnRoverRight, resetRoverTrail } from '../rover/rover.js';
import { createFragments, checkFragmentCollision, resetFragments } from '../fragment/fragment.js';

const DEFAULT_ELYA_MESSAGES = [
  "Excellent travail, Isaac ! Les fragments semblent émettre une sorte d'énergie. Ermès la capte. Poursuis les tests.",
  "Fascinant. Les données entrantes sont de plus en plus complexes. Ces Sphères... elles ne sont pas inertes.",
  "Chaque fragment amplifie le signal. Je crois discerner une structure, un message... Il nous en faut plus !",
  "Les tests sont concluants. Ermès est prêt pour des missions plus complexes. Le mystère des Sphères reste entier."
];

export class GameController {
    constructor() {
        this.currentLevelId = 1;
        this.currentLevelData = null;
        this.rover = null;
        this.fragments = [];
        this.collectedFragmentsCount = 0;
        this.totalFragmentsToCollectThisLevel = 0;
        this.isSimulating = false;
        this.missionActive = false;
        this.initialDialogQueue = [];
        this.currentDialogIndex = 0;
        this.checkpoints = [];
        this.currentSegmentIndex = 0;
        this.commandPanelAPI = null;
        this.simulationAPI = null;
        this.dialogAPI = { showDialog, hideDialog };
        console.log("GameController: Instance created.");
    }

    registerUIModules(commandPanelAPI, simulationAPI) {
        this.commandPanelAPI = commandPanelAPI;
        this.simulationAPI = simulationAPI;
        console.log("GameController: UI Modules registered.", { commandPanelAPI, simulationAPI });
    }

    isMissionActive() {
        return this.missionActive;
    }

    handleResize() {
        if (this.simulationAPI && this.isMissionActive()) {
            this.simulationAPI.handleResize();
            this.simulationAPI.drawState(this.rover, this.fragments, this.currentLevelData.labPosition);
        }
    }

    async startGame() {
        console.log("GameController: startGame called.");
        await this.loadLevel(this.currentLevelId);
    }

    async loadLevel(levelId) {
        console.log(`GameController: Attempting to load level ${levelId}.`);
        this.isSimulating = false;
        this.missionActive = false;
        this.currentSegmentIndex = 0;
        this.checkpoints = [];

        try {
            const levelModulePath = `../../levels/level${levelId}.js`;
            console.log(`GameController: Importing level module from path: ${levelModulePath}`);
            const levelModule = await import(levelModulePath);
            console.log("GameController: Level module imported:", levelModule);

            this.currentLevelData = levelModule[`level${levelId}Data`];

            if (!this.currentLevelData) {
                throw new Error(`Données du niveau ${levelId} (variable level${levelId}Data) non trouvées dans le module importé.`);
            }
            console.log(`GameController: Level ${levelId} data loaded successfully:`, this.currentLevelData);

            this.currentLevelId = levelId;
            this.initializeLevelState();
            console.log("GameController: Level state initialized.");

            this.initialDialogQueue = this.currentLevelData.dialoguesInitiaux ? [...this.currentLevelData.dialoguesInitiaux] : [];
            this.currentDialogIndex = 0;
            console.log("GameController: Initial dialog queue prepared:", this.initialDialogQueue);

            if (this.simulationAPI) {
                console.log("GameController: Initializing simulation canvas and drawing initial state.");
                this.simulationAPI.initializeCanvas(this.currentLevelData.gridWidth, this.currentLevelData.gridHeight);
                this.simulationAPI.drawInitialState(this.rover, this.fragments, this.currentLevelData.labPosition);
                this.simulationAPI.updateFragmentCount(this.collectedFragmentsCount, this.totalFragmentsToCollectThisLevel);
            } else {
                console.error("GameController: simulationAPI is not available for canvas initialization!");
            }

            if (this.commandPanelAPI) {
                console.log("GameController: Clearing command panel sequence.");
                this.commandPanelAPI.clearSequence();
            } else {
                console.error("GameController: commandPanelAPI is not available for clearing sequence!");
            }
            
            console.log("GameController: Updating command panel UI state before dialogs.");
            this.updateCommandPanelUIState();

            if (this.initialDialogQueue.length > 0) {
                console.log("GameController: Showing next initial dialog.");
                this.showNextInitialDialog();
            } else {
                console.log("GameController: No initial dialogs, activating mission directly.");
                this.activateMission();
            }
        } catch (error) {
            console.error(`Erreur DÉTAILLÉE lors du chargement du niveau ${levelId}:`, error);
            console.error("Erreur name:", error.name);
            console.error("Erreur message:", error.message);
            console.error("Erreur stack:", error.stack);
            if (this.dialogAPI && typeof this.dialogAPI.showDialog === 'function') {
                this.dialogAPI.showDialog({
                    type: DIALOG_TYPES.CONSOLE,
                    title: "Erreur Critique de Chargement",
                    message: `Impossible de charger le niveau ${levelId}. Détail: ${error.message}. Vérifiez la console pour plus d'informations techniques.`
                });
            } else {
                alert(`Erreur critique (dialogAPI non disponible): Impossible de charger le niveau ${levelId}. Message: ${error.message}`);
            }
        }
    }

    showNextInitialDialog() {
        console.log(`GameController: showNextInitialDialog called. Current index: ${this.currentDialogIndex}, Queue length: ${this.initialDialogQueue.length}`);
        if (this.currentDialogIndex < this.initialDialogQueue.length) {
            const dialogData = this.initialDialogQueue[this.currentDialogIndex];
            console.log("GameController: Displaying dialog:", dialogData);
            this.dialogAPI.showDialog({
                type: dialogData.type,
                title: this.getTitleForDialogType(dialogData.type),
                message: dialogData.message,
                actions: [{
                    text: (this.currentDialogIndex === this.initialDialogQueue.length - 1) ? "Commencer la mission" : "Suivant...",
                    action: () => {
                        console.log("GameController: Dialog action - Next/Commencer mission.");
                        this.currentDialogIndex++;
                        this.dialogAPI.hideDialog();
                        this.showNextInitialDialog();
                    },
                    className: 'bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-md mx-1 orbitron'
                }]
            });
        } else {
            console.log("GameController: All initial dialogs shown, attempting to activate mission.");
            this.activateMission();
        }
    }

    getTitleForDialogType(type) {
        // ... (contenu existant)
        switch(type) {
            case DIALOG_TYPES.ELYA: return "Message d'Elya";
            case DIALOG_TYPES.ISAAC: return "Journal d'Isaac";
            case DIALOG_TYPES.CONSOLE: return "Console Ermes";
            default: return "Message";
        }
    }

    activateMission() {
        console.log("GameController: activateMission called.");
        this.missionActive = true;
        if (this.simulationAPI) {
            console.log("GameController: simulationAPI is available in activateMission.");
            if (this.currentLevelData.gameplayMode === 'sequencePerFragment') {
                this.updateObjectiveMessageForSegment();
            } else {
                 this.simulationAPI.updateStatus(this.currentLevelData.missionObjective || `Niveau ${this.currentLevelId}. Prêt.`);
            }
        } else {
            console.error("GameController: simulationAPI is NULL in activateMission!");
        }
        this.updateCommandPanelUIState();
        console.log("GameController: Mission activated and UI updated.");
    }

    initializeLevelState() {
        // ... (contenu existant)
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
        this.missionActive = false; 
        this.isSimulating = false;

        this.fragments.forEach((frag, index) => {
            if (typeof frag.displayId === 'undefined') {
                frag.displayId = index + 1;
            }
        });
    }

    getGameState() {
        // ... (contenu existant)
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

    updateCommandPanelUIState() {
        if (this.commandPanelAPI) {
            // console.log("GameController: Updating command panel UI with state:", this.getGameState());
            this.commandPanelAPI.updateButtonStates(this.getGameState());
        } else {
            console.warn("GameController: commandPanelAPI not available when trying to updateCommandPanelUIState.");
        }
    }

    updateObjectiveMessageForSegment() {
        // ... (contenu existant)
        if (!this.currentLevelData || this.currentLevelData.gameplayMode !== 'sequencePerFragment' || !this.simulationAPI) return;

        const targets = this.currentLevelData.segmentTargets;
        if (!targets || this.currentSegmentIndex >= targets.length) return;

        const targetKey = targets[this.currentSegmentIndex];
        let targetDescription = "";

        if (targetKey === 'lab') {
            targetDescription = "le Laboratoire";
        } else if (targetKey && targetKey.startsWith('fragment_')) {
            const fragmentIndex = parseInt(targetKey.split('_')[1]);
            const targetFragment = this.fragments[fragmentIndex];
            if (targetFragment) {
                 targetDescription = `Fragment ${targetFragment.displayId || fragmentIndex + 1} (en ${targetFragment.x},${targetFragment.y})`;
            } else {
                targetDescription = `Fragment Inconnu ${fragmentIndex + 1}`;
            }
        }
        console.log(`GameController: Updating objective message for segment. Target: ${targetDescription}`);
        this.simulationAPI.updateStatus(`Programmez la séquence vers ${targetDescription}.`);
    }

    handleStartSimulation(sequence) {
        // ... (contenu existant avec logs si besoin)
        if (this.isSimulating || !this.missionActive) {
            console.warn("GameController: handleStartSimulation called while mission not active or already simulating.");
            return;
        }
        console.log("GameController: handleStartSimulation initiated. Mode:", this.currentLevelData.gameplayMode);

        const mode = this.currentLevelData.gameplayMode;

        if (mode === 'directControl') {
            this.isSimulating = true; 
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
        // ... (contenu existant avec logs si besoin)
        console.log("GameController: handleResetProgram called.");
        if (!this.missionActive && !(this.currentLevelData.gameplayMode === 'directControl' && this.isSimulating)) {
            console.warn("GameController: Reset called when mission not active or not in active direct control.");
            return;
        }

        if (this.currentLevelData.gameplayMode === 'sequencePerFragment' && this.checkpoints.length > 0 && this.currentSegmentIndex > 0) {
            this.dialogAPI.showDialog({
                type: DIALOG_TYPES.CONSOLE,
                title: "Confirmation de Réinitialisation",
                message: "Réinitialiser le segment actuel ou tout le niveau ?",
                actions: [
                    { text: "Segment Actuel", action: () => { this.resetCurrentSegment(); this.dialogAPI.hideDialog();}, className: 'bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-md mx-1 orbitron' },
                    { text: "Niveau Entier", action: () => { this.dialogAPI.hideDialog(); this.loadLevel(this.currentLevelId); }, className: 'bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md mx-1 orbitron' },
                    { text: "Annuler", action: () => this.dialogAPI.hideDialog(), className: 'bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-md mx-1 orbitron' }
                ]
            });
        } else {
            this.loadLevel(this.currentLevelId); 
        }
        if (this.commandPanelAPI) this.commandPanelAPI.clearSequence();
    }

    resetCurrentSegment() {
        // ... (contenu existant avec logs si besoin)
        console.log("GameController: resetCurrentSegment called.");
        this.isSimulating = false; 
        const lastCheckpointIndex = this.currentSegmentIndex - 1;
        
        if (lastCheckpointIndex >= 0 && this.checkpoints[lastCheckpointIndex]) {
            const lastCheckpoint = this.checkpoints[lastCheckpointIndex];
            this.rover = createRover(JSON.parse(JSON.stringify(lastCheckpoint.roverState)));
            this.collectedFragmentsCount = lastCheckpoint.collectedFragments;
            this.fragments.forEach(f => {
                f.collected = lastCheckpoint.collectedFragmentIds.includes(f.id);
            });
        } else { 
            this.rover = createRover(JSON.parse(JSON.stringify(this.currentLevelData.initialRoverConfig)));
            resetFragments(this.fragments);
            this.collectedFragmentsCount = 0;
        }
        resetRoverTrail(this.rover);

        if (this.commandPanelAPI) this.commandPanelAPI.clearSequence();
        this.updateObjectiveMessageForSegment();
        if (this.simulationAPI) {
            this.simulationAPI.drawState(this.rover, this.fragments, this.currentLevelData.labPosition);
            this.simulationAPI.updateFragmentCount(this.collectedFragmentsCount, this.totalFragmentsToCollectThisLevel);
        }
        this.updateCommandPanelUIState();
    }

    handleDirectCommand(commandType) {
        // ... (contenu existant)
        if (this.currentLevelData.gameplayMode === 'directControl' && this.missionActive && this.isSimulating) {
            // console.log(`GameController: Handling direct command: ${commandType}`);
            this.processSingleCommand(commandType);
        }
    }

    async executeProgrammedSequence(sequence) {
        // ... (contenu existant avec logs si besoin)
        console.log("GameController: Executing programmed sequence:", sequence);
        this.isSimulating = true;
        this.updateCommandPanelUIState();
        if (this.simulationAPI) this.simulationAPI.updateStatus('Simulation de séquence en cours...');

        if (this.currentLevelData.gameplayMode === 'sequencePerFragment') {
            if (this.currentSegmentIndex > 0 && this.checkpoints[this.currentSegmentIndex -1]) {
                const previousCheckpoint = this.checkpoints[this.currentSegmentIndex - 1];
                this.rover = createRover(JSON.parse(JSON.stringify(previousCheckpoint.roverState)));
                this.fragments.forEach(f => { 
                    f.collected = previousCheckpoint.collectedFragmentIds.includes(f.id);
                });
                this.collectedFragmentsCount = previousCheckpoint.collectedFragments;
            } else { 
                this.rover = createRover(JSON.parse(JSON.stringify(this.currentLevelData.initialRoverConfig)));
                resetFragments(this.fragments);
                this.collectedFragmentsCount = 0;
            }
            resetRoverTrail(this.rover);
        } else { 
            this.rover = createRover(JSON.parse(JSON.stringify(this.currentLevelData.initialRoverConfig)));
            resetFragments(this.fragments);
            this.collectedFragmentsCount = 0;
            resetRoverTrail(this.rover);
        }
        
        if(this.simulationAPI) {
            this.simulationAPI.updateFragmentCount(this.collectedFragmentsCount, this.totalFragmentsToCollectThisLevel);
            this.simulationAPI.drawState(this.rover, this.fragments, this.currentLevelData.labPosition);
        }

        for (const commandType of sequence) {
            if (!this.isSimulating) {
                console.log("GameController: Simulation interrupted during sequence execution.");
                break;
            }
            if (this.simulationAPI) this.simulationAPI.updateStatus(`Exécution: ${COMMAND_DETAILS[commandType]?.text || commandType}`);
            this.processSingleCommand(commandType);
            await new Promise(resolve => setTimeout(resolve, 350)); 
        }

        if (this.isSimulating) { 
            console.log("GameController: Sequence finished naturally, checking completion.");
            if (this.currentLevelData.gameplayMode === 'sequencePerFragment') {
                this.checkSegmentCompletion();
            } else { 
                this.checkMissionCompletion();
            }
        }
        this.isSimulating = false; 
        this.updateCommandPanelUIState();
    }

    processSingleCommand(commandType) {
        // ... (contenu existant avec logs si besoin)
        const { gridWidth, gridHeight } = this.currentLevelData;
        let commandExecuted = false;

        switch (commandType) {
            case 'cmd_forward':
                if (moveRover(this.rover, gridWidth, gridHeight)) {
                    commandExecuted = true;
                } else {
                     if (this.currentLevelData.gameplayMode === 'directControl' && this.isSimulating && this.simulationAPI) { 
                        this.simulationAPI.updateStatus('Collision avec la bordure ! Mouvement annulé.');
                     }
                }
                break;
            case 'cmd_turn_left':
                turnRoverLeft(this.rover);
                commandExecuted = true;
                break;
            case 'cmd_turn_right':
                turnRoverRight(this.rover);
                commandExecuted = true;
                break;
        }

        if (commandExecuted) {
            const collectedFragmentId = checkFragmentCollision(this.rover, this.fragments);
            if (collectedFragmentId) {
                const fragmentJustCollected = this.fragments.find(f => f.id === collectedFragmentId);
                this.collectedFragmentsCount = this.fragments.filter(f => f.collected).length;
                // console.log(`GameController: Fragment ${fragmentJustCollected.displayId} collected.`);

                const consoleMessage = `Fragment ${fragmentJustCollected.displayId || this.collectedFragmentsCount}/${this.totalFragmentsToCollectThisLevel} collecté en (${fragmentJustCollected.x}, ${fragmentJustCollected.y}).`;
                this.dialogAPI.showDialog({
                    type: DIALOG_TYPES.CONSOLE,
                    title: "Console Ermes - Rapport",
                    message: consoleMessage,
                });

                if (this.simulationAPI) {
                    this.simulationAPI.updateFragmentCount(this.collectedFragmentsCount, this.totalFragmentsToCollectThisLevel);
                }
            }

            if (this.simulationAPI) this.simulationAPI.drawState(this.rover, this.fragments, this.currentLevelData.labPosition);

            if (this.currentLevelData.gameplayMode === 'directControl' && this.missionActive && this.isSimulating) {
                this.checkMissionCompletion();
            }
        }
    }

    checkMissionCompletion() {
        // ... (contenu existant avec logs si besoin)
        console.log("GameController: checkMissionCompletion called.");
        const { labPosition, totalFragmentsRequired, completionMessages } = this.currentLevelData;
        const atLab = this.rover.x === labPosition.x && this.rover.y === labPosition.y;

        if (atLab) {
            if (this.collectedFragmentsCount >= totalFragmentsRequired) {
                console.log("GameController: Mission accomplished!");
                if (this.simulationAPI) this.simulationAPI.updateStatus(completionMessages.success);
                this.missionActive = false; 
                this.isSimulating = false; 
                this.dialogAPI.showDialog({
                    type: DIALOG_TYPES.ELYA,
                    title: `Mission ${this.currentLevelId} Accomplie !`,
                    message: completionMessages.success
                });
            } else {
                console.log("GameController: At lab, but missing fragments.");
                const message = completionMessages.labMissingFragments.replace('{missing}', totalFragmentsRequired - this.collectedFragmentsCount);
                if (this.simulationAPI) this.simulationAPI.updateStatus(message);
                this.dialogAPI.showDialog({ type: DIALOG_TYPES.CONSOLE, title: 'Rapport de Mission', message });
                if (this.currentLevelData.gameplayMode !== 'directControl') {
                    this.isSimulating = false;
                }
            }
        } else {
            if (this.currentLevelData.gameplayMode !== 'directControl') {
                 console.log("GameController: Objective not met (not at lab for sequence mode).");
                 if (this.simulationAPI) this.simulationAPI.updateStatus(completionMessages.objectiveNotMet || 'Objectifs non atteints.');
                 this.isSimulating = false; 
            } else {
                // console.log("GameController: Not at lab in direct control mode, mission continues.");
            }
        }
        this.updateCommandPanelUIState();
    }

    checkSegmentCompletion() {
        // ... (contenu existant avec logs si besoin)
        console.log("GameController: checkSegmentCompletion called for segment", this.currentSegmentIndex);
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
                targetReached = targetFragment.collected; 
            }
        }

        if (targetReached) {
            if (isLabTarget) { 
                if (this.collectedFragmentsCount >= totalFragmentsRequired) {
                    console.log("GameController: Segment 'lab' complete, mission accomplished!");
                    if (this.simulationAPI) this.simulationAPI.updateStatus(completionMessages.success);
                    this.missionActive = false;
                    this.isSimulating = false;
                    this.dialogAPI.showDialog({
                        type: DIALOG_TYPES.ELYA,
                        title: `Mission ${this.currentLevelId} Accomplie !`,
                        message: completionMessages.success
                    });
                } else { 
                    console.log("GameController: Segment 'lab' reached, but missing fragments.");
                    const message = completionMessages.labMissingFragments.replace('{missing}', totalFragmentsRequired - this.collectedFragmentsCount);
                    if (this.simulationAPI) this.simulationAPI.updateStatus(message);
                    this.dialogAPI.showDialog({ type: DIALOG_TYPES.CONSOLE, title: 'Rapport de Segment', message });
                    this.isSimulating = false; 
                }
            } else { 
                const fragmentJustReached = this.fragments.find(f => f.id.endsWith(currentTargetKey.split('_')[1]));
                const fragmentNumberDisplay = fragmentJustReached ? fragmentJustReached.displayId : (parseInt(currentTargetKey.split('_')[1]) + 1);
                console.log(`GameController: Fragment segment ${fragmentNumberDisplay} complete.`);

                const nextTargetIndex = this.currentSegmentIndex + 1;
                let nextTargetDesc = "";
                if (nextTargetIndex < segmentTargets.length) {
                    const nextKey = segmentTargets[nextTargetIndex];
                    if (nextKey === 'lab') nextTargetDesc = "le Laboratoire";
                    else {
                        const nextFragIndex = parseInt(nextKey.split('_')[1]);
                        const nextFrag = this.fragments[nextFragIndex];
                        nextTargetDesc = `Fragment ${nextFrag ? nextFrag.displayId : nextFragIndex + 1}`;
                    }
                }

                const checkpointMsg = completionMessages.checkpointReached
                    .replace('{fragmentNumber}', fragmentNumberDisplay)
                    .replace('{nextTarget}', nextTargetDesc || "la destination finale");

                if (this.simulationAPI) this.simulationAPI.updateStatus(checkpointMsg);
                this.dialogAPI.showDialog({ type: DIALOG_TYPES.CONSOLE, title: "Checkpoint !", message: checkpointMsg });

                this.checkpoints.push({
                    segmentIndex: this.currentSegmentIndex,
                    roverState: JSON.parse(JSON.stringify(this.rover)), 
                    collectedFragments: this.collectedFragmentsCount,
                    collectedFragmentIds: this.fragments.filter(f => f.collected).map(f => f.id)
                });
                this.currentSegmentIndex++;
                if (this.commandPanelAPI) this.commandPanelAPI.clearSequence();
                this.isSimulating = false;

                if (this.currentSegmentIndex < segmentTargets.length) {
                    this.updateObjectiveMessageForSegment();
                } else { 
                     if (this.simulationAPI) this.simulationAPI.updateStatus("Tous les segments prévus terminés.");
                }
            }
        } else { 
             console.log("GameController: Segment objective not met.");
             if (this.simulationAPI) this.simulationAPI.updateStatus(completionMessages.objectiveNotMet || 'Objectif du segment non atteint.');
             this.isSimulating = false; 
        }
        this.updateCommandPanelUIState();
    }

    areAllObjectivesMetForAnalysis() {
        // ... (contenu existant)
        if (!this.currentLevelData || this.missionActive) return false;

        const { labPosition, totalFragmentsRequired, gameplayMode, segmentTargets } = this.currentLevelData;
        const atLab = this.rover.x === labPosition.x && this.rover.y === labPosition.y;
        const allFragmentsCollected = this.collectedFragmentsCount >= totalFragmentsRequired;

        if (gameplayMode === 'sequencePerFragment') {
            return this.currentSegmentIndex >= segmentTargets.length && atLab && allFragmentsCollected;
        }
        return atLab && allFragmentsCollected;
    }
    
    handleAnalyzeFragments() {
        // ... (contenu existant avec logs si besoin)
        console.log("GameController: handleAnalyzeFragments called.");
        if (!this.areAllObjectivesMetForAnalysis()) {
            if (this.commandPanelAPI) this.commandPanelAPI.setAnalyzeSpinner(false);
            this.dialogAPI.showDialog({ type: DIALOG_TYPES.CONSOLE, title: "Analyse Impossible", message: "Les conditions pour l'analyse ne sont pas remplies (tous fragments collectés et au laboratoire)." });
            return;
        }

        if (this.commandPanelAPI) this.commandPanelAPI.setAnalyzeSpinner(true);
        if (this.simulationAPI) this.simulationAPI.updateStatus('Analyse des fragments en cours...');

        setTimeout(() => { 
            const analysisText = this.currentLevelData.elyaAnalysisText ||
                                 (this.currentLevelId > 0 && this.currentLevelId <= DEFAULT_ELYA_MESSAGES.length ? DEFAULT_ELYA_MESSAGES[this.currentLevelId - 1] : null) ||
                                 "Analyse des fragments terminée. Aucune donnée spécifique pour ce niveau.";
            console.log("GameController: Displaying analysis result.");
            this.dialogAPI.showDialog({
                type: DIALOG_TYPES.ELYA,
                title: `Rapport d'Elya - Niveau ${this.currentLevelId}`,
                message: analysisText,
                actions: [{ text: "Mission Suivante", action: () => { this.dialogAPI.hideDialog(); this.proceedToNextLevel(); } }]
            });

            if (this.commandPanelAPI) this.commandPanelAPI.setAnalyzeSpinner(false);
        }, 1000); 
    }
    
    proceedToNextLevel() {
        // ... (contenu existant avec logs si besoin)
        console.log("GameController: proceedToNextLevel called. Current level was:", this.currentLevelId);
        this.currentLevelId++;
        console.log("GameController: Attempting to load next level:", this.currentLevelId);
        
        import(`../../levels/level${this.currentLevelId}.js`)
            .then(module => {
                if (module[`level${this.currentLevelId}Data`]) {
                    console.log(`GameController: Data for level ${this.currentLevelId} found.`);
                    this.dialogAPI.showDialog({
                        type: DIALOG_TYPES.CONSOLE,
                        title: "Progression",
                        message: `Chargement du niveau ${this.currentLevelId}...`,
                    });
                    setTimeout(() => {
                        if(this.dialogAPI) this.dialogAPI.hideDialog();
                        this.loadLevel(this.currentLevelId);
                    }, 1500);
                } else {
                     console.warn(`GameController: Fichier de niveau level${this.currentLevelId}.js trouvé mais n'exporte pas level${this.currentLevelId}Data.`);
                     throw new Error("Données de niveau non exportées correctement."); 
                }
            })
            .catch(error => { 
                console.log(`GameController: Niveau ${this.currentLevelId} non trouvé ou erreur de chargement. Fin des missions. Erreur:`, error.message);
                if (this.simulationAPI) this.simulationAPI.updateStatus('Toutes les missions sont terminées ! Bravo !');
                this.dialogAPI.showDialog({
                    type: DIALOG_TYPES.ELYA,
                    title: "Fin de la Mission Zéro",
                    message: "Félicitations, Commandant ! Vous avez complété toutes les missions de la Phase Zéro. Ermès est prêt pour des explorations plus lointaines et complexes."
                });
                this.missionActive = false;
                this.isSimulating = false;
                this.updateCommandPanelUIState();
            });
    }
}