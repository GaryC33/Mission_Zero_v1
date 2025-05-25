// script.js

// --- DOM Elements ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const simulationStatusEl = document.getElementById('simulationStatus');
const collectedFragmentsUI = document.getElementById('collectedFragmentsUI');
const analyzeFragmentsButton = document.getElementById('analyzeFragmentsButton');
const analyzeSpinner = document.getElementById('analyzeSpinner');
const startSimulationButton = document.getElementById('startSimulation');
const resetProgramButton = document.getElementById('resetProgram');
const programmedSequenceContainer = document.getElementById('programmedSequence');
const elyaModal = document.getElementById('elyaModal');
const elyaMessageText = document.getElementById('elyaMessageText');
const elyaModalTitle = document.getElementById('elyaModalTitle');
const programmingPanelTitle = document.querySelector('#programmingPanel h2'); // To change title

// --- Game State & Configuration ---
let TILE_SIZE = 40; // Default, will be adjusted
let rover = {}; // Will be populated from level data
let sphereFragments = [];
let collectedFragmentsCount = 0;
let currentLevelId = 1;
let currentLevelData = null;
let isSimulating = false; // True when rover is actively moving (direct or sequence)
let missionActive = false; // True when a level is loaded and ready/in-progress

// For Level 2 (sequencePerFragment)
let checkpoints = [];
let currentSegmentIndex = 0;

// Fallback Elya messages if API fails or level has no specific message
const defaultElyaMessages = [
  "Excellent travail, Isaac ! Les fragments semblent émettre une sorte d'énergie. Ermès la capte. Poursuis les tests.",
  "Fascinant. Les données entrantes sont de plus en plus complexes. Ces Sphères... elles ne sont pas inertes.",
  "Chaque fragment amplifie le signal. Je crois discerner une structure, un message... Il nous en faut plus !",
  "Les tests sont concluants. Ermès est prêt pour des missions plus complexes. Le mystère des Sphères reste entier."
];

const commandDetails = {
  cmd_forward:    { text: 'Avancer',          color: 'bg-blue-500',  icon: '⬆️' },
  cmd_turn_left:  { text: 'Tourner à Gauche', color: 'bg-yellow-500', icon: '⬅️' },
  cmd_turn_right: { text: 'Tourner à Droite', color: 'bg-green-500',  icon: '➡️' }
};

// --- Level Loading and Initialization ---
async function loadLevel(levelId) {
  try {
    const levelModule = await import(`./levels/level${levelId}.js`);
    currentLevelData = levelModule[`level${levelId}Data`];
    if (!currentLevelData) throw new Error(`Level ${levelId} data not found.`);
    await initializeMission();
  } catch (error) {
    console.error(`Error loading level ${levelId}:`, error);
    showModalMessage(`Impossible de charger le niveau ${levelId}. Vérifiez la console.`, "Erreur Critique");
    // Potentially disable game controls here
  }
}

async function initializeMission() {
  isSimulating = false;
  missionActive = true;
  rover = JSON.parse(JSON.stringify(currentLevelData.initialRoverConfig)); // Deep copy
  if (!rover.trail) rover.trail = [{x: rover.x, y: rover.y}]; else rover.trail = [{x: rover.x, y: rover.y}];


  collectedFragmentsCount = 0;
  sphereFragments = [];
  generateFragments();
  
  checkpoints = [];
  currentSegmentIndex = 0;

  updateCollectedFragmentsUI();
  analyzeFragmentsButton.disabled = true;
  startSimulationButton.disabled = false;
  resetProgramButton.disabled = false;
  programmedSequenceContainer.innerHTML = '';

  // Adapt UI for gameplay mode
  const commandButtons = document.querySelectorAll('[data-command-type]');
  if (currentLevelData.gameplayMode === 'directControl') {
    startSimulationButton.textContent = 'COMMENCER MISSION';
    commandButtons.forEach(btn => btn.disabled = true); // Disabled until mission starts
    programmingPanelTitle.textContent = "Panneau de Pilotage Direct";

  } else if (currentLevelData.gameplayMode === 'sequencePerFragment') {
    startSimulationButton.textContent = 'LANCER SÉQUENCE';
    commandButtons.forEach(btn => btn.disabled = false);
    programmingPanelTitle.textContent = "Panneau de Programmation";
    updateSegmentObjective();
  } else {
    startSimulationButton.textContent = 'LANCER SIMULATION';
    commandButtons.forEach(btn => btn.disabled = false);
    programmingPanelTitle.textContent = "Panneau de Commande";
  }
  
  simulationStatusEl.textContent = currentLevelData.missionObjective || `Niveau ${currentLevelData.levelId}. Prêt.`;
  resizeCanvas(); // This will also call drawGame
  drawGame();
}

function generateFragments() {
    sphereFragments = [];
    const config = currentLevelData.fragmentConfig;
    const { gridWidth, gridHeight, labPosition, initialRoverConfig } = currentLevelData;

    if (config.type === 'random') {
        const avoidPositions = [...(config.avoid || []), labPosition, {x: initialRoverConfig.x, y: initialRoverConfig.y}];
        let attempts = 0;
        while (sphereFragments.length < config.count && attempts < 100) {
            const x = Math.floor(Math.random() * gridWidth);
            const y = Math.floor(Math.random() * gridHeight);
            const isInvalidPosition = avoidPositions.some(p => p.x === x && p.y === y) ||
                                    sphereFragments.some(f => f.x === x && f.y === y);
            if (!isInvalidPosition) {
                sphereFragments.push({ id: sphereFragments.length, x, y, collected: false, color: config.color });
            }
            attempts++;
        }
        if (sphereFragments.length < config.count) {
            console.warn("Could not place all random fragments, try fixed positions or larger grid.");
            // Fallback: place remaining fragments at fixed distinct positions if possible
            for (let i = sphereFragments.length; i < config.count; i++) {
                for (let rX = 0; rX < gridWidth; rX++) {
                    let placed = false;
                    for (let rY = 0; rY < gridHeight; rY++) {
                        const isInvalid = avoidPositions.some(p => p.x === rX && p.y === rY) ||
                                        sphereFragments.some(f => f.x === rX && f.y === rY);
                        if (!isInvalid) {
                            sphereFragments.push({ id: sphereFragments.length, x: rX, y: rY, collected: false, color: config.color });
                            placed = true;
                            break;
                        }
                    }
                    if (placed) break;
                }
            }
        }
    } else if (config.type === 'fixed') {
        config.positions.forEach((pos, index) => {
            sphereFragments.push({ id: index, x: pos.x, y: pos.y, collected: false, color: config.color });
        });
    }
}


// --- Drawing Functions ---
function drawGrid() {
  ctx.strokeStyle = '#2D3748'; // Grid line color
  ctx.lineWidth = 1;
  for (let x = 0; x <= currentLevelData.gridWidth; x++) {
    ctx.beginPath();
    ctx.moveTo(x * TILE_SIZE, 0);
    ctx.lineTo(x * TILE_SIZE, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= currentLevelData.gridHeight; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * TILE_SIZE);
    ctx.lineTo(canvas.width, y * TILE_SIZE);
    ctx.stroke();
  }
}

function drawLab() {
  const lab = currentLevelData.labPosition;
  ctx.fillStyle = 'rgba(56, 161, 105, 0.7)'; // Lab color with some transparency
  ctx.fillRect(lab.x * TILE_SIZE, lab.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  ctx.strokeStyle = '#2F855A'; // Darker green border for lab
  ctx.lineWidth = 2;
  ctx.strokeRect(lab.x * TILE_SIZE, lab.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = '#EDF2F7'; // Text color for "LAB"
  ctx.font = `bold ${Math.max(10, TILE_SIZE / 3.5)}px Orbitron`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LAB', lab.x * TILE_SIZE + TILE_SIZE / 2, lab.y * TILE_SIZE + TILE_SIZE / 2);
}

function drawSphereFragments() {
  sphereFragments.forEach(fragment => {
    if (!fragment.collected) {
      ctx.fillStyle = fragment.color || '#F6E05E'; // Default to yellow if no color
      ctx.beginPath();
      ctx.arc(fragment.x * TILE_SIZE + TILE_SIZE / 2, fragment.y * TILE_SIZE + TILE_SIZE / 2, TILE_SIZE / 3, 0, Math.PI * 2);
      ctx.fill();
      // Highlight for fragment
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(fragment.x * TILE_SIZE + TILE_SIZE / 2 - TILE_SIZE * 0.07, fragment.y * TILE_SIZE + TILE_SIZE / 2 - TILE_SIZE * 0.07, TILE_SIZE / 9, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function drawRover() {
  if (!rover || typeof rover.x === 'undefined') return; // Guard if rover is not initialized

  ctx.save();
  const centerX = rover.x * TILE_SIZE + TILE_SIZE / 2;
  const centerY = rover.y * TILE_SIZE + TILE_SIZE / 2;
  ctx.translate(centerX, centerY);
  ctx.rotate(rover.angle * Math.PI / 180);

  // Rover body
  ctx.fillStyle = rover.color || '#63B3ED'; // Default blue if no color
  ctx.fillRect(-TILE_SIZE * 0.4, -TILE_SIZE * 0.25, TILE_SIZE * 0.8, TILE_SIZE * 0.5); // Main body

  // Wheels
  const wheelRadius = TILE_SIZE * 0.12;
  const wheelOffsetY = TILE_SIZE * 0.25;
  const wheelOffsetX = TILE_SIZE * 0.35;
  ctx.fillStyle = '#A0AEC0'; // Wheel color
  ctx.beginPath(); ctx.arc(-wheelOffsetX, -wheelOffsetY, wheelRadius, 0, Math.PI * 2); ctx.fill(); // Top-left
  ctx.beginPath(); ctx.arc(wheelOffsetX, -wheelOffsetY, wheelRadius, 0, Math.PI * 2); ctx.fill();  // Top-right
  ctx.beginPath(); ctx.arc(-wheelOffsetX, wheelOffsetY, wheelRadius, 0, Math.PI * 2); ctx.fill();  // Bottom-left
  ctx.beginPath(); ctx.arc(wheelOffsetX, wheelOffsetY, wheelRadius, 0, Math.PI * 2); ctx.fill();   // Bottom-right
  
  // Rover "headlight" or sensor
  ctx.fillStyle = '#FBBF24'; // Sensor color (amber)
  ctx.fillRect(TILE_SIZE * 0.3, -TILE_SIZE * 0.05, TILE_SIZE * 0.15, TILE_SIZE * 0.1); // Small rectangle at the front

  ctx.restore();

  // Draw trail
  if (rover.trail && rover.trail.length > 1) {
    ctx.strokeStyle = 'rgba(66, 153, 225, 0.5)'; // Trail color (semi-transparent blue)
    ctx.lineWidth = Math.max(1, TILE_SIZE * 0.075);
    ctx.beginPath();
    ctx.moveTo(rover.trail[0].x * TILE_SIZE + TILE_SIZE / 2, rover.trail[0].y * TILE_SIZE + TILE_SIZE / 2);
    for (let i = 1; i < rover.trail.length; i++) {
      ctx.lineTo(rover.trail[i].x * TILE_SIZE + TILE_SIZE / 2, rover.trail[i].y * TILE_SIZE + TILE_SIZE / 2);
    }
    ctx.stroke();
  }
}

function drawGame() {
  if (!currentLevelData) return; // Don't draw if no level is loaded
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawLab();
  drawSphereFragments();
  drawRover();
}

// --- UI Update Functions ---
function updateCollectedFragmentsUI() {
  if (!currentLevelData) return;
  collectedFragmentsUI.textContent = `Fragments: ${collectedFragmentsCount} / ${currentLevelData.totalFragmentsRequired}`;
}

function updateSimulationStatus(message) {
  simulationStatusEl.textContent = message;
}

function updateSegmentObjective() {
    if (currentLevelData.gameplayMode !== 'sequencePerFragment' || !currentLevelData.segmentTargets) return;
    
    const targetKey = currentLevelData.segmentTargets[currentSegmentIndex];
    let targetDescription = "";

    if (targetKey === 'lab') {
        targetDescription = "le Laboratoire";
    } else if (targetKey && targetKey.startsWith('fragment_')) {
        const fragmentIndex = parseInt(targetKey.split('_')[1]);
        if (sphereFragments[fragmentIndex]) {
            targetDescription = `Fragment ${fragmentIndex + 1} (en ${sphereFragments[fragmentIndex].x},${sphereFragments[fragmentIndex].y})`;
        } else {
            targetDescription = `Fragment ${fragmentIndex + 1}`;
        }
    }
    
    if (currentSegmentIndex < checkpoints.length) { // If resuming from a checkpoint
         simulationStatusEl.textContent = `Reprise au Checkpoint. Programmez vers ${targetDescription}.`;
    } else {
         simulationStatusEl.textContent = `Programmez la séquence vers ${targetDescription}.`;
    }
}


// --- Command Handling ---
function addCommandToSequence(commandType) {
  if (isSimulating || !missionActive || currentLevelData.gameplayMode === 'directControl') return;

  const detail = commandDetails[commandType];
  if (!detail) return;

  const commandElement = document.createElement('div');
  commandElement.className = `programmed-command ${detail.color.replace('bg-', 'border-')} border-l-4 text-gray-200 p-2 my-1 rounded shadow flex justify-between items-center`;
  commandElement.dataset.commandType = commandType;

  const commandText = document.createElement('span');
  commandText.textContent = `${detail.icon} ${detail.text}`;
  commandText.className = 'orbitron';
  commandElement.appendChild(commandText);

  const removeButton = document.createElement('button');
  removeButton.textContent = '✕';
  removeButton.className = 'ml-3 px-2 py-0.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded-sm orbitron';
  removeButton.onclick = () => commandElement.remove();
  commandElement.appendChild(removeButton);

  programmedSequenceContainer.appendChild(commandElement);
}

document.querySelectorAll('[data-command-type]').forEach(button => {
    button.addEventListener('click', () => {
        if (currentLevelData && currentLevelData.gameplayMode !== 'directControl' && missionActive && !isSimulating) {
            addCommandToSequence(button.dataset.commandType);
        } else if (currentLevelData && currentLevelData.gameplayMode === 'directControl' && missionActive && !isSimulating) {
            // Direct control: execute command immediately
            const commandType = button.dataset.commandType;
            executeCommand(commandType); // This is now synchronous for direct control
            drawGame();
            checkCollisions(); // Check after every move
            checkMissionCompletion(); // Check if mission objectives met
        }
    });
});

resetProgramButton.addEventListener('click', () => {
  if (currentLevelData.gameplayMode === 'sequencePerFragment' && checkpoints.length > 0 && currentSegmentIndex > 0) {
      // Offer to reset current segment or full level
      showModalMessage("Réinitialiser le segment actuel ou tout le niveau ?", "Confirmation de Réinitialisation", [
          { text: "Segment Actuel", action: resetCurrentSegment },
          { text: "Niveau Entier", action: () => loadLevel(currentLevelId) },
          { text: "Annuler", action: closeModal }
      ]);
  } else {
      // Default reset: reload current level (or reset program for non-checkpoint levels)
      programmedSequenceContainer.innerHTML = '';
      if (currentLevelData.gameplayMode !== 'directControl') {
         updateSimulationStatus('Programme réinitialisé. Prêt pour la séquence.');
      } else {
         // For direct control, re-initialize the mission to reset rover position etc.
         loadLevel(currentLevelId);
         updateSimulationStatus('Mission réinitialisée. Prêt à piloter.');
      }
       analyzeFragmentsButton.disabled = true;
       startSimulationButton.disabled = false; // Re-enable start
  }
});

function resetCurrentSegment() {
    programmedSequenceContainer.innerHTML = '';
    const lastCheckpoint = checkpoints[checkpoints.length - 1];
    if (lastCheckpoint) {
        rover = JSON.parse(JSON.stringify(lastCheckpoint.roverState));
        if (!rover.trail) rover.trail = [{x: rover.x, y: rover.y}]; else rover.trail = [{x: rover.x, y: rover.y}];
        
        collectedFragmentsCount = lastCheckpoint.collectedFragments;
        // Restore fragment visual state based on checkpoint
        sphereFragments.forEach((frag, idx) => {
            const targetKey = currentLevelData.segmentTargets[currentSegmentIndex -1]; // Previous segment target
            if(targetKey && targetKey.startsWith('fragment_')){
                const fragIndex = parseInt(targetKey.split('_')[1]);
                if(idx <= fragIndex) frag.collected = true; else frag.collected = false; // Example logic, might need refinement
            }
        });
    } else { // No checkpoints, reset to level start
        rover = JSON.parse(JSON.stringify(currentLevelData.initialRoverConfig));
        if (!rover.trail) rover.trail = [{x: rover.x, y: rover.y}]; else rover.trail = [{x: rover.x, y: rover.y}];
        collectedFragmentsCount = 0;
        sphereFragments.forEach(f => f.collected = false);
    }
    isSimulating = false;
    startSimulationButton.disabled = false;
    resetProgramButton.disabled = false;
    updateCollectedFragmentsUI();
    updateSegmentObjective();
    drawGame();
    closeModal();
}


// --- Simulation Logic ---
startSimulationButton.addEventListener('click', async () => {
  if (isSimulating || !missionActive) return;

  if (currentLevelData.gameplayMode === 'directControl') {
    isSimulating = true; // Mission is now "live" for direct control
    startSimulationButton.disabled = true;
    resetProgramButton.textContent = 'RÉINITIALISER MISSION';
    document.querySelectorAll('[data-command-type]').forEach(btn => btn.disabled = false); // Enable D-Pad
    simulationStatusEl.textContent = "Pilotage direct activé. Utilisez les commandes.";
    return;
  }

  // For sequence-based modes
  const commands = Array.from(programmedSequenceContainer.children).map(el => ({
    type: el.dataset.commandType,
    text: el.querySelector('span')?.textContent.trim() || el.dataset.commandType
  }));

  if (commands.length === 0) {
    showModalMessage('Aucune commande programmée pour cette séquence.', 'Erreur de Programme');
    return;
  }

  isSimulating = true;
  startSimulationButton.disabled = true;
  resetProgramButton.disabled = true;
  document.querySelectorAll('[data-command-type]').forEach(btn => btn.disabled = true); // Disable D-Pad during sequence

  // Reset rover to start of segment for sequencePerFragment
  if (currentLevelData.gameplayMode === 'sequencePerFragment') {
      if (checkpoints.length > 0 && currentSegmentIndex > 0 && currentSegmentIndex <= checkpoints.length) {
          // Start from the last checkpoint's rover state
          const lastCheckpointState = checkpoints[currentSegmentIndex -1].roverState;
          rover = JSON.parse(JSON.stringify(lastCheckpointState));
          if (!rover.trail) rover.trail = [{x: rover.x, y: rover.y}]; 
          else rover.trail = [{x: lastCheckpointState.x, y: lastCheckpointState.y}]; // Start new trail from checkpoint
          
          // Ensure collected fragments up to this point are visually marked
          // This count should be correct from checkpoint, but visuals might need update
          sphereFragments.forEach((frag, idx) => {
            if (checkpoints[currentSegmentIndex-1].collectedFragmentIds.includes(frag.id)) {
                frag.collected = true;
            }
          });
          collectedFragmentsCount = checkpoints[currentSegmentIndex-1].collectedFragments;


      } else { // First segment, start from initial position
          rover = JSON.parse(JSON.stringify(currentLevelData.initialRoverConfig));
          if (!rover.trail) rover.trail = [{x: rover.x, y: rover.y}]; else rover.trail = [{x: rover.x, y: rover.y}];
          sphereFragments.forEach(f => f.collected = false); // Ensure all fragments are uncollected
          collectedFragmentsCount = 0;
      }
  } else { // For other sequence modes (if any in future, or fullSequence)
      rover = JSON.parse(JSON.stringify(currentLevelData.initialRoverConfig));
      if (!rover.trail) rover.trail = [{x: rover.x, y: rover.y}]; else rover.trail = [{x: rover.x, y: rover.y}];
      sphereFragments.forEach(f => f.collected = false);
      collectedFragmentsCount = 0;
  }
  
  updateCollectedFragmentsUI();
  drawGame();
  
  simulationStatusEl.textContent = 'Simulation de séquence en cours...';

  for (const command of commands) {
    if (!isSimulating) break; // If simulation was stopped (e.g., by reset)
    simulationStatusEl.textContent = `Exécution: ${command.text}`;
    await executeCommandSequence(command.type); // Async for sequence execution
    drawGame();
    checkCollisions(); // Check after every command in sequence
    await new Promise(r => setTimeout(r, 350)); // Delay for visualization
  }

  if (isSimulating) { // If simulation completed naturally
    if (currentLevelData.gameplayMode === 'sequencePerFragment') {
        checkSegmentCompletion();
    } else {
        checkMissionCompletion();
    }
  }
  
  // Post-simulation state updates
  isSimulating = false;
  resetProgramButton.disabled = false;
  // Keep startSimulationButton disabled until next action (e.g., next segment, or if mission failed)
  // D-Pad remains disabled for sequence modes unless an explicit action re-enables them.
  if (currentLevelData.gameplayMode !== 'directControl') {
      document.querySelectorAll('[data-command-type]').forEach(btn => btn.disabled = false); // Re-enable for programming next sequence
  }
});

function executeCommand(type) { // Synchronous for direct control, or can be base for sequence
  let newX = rover.x;
  let newY = rover.y;
  const { gridWidth, gridHeight } = currentLevelData;

  switch (type) {
    case 'cmd_forward':
      if (rover.angle === 0) newX++;        // Facing Right
      else if (rover.angle === 90) newY++;  // Facing Down
      else if (rover.angle === 180) newX--; // Facing Left
      else if (rover.angle === 270) newY--; // Facing Up

      if (newX >= 0 && newX < gridWidth && newY >= 0 && newY < gridHeight) {
        rover.x = newX;
        rover.y = newY;
        if (!rover.trail) rover.trail = [];
        rover.trail.push({ x: newX, y: newY });
      } else {
        if (currentLevelData.gameplayMode === 'directControl') {
             simulationStatusEl.textContent = 'Collision avec la bordure ! Mouvement annulé.';
        } else {
            // For sequence, let it complete but note the collision implicitly
            // or handle it as a failure condition if needed.
        }
      }
      break;
    case 'cmd_turn_left':
      rover.angle = (rover.angle - 90 + 360) % 360;
      break;
    case 'cmd_turn_right':
      rover.angle = (rover.angle + 90) % 360;
      break;
  }
}

function executeCommandSequence(type) { // Async wrapper for sequence mode
    return new Promise(resolve => {
        executeCommand(type); // Uses the synchronous core logic
        resolve();
    });
}


// --- Collision & Game Logic ---
function checkCollisions() {
  sphereFragments.forEach(fragment => {
    if (!fragment.collected && rover.x === fragment.x && rover.y === fragment.y) {
      fragment.collected = true;
      collectedFragmentsCount++;
      updateCollectedFragmentsUI();
      simulationStatusEl.textContent = `Fragment ${fragment.id + 1} collecté en (${fragment.x}, ${fragment.y})!`;
    }
  });
}

function checkMissionCompletion() {
  const { labPosition, totalFragmentsRequired, completionMessages } = currentLevelData;
  const atLab = rover.x === labPosition.x && rover.y === labPosition.y;

  if (atLab) {
    if (collectedFragmentsCount >= totalFragmentsRequired) {
      simulationStatusEl.textContent = completionMessages.success;
      analyzeFragmentsButton.disabled = false;
      startSimulationButton.disabled = true;
      missionActive = false;
      document.querySelectorAll('[data-command-type]').forEach(btn => btn.disabled = true);
      showModalMessage(completionMessages.success, `Mission ${currentLevelData.levelId} Accomplie !`);
    } else {
      const message = completionMessages.labMissingFragments.replace('{missing}', totalFragmentsRequired - collectedFragmentsCount);
      simulationStatusEl.textContent = message;
      showModalMessage(message, 'Rapport de Mission');
      if (currentLevelData.gameplayMode === 'directControl') {
          startSimulationButton.disabled = true; // Keep D-Pad active
          document.querySelectorAll('[data-command-type]').forEach(btn => btn.disabled = false);
      } else {
        startSimulationButton.disabled = false; // Allow re-running sequence
      }
    }
  } else { // Not at lab
    simulationStatusEl.textContent = completionMessages.objectiveNotMet || 'Objectifs non atteints.';
     if (currentLevelData.gameplayMode === 'directControl') {
        startSimulationButton.disabled = true; // Keep D-Pad active
        document.querySelectorAll('[data-command-type]').forEach(btn => btn.disabled = false);
    } else {
      startSimulationButton.disabled = false;
    }
  }
}

function checkSegmentCompletion() {
    const { labPosition, totalFragmentsRequired, completionMessages, segmentTargets } = currentLevelData;
    const currentTargetKey = segmentTargets[currentSegmentIndex];
    let targetReached = false;
    let targetFragment = null;

    if (currentTargetKey === 'lab') {
        targetReached = rover.x === labPosition.x && rover.y === labPosition.y;
    } else if (currentTargetKey && currentTargetKey.startsWith('fragment_')) {
        const fragmentIndex = parseInt(currentTargetKey.split('_')[1]);
        targetFragment = sphereFragments[fragmentIndex];
        if (targetFragment && rover.x === targetFragment.x && rover.y === targetFragment.y) {
            targetReached = true;
            // Ensure it's marked collected by collision check already
            if (!targetFragment.collected) { // Should not happen if checkCollisions is called
                targetFragment.collected = true;
                collectedFragmentsCount++;
                updateCollectedFragmentsUI();
            }
        }
    }

    if (targetReached) {
        if (currentTargetKey === 'lab') {
            if (collectedFragmentsCount >= totalFragmentsRequired) {
                simulationStatusEl.textContent = completionMessages.success;
                analyzeFragmentsButton.disabled = false;
                startSimulationButton.disabled = true;
                missionActive = false;
                showModalMessage(completionMessages.success, `Mission ${currentLevelData.levelId} Accomplie !`);
            } else {
                const message = completionMessages.labMissingFragments.replace('{missing}', totalFragmentsRequired - collectedFragmentsCount);
                simulationStatusEl.textContent = message;
                showModalMessage(message, 'Rapport de Segment');
                startSimulationButton.disabled = false; // Allow re-running sequence for this segment
            }
        } else { // Reached a fragment
            const fragmentNumber = parseInt(currentTargetKey.split('_')[1]) + 1;
            const nextTargetIndex = currentSegmentIndex + 1;
            let nextTargetDesc = "";
            if (nextTargetIndex < segmentTargets.length) {
                const nextKey = segmentTargets[nextTargetIndex];
                 if (nextKey === 'lab') nextTargetDesc = "le Laboratoire";
                 else nextTargetDesc = `Fragment ${parseInt(nextKey.split('_')[1]) + 1}`;
            }

            const checkpointMsg = completionMessages.checkpointReached
                .replace('{fragmentNumber}', fragmentNumber)
                .replace('{nextTarget}', nextTargetDesc);
            
            simulationStatusEl.textContent = checkpointMsg;
            showModalMessage(checkpointMsg, "Checkpoint !");
            
            const collectedFragIds = sphereFragments.filter(f => f.collected).map(f => f.id);
            checkpoints.push({ 
                segmentIndex: currentSegmentIndex, 
                roverState: JSON.parse(JSON.stringify(rover)), // Deep copy rover state
                collectedFragments: collectedFragmentsCount,
                collectedFragmentIds: collectedFragIds // Store IDs of collected fragments
            });
            currentSegmentIndex++;
            programmedSequenceContainer.innerHTML = ''; // Clear for next sequence

            if (currentSegmentIndex >= segmentTargets.length) { // Should be caught by lab condition earlier
                 simulationStatusEl.textContent = "Tous les segments terminés, mais algo n'est pas au labo?";
                 startSimulationButton.disabled = true; // Should not happen
            } else {
                updateSegmentObjective();
                startSimulationButton.disabled = false; // Ready for next segment's sequence
            }
        }
    } else { // Target not reached
        simulationStatusEl.textContent = completionMessages.objectiveNotMet || 'Objectif du segment non atteint.';
        startSimulationButton.disabled = false; // Allow re-running sequence
    }
     resetProgramButton.disabled = false;
     document.querySelectorAll('[data-command-type]').forEach(btn => btn.disabled = false); // Allow reprogramming
}


// --- API & Modals ---
analyzeFragmentsButton.addEventListener('click', async () => {
  analyzeFragmentsButton.disabled = true;
  analyzeSpinner.style.display = 'inline-block';
  simulationStatusEl.textContent = 'Analyse des fragments en cours...';

  try {
    // IMPORTANT: Replace with your actual Gemini API key retrieval method.
    // Avoid hardcoding API keys in client-side code for production.
    const apiKey = ''; // YOUR_API_KEY - For local testing only.
    if (!apiKey) {
        console.warn("API Key for Gemini is missing. Using fallback message.");
        throw new Error("API Key missing");
    }

    const prompt = currentLevelData.elyaPrompt || `Analyse des fragments du niveau ${currentLevelId} terminée.`;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API Error:', errorData);
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const elyaMessage = data.candidates[0]?.content?.parts[0]?.text || (defaultElyaMessages[currentLevelId - 1] || "Analyse non concluante pour le moment.");
    showModalMessage(elyaMessage, `Rapport d'Elya - Niveau ${currentLevelId}`);
    
  } catch (error) {
    console.error("Failed to get Elya's analysis:", error);
    const fallbackMessage = defaultElyaMessages[currentLevelId - 1] || "Les systèmes d'analyse sont momentanément indisponibles. Progressez avec prudence.";
    showModalMessage(`${fallbackMessage}\n(Message de contingence dû à une erreur de communication avec Elya)`, `Rapport d'Elya - Niveau ${currentLevelId}`);
  } finally {
    analyzeSpinner.style.display = 'none';
    proceedToNextLevelSetup();
  }
});

function proceedToNextLevelSetup() {
  currentLevelId++;
  // For now, let's assume there are 2 levels. Add more conditions for more levels.
  if (currentLevelId <= 2) { // Max levels
    setTimeout(() => {
      programmedSequenceContainer.innerHTML = '';
      loadLevel(currentLevelId);
    }, 4000); // Wait 4 seconds before loading next level
  } else {
    simulationStatusEl.textContent = 'Toutes les missions de la Phase Zéro sont terminées ! Excellent travail !';
    showModalMessage('Félicitations, Commandant ! Vous avez complété toutes les missions de la Phase Zéro. Ermès est prêt pour des explorations plus lointaines.', 'Fin de la Mission Zéro');
    startSimulationButton.disabled = true;
    analyzeFragmentsButton.disabled = true;
    resetProgramButton.disabled = true;
    document.querySelectorAll('[data-command-type]').forEach(btn => btn.disabled = true);
  }
}

function showModalMessage(message, title = "Message d'Elya", actions = null) {
    elyaModalTitle.textContent = title;
    elyaMessageText.textContent = message;

    // Clear previous custom buttons if any
    const existingButtons = elyaModal.querySelectorAll('.custom-action-button');
    existingButtons.forEach(btn => btn.remove());
    const defaultOkButton = elyaModal.querySelector('button:not(.custom-action-button):not(.close-button)');


    if (actions && actions.length > 0) {
        if(defaultOkButton) defaultOkButton.style.display = 'none'; // Hide default "Compris"
        actions.forEach(action => {
            const button = document.createElement('button');
            button.textContent = action.text;
            button.className = 'custom-action-button mt-4 mx-2 bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-4 rounded-lg orbitron transition-colors duration-150';
            button.onclick = () => {
                if (action.action) action.action();
                else closeModal(); // Default action if none specified
            };
            elyaMessageText.insertAdjacentElement('afterend', button);
        });
    } else {
       if(defaultOkButton) defaultOkButton.style.display = 'inline-block'; // Show default "Compris"
    }

    elyaModal.style.display = 'block';
}

function closeModal() {
  elyaModal.style.display = 'none';
}
document.querySelector('.close-button').onclick = closeModal; // Ensure close button works
const defaultOkModalButton = elyaModal.querySelector('button[onclick="closeModal()"]');
if (defaultOkModalButton && !defaultOkModalButton.classList.contains('close-button')) {
    defaultOkModalButton.onclick = closeModal;
}


window.onclick = event => {
  if (event.target === elyaModal) {
    closeModal();
  }
};


// --- Canvas Resizing & Initial Load ---
function resizeCanvas() {
  if (!currentLevelData) return;

  const panel = document.getElementById('simulationPanel');
  const style = getComputedStyle(panel);
  const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const paddingY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  const titleHeight = panel.querySelector('h2')?.offsetHeight || 0;
  const statusHeight = simulationStatusEl?.offsetHeight || 0;
  const fragmentsUIHeight = collectedFragmentsUI?.offsetHeight || 0;
  
  // Estimate a bit more for margins/gaps not explicitly calculated
  const extraVerticalSpace = titleHeight + statusHeight + fragmentsUIHeight + 40; 

  const availableWidth = panel.clientWidth - paddingX;
  const availableHeight = panel.clientHeight - paddingY - extraVerticalSpace;

  if (availableWidth <= 0 || availableHeight <= 0) {
    TILE_SIZE = 20; // Fallback small size
  } else {
    TILE_SIZE = Math.max(15, Math.min(
      Math.floor(availableWidth / currentLevelData.gridWidth),
      Math.floor(availableHeight / currentLevelData.gridHeight)
    ));
  }

  canvas.width = currentLevelData.gridWidth * TILE_SIZE;
  canvas.height = currentLevelData.gridHeight * TILE_SIZE;
  drawGame();
}

window.addEventListener('load', () => loadLevel(currentLevelId));
window.addEventListener('resize', resizeCanvas);