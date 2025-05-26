// modules/command-panel/command-panel.js
import { COMMAND_DETAILS } from '../utils/constants.js';

let commandPanelTitleEl;
let dPadButtons = {};
let programmedSequenceDisplayEl;
let sequenceTitleEl; // To hide/show the "Séquence Programmée:" title
let analyzeFragmentsButtonEl;
let analyzeSpinnerEl;
let startSimulationButtonEl;
let resetProgramButtonEl;

let currentSequence = [];
let gameControllerInstance; // Will be set by the GameController or main loader

// API to be returned by loadCommandPanel
const commandPanelAPI = {
    updateButtonStates,
    clearSequence,
    renderProgrammedSequence, // Expose if external refresh is needed
    setAnalyzeSpinner,
    getSequence
};

async function loadCommandPanel(containerElement, controller) {
    gameControllerInstance = controller; // Store reference to GameController
    try {
        const response = await fetch('./modules/command-panel/command-panel.html');
        if (!response.ok) {
            throw new Error(`Failed to load command-panel.html: ${response.statusText}`);
        }
        const htmlContent = await response.text();
        containerElement.innerHTML = htmlContent;
        initializeCommandPanelElements();
        setupEventListeners();
        // Initial state update, assuming gameControllerInstance is available and has getGameState
        if (gameControllerInstance && typeof gameControllerInstance.getGameState === 'function') {
            updateButtonStates(gameControllerInstance.getGameState());
        } else {
            // Fallback initial state if gameControllerInstance is not ready (should not happen with current main.js flow)
            updateButtonStates({ missionActive: false, isSimulating: false, gameplayMode: null, allSegmentsDoneForAnalysis: false, initialDialogActive: true });
        }
    } catch (error) {
        console.error("Error loading command panel module:", error);
        containerElement.innerHTML = "<p class='text-red-500'>Error loading command panel.</p>";
    }
    return commandPanelAPI;
}

function initializeCommandPanelElements() {
    commandPanelTitleEl = document.getElementById('commandPanelTitle');
    dPadButtons.forward = document.getElementById('cmd_btn_forward');
    dPadButtons.left = document.getElementById('cmd_btn_turn_left');
    dPadButtons.right = document.getElementById('cmd_btn_turn_right');
    // dPadButtons.backward = document.getElementById('cmd_btn_backward'); // If you add it

    programmedSequenceDisplayEl = document.getElementById('programmedSequenceDisplay');
    // Assuming the h3 for "Séquence Programmée:" is the second h3 in the programmingPanel section
    sequenceTitleEl = document.querySelector('#programmingPanel > div:nth-of-type(2) > h3');


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

    if (startSimulationButtonEl) {
        startSimulationButtonEl.addEventListener('click', () => {
            if (gameControllerInstance) gameControllerInstance.handleStartSimulation(currentSequence);
        });
    }

    if (resetProgramButtonEl) {
        resetProgramButtonEl.addEventListener('click', () => {
            if (gameControllerInstance) gameControllerInstance.handleResetProgram();
            // clearSequence(); // GameController's loadLevel or resetCurrentSegment will call commandPanelAPI.clearSequence
        });
    }

    if (analyzeFragmentsButtonEl) {
        analyzeFragmentsButtonEl.addEventListener('click', () => {
            if (gameControllerInstance) gameControllerInstance.handleAnalyzeFragments();
        });
    }
}

function handleDpadCommand(commandType) {
    if (!gameControllerInstance) return;

    const { gameplayMode, isSimulating, missionActive, initialDialogActive } = gameControllerInstance.getGameState();

    if (!missionActive || initialDialogActive) return; // No commands if mission not active or dialog is up

    if (gameplayMode === 'directControl') {
        if (isSimulating) { // Direct control is active
            gameControllerInstance.handleDirectCommand(commandType);
        }
    } else if (gameplayMode === 'sequencePerFragment' || gameplayMode === 'fullSequence') {
        if (!isSimulating) { // Can only add commands if sequence is not running
            addCommandToSequence(commandType);
        }
    }
}

function addCommandToSequence(commandType) {
    if (!COMMAND_DETAILS[commandType]) return;
    currentSequence.push(commandType);
    renderProgrammedSequence();
    // Update button states, especially for "LANCER SÉQUENCE" which depends on sequence length
    if (gameControllerInstance) updateButtonStates(gameControllerInstance.getGameState());
}

function clearSequence() {
    currentSequence = [];
    renderProgrammedSequence();
    if (gameControllerInstance) updateButtonStates(gameControllerInstance.getGameState());
}

function getSequence() {
    return [...currentSequence];
}

function renderProgrammedSequence() {
    if (!programmedSequenceDisplayEl) return;
    programmedSequenceDisplayEl.innerHTML = ''; // Clear previous icons
    currentSequence.forEach((commandType, index) => {
        const commandDetail = COMMAND_DETAILS[commandType];
        if (commandDetail && commandDetail.icon) {
            const iconWrapper = document.createElement('div');
            iconWrapper.className = 'programmed-command-icon relative group p-1 bg-slate-500 rounded inline-flex items-center'; // Added for potential remove button

            const iconSpan = document.createElement('span');
            iconSpan.textContent = commandDetail.icon;
            iconSpan.className = 'text-2xl';
            iconWrapper.appendChild(iconSpan);

            // Optional: Add a small remove button on hover for each command
            const removeBtn = document.createElement('button');
            removeBtn.textContent = '✕';
            removeBtn.className = 'absolute -top-1 -right-1 bg-red-600 text-white rounded-full text-xs w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity';
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                currentSequence.splice(index, 1);
                renderProgrammedSequence();
                 if (gameControllerInstance) updateButtonStates(gameControllerInstance.getGameState());
            };
            iconWrapper.appendChild(removeBtn);

            programmedSequenceDisplayEl.appendChild(iconWrapper);
        }
    });
}

function updateButtonStates({ missionActive, isSimulating, gameplayMode, currentSegmentIndex, allSegmentsDoneForAnalysis, initialDialogActive }) {
    if (!commandPanelTitleEl) return; // Elements not initialized yet

    const isSequenceMode = gameplayMode === 'sequencePerFragment' || gameplayMode === 'fullSequence';

    // Panel Title and Sequence Display visibility
    if (gameplayMode === 'directControl') {
        commandPanelTitleEl.textContent = "Pilotage Direct";
        if (programmedSequenceDisplayEl) programmedSequenceDisplayEl.classList.add('hidden');
        if (sequenceTitleEl) sequenceTitleEl.classList.add('hidden');
    } else if (isSequenceMode) {
        commandPanelTitleEl.textContent = "Programmation Séquentielle";
        if (programmedSequenceDisplayEl) programmedSequenceDisplayEl.classList.remove('hidden');
        if (sequenceTitleEl) sequenceTitleEl.classList.remove('hidden');
    } else { // Default or before level load
        commandPanelTitleEl.textContent = "Panneau de Commande";
        // Default to showing sequence programming elements, or hide if preferred initially
        if (programmedSequenceDisplayEl) programmedSequenceDisplayEl.classList.remove('hidden');
        if (sequenceTitleEl) sequenceTitleEl.classList.remove('hidden');
    }

    // Universal disable if initial dialog is active
    if (initialDialogActive) {
        Object.values(dPadButtons).forEach(button => { if (button) button.disabled = true; });
        if(startSimulationButtonEl) startSimulationButtonEl.disabled = true;
        if(resetProgramButtonEl) resetProgramButtonEl.disabled = true;
        if(analyzeFragmentsButtonEl) analyzeFragmentsButtonEl.disabled = true;
        return;
    }

    // D-Pad Buttons
    let dPadDisabled = !missionActive; // Base: disabled if mission not active
    if (missionActive) {
        if (isSequenceMode && isSimulating) { // Sequence running for sequence modes
            dPadDisabled = true;
        } else if (gameplayMode === 'directControl' && !isSimulating) { // Direct control, but "COMMENCER MISSION" not yet pressed
            dPadDisabled = true;
        } else { // Sequence programming (not simulating) OR direct control active (isSimulating is true)
            dPadDisabled = false;
        }
    }
    Object.values(dPadButtons).forEach(button => {
        if (button) button.disabled = dPadDisabled;
    });

    // Start Simulation / Commence Mission Button
    if (startSimulationButtonEl) {
        if (gameplayMode === 'directControl') {
            startSimulationButtonEl.textContent = isSimulating ? "PILOTAGE ACTIF" : "COMMENCER MISSION";
            startSimulationButtonEl.disabled = !missionActive || isSimulating; // Disabled if not active or already in "PILOTAGE ACTIF"
        } else { // Sequence Modes
            startSimulationButtonEl.textContent = "LANCER SÉQUENCE";
            startSimulationButtonEl.disabled = !missionActive || isSimulating || currentSequence.length === 0;
        }
    }
    
    // Reset Program Button
    if (resetProgramButtonEl) {
        resetProgramButtonEl.disabled = !missionActive && !isSimulating; // Can reset if mission active OR if direct control is active (isSimulating)
                                        // Prevent reset during sequence execution for sequence modes.
        if (isSequenceMode && isSimulating) {
            resetProgramButtonEl.disabled = true;
        }


        if (gameplayMode === 'sequencePerFragment' && currentSegmentIndex > 0) {
            resetProgramButtonEl.textContent = "RÉINIT. SEGMENT/NIVEAU";
        } else {
            resetProgramButtonEl.textContent = "RÉINITIALISER";
        }
    }

    // Analyze Fragments Button
    if (analyzeFragmentsButtonEl) {
        analyzeFragmentsButtonEl.disabled = !allSegmentsDoneForAnalysis || isSimulating || !missionActive;
        // Correction: disable if mission is active but not yet completed to analysis stage
        if (missionActive && !allSegmentsDoneForAnalysis) {
             analyzeFragmentsButtonEl.disabled = true;
        }
    }
}

function setAnalyzeSpinner(isAnalyzing) {
    if (analyzeSpinnerEl) {
        analyzeSpinnerEl.style.display = isAnalyzing ? 'inline-block' : 'none';
    }
}

export { loadCommandPanel };
// No need to export individual functions like clearSequence if they are part of the returned API object
// and GameController calls them via that API object.