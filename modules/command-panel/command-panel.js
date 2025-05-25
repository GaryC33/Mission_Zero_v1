// modules/command-panel/command-panel.js
// import { EventBus } from '../utils/event-bus.js'; // Si vous utilisez l'EventBus
import { COMMAND_DETAILS } from '../utils/constants.js'; // Pour les icônes

let commandPanelTitleEl;
let dPadButtons = {};
let programmedSequenceDisplayEl;
let analyzeFragmentsButtonEl;
let analyzeSpinnerEl;
let startSimulationButtonEl;
let resetProgramButtonEl;

let currentSequence = [];
let gameControllerInstance; // Sera défini par le GameController principal

async function loadCommandPanel(containerElement, controller) {
    gameControllerInstance = controller; // Référence au GameController
    try {
        const response = await fetch('./modules/command-panel/command-panel.html');
        if (!response.ok) {
            throw new Error(`Failed to load command-panel.html: ${response.statusText}`);
        }
        const htmlContent = await response.text();
        containerElement.innerHTML = htmlContent;
        initializeCommandPanelElements();
        setupEventListeners();
        updateButtonStates({ missionActive: false, isSimulating: false, gameplayMode: null }); // Initial state
    } catch (error) {
        console.error("Error loading command panel module:", error);
        containerElement.innerHTML = "<p class='text-red-500'>Error loading command panel.</p>";
    }
}

function initializeCommandPanelElements() {
    commandPanelTitleEl = document.getElementById('commandPanelTitle');
    dPadButtons.forward = document.getElementById('cmd_btn_forward');
    dPadButtons.left = document.getElementById('cmd_btn_turn_left');
    dPadButtons.right = document.getElementById('cmd_btn_turn_right');
    // dPadButtons.backward = document.getElementById('cmd_btn_backward'); // Si vous l'ajoutez

    programmedSequenceDisplayEl = document.getElementById('programmedSequenceDisplay');
    analyzeFragmentsButtonEl = document.getElementById('analyzeFragmentsButton');
    analyzeSpinnerEl = document.getElementById('analyzeSpinner');
    startSimulationButtonEl = document.getElementById('startSimulationButton');
    resetProgramButtonEl = document.getElementById('resetProgramButton');
}

function setupEventListeners() {
    Object.values(dPadButtons).forEach(button => {
        if (button) {
            button.addEventListener('click', () => handleDpadCommand(button.dataset.commandType));
        }
    });

    startSimulationButtonEl.addEventListener('click', () => {
        // Si on utilise un EventBus: eventBus.emit('startSimulationClicked', currentSequence);
        if (gameControllerInstance) gameControllerInstance.handleStartSimulation(currentSequence);
    });

    resetProgramButtonEl.addEventListener('click', () => {
        // eventBus.emit('resetProgramClicked');
        if (gameControllerInstance) gameControllerInstance.handleResetProgram();
        clearSequence(); // Le CommandPanel gère sa propre séquence
    });

    analyzeFragmentsButtonEl.addEventListener('click', () => {
        // eventBus.emit('analyzeFragmentsClicked');
        if (gameControllerInstance) gameControllerInstance.handleAnalyzeFragments();
    });
}

function handleDpadCommand(commandType) {
    if (!gameControllerInstance) return;

    const { gameplayMode, isSimulating, missionActive } = gameControllerInstance.getGameState(); // Le GC doit exposer cet état

    if (!missionActive || isSimulating) return;

    if (gameplayMode === 'directControl') {
        // eventBus.emit('directControlCommand', commandType);
        gameControllerInstance.handleDirectCommand(commandType);
    } else if (gameplayMode === 'sequencePerFragment' || gameplayMode === 'fullSequence') {
        addCommandToSequence(commandType);
    }
}

function addCommandToSequence(commandType) {
    if (!COMMAND_DETAILS[commandType]) return;
    currentSequence.push(commandType);
    renderProgrammedSequence();
}

function clearSequence() {
    currentSequence = [];
    renderProgrammedSequence();
}

function getSequence() {
    return [...currentSequence];
}

function renderProgrammedSequence() {
    if (!programmedSequenceDisplayEl) return;
    programmedSequenceDisplayEl.innerHTML = ''; // Clear previous icons
    currentSequence.forEach(commandType => {
        const commandDetail = COMMAND_DETAILS[commandType];
        if (commandDetail && commandDetail.icon) {
            const iconSpan = document.createElement('span');
            iconSpan.textContent = commandDetail.icon;
            iconSpan.className = 'text-2xl p-1 bg-slate-500 rounded'; // Style pour les icônes
            programmedSequenceDisplayEl.appendChild(iconSpan);
        }
    });
}

// Cette fonction sera appelée par le GameController pour mettre à jour l'état des boutons
function updateButtonStates({ missionActive, isSimulating, collectedFragments, totalFragmentsRequired, gameplayMode, currentSegmentIndex, segmentTargetsLength, allSegmentsDoneForAnalysis }) {
    const isSequenceMode = gameplayMode === 'sequencePerFragment' || gameplayMode === 'fullSequence';

    // Titre du panneau
    if (gameplayMode === 'directControl') {
        commandPanelTitleEl.textContent = "Pilotage Direct";
        if(programmedSequenceDisplayEl) programmedSequenceDisplayEl.style.display = 'none'; // Cacher la séquence
         if(document.querySelector('#programmingPanel h3:nth-of-type(2)')) document.querySelector('#programmingPanel h3:nth-of-type(2)').style.display = 'none';


    } else if (isSequenceMode) {
        commandPanelTitleEl.textContent = "Programmation Séquentielle";
        if(programmedSequenceDisplayEl) programmedSequenceDisplayEl.style.display = 'flex'; // Afficher la séquence
        if(document.querySelector('#programmingPanel h3:nth-of-type(2)')) document.querySelector('#programmingPanel h3:nth-of-type(2)').style.display = 'block';


    } else {
        commandPanelTitleEl.textContent = "Panneau de Commande";
        if(programmedSequenceDisplayEl) programmedSequenceDisplayEl.style.display = 'flex';
        if(document.querySelector('#programmingPanel h3:nth-of-type(2)')) document.querySelector('#programmingPanel h3:nth-of-type(2)').style.display = 'block';
    }


    // Boutons D-Pad
    Object.values(dPadButtons).forEach(button => {
        if (button) {
            button.disabled = !missionActive || isSimulating;
        }
    });
     if (missionActive && gameplayMode === 'directControl' && !isSimulating) { // Pour le mode direct, D-Pad actif si mission active et pas en simulation (après clic "Commencer Mission")
        Object.values(dPadButtons).forEach(btn => { if(btn) btn.disabled = false; });
    } else if (missionActive && isSequenceMode && !isSimulating){
        Object.values(dPadButtons).forEach(btn => { if(btn) btn.disabled = false; });
    } else { // Disable D-Pad if no mission, or simulating, or direct mode not yet "started"
        Object.values(dPadButtons).forEach(btn => { if(btn) btn.disabled = true; });
    }


    // Bouton "Lancer Simulation/Commencer Mission"
    if (gameplayMode === 'directControl') {
        startSimulationButtonEl.textContent = isSimulating ? "PILOTAGE ACTIF" : "COMMENCER MISSION";
        startSimulationButtonEl.disabled = !missionActive || isSimulating;
    } else {
        startSimulationButtonEl.textContent = "LANCER SÉQUENCE";
        startSimulationButtonEl.disabled = !missionActive || isSimulating || currentSequence.length === 0;
    }
    
    // Bouton "Réinitialiser"
    resetProgramButtonEl.disabled = !missionActive || isSimulating;
    if (gameplayMode === 'sequencePerFragment' && currentSegmentIndex > 0) {
        resetProgramButtonEl.textContent = "RÉINIT. SEGMENT/NIVEAU";
    } else {
        resetProgramButtonEl.textContent = "RÉINITIALISER";
    }

    // Bouton "Analyser les Fragments"
    // Devrait être activé par le GameController lorsque les conditions sont remplies (ex: tous fragments collectés ET au labo)
    analyzeFragmentsButtonEl.disabled = !allSegmentsDoneForAnalysis || isSimulating;

    // Spinner d'analyse (géré par le GameController lors de l'appel API)
    // analyzeSpinnerEl.style.display = 'none';
}

function setAnalyzeSpinner(isAnalyzing) {
    analyzeSpinnerEl.style.display = isAnalyzing ? 'inline-block' : 'none';
}


export { loadCommandPanel, clearSequence, renderProgrammedSequence, updateButtonStates, getSequence, setAnalyzeSpinner };