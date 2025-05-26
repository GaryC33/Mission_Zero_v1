// modules/simulation/simulation.js
import { TILE_SIZE_DEFAULT } from '../utils/constants.js'; // Pour une valeur par défaut

let canvas;
let ctx;
let canvasContainer;
let simulationStatusEl;
let collectedFragmentsUIEl;
let simulationTitleEl;

let currentGridWidth = 0;
let currentGridHeight = 0;
let currentTileSize = TILE_SIZE_DEFAULT; // Taille actuelle de la tuile, calculée dynamiquement

// Fonctions exportées que le GameController pourra appeler
const simulationAPI = {
    initializeCanvas,
    drawInitialState,
    drawState,
    updateStatus,
    updateFragmentCount,
    handleResize // Exportée pour être appelée par main.js ou GameController
};

async function loadSimulationPanel(containerElement) {
    try {
        const response = await fetch('./modules/simulation/simulation.html');
        if (!response.ok) {
            throw new Error(`Failed to load simulation.html: ${response.statusText}`);
        }
        const htmlContent = await response.text();
        containerElement.innerHTML = htmlContent;
        initializeSimulationElements();
        // Le canvas sera initialisé par le GameController via initializeCanvas
    } catch (error) {
        console.error("Error loading simulation module:", error);
        containerElement.innerHTML = "<p class='text-red-500'>Error loading simulation module.</p>";
    }
    return simulationAPI; // Retourne l'API pour que main.js puisse la passer au GameController
}

function initializeSimulationElements() {
    canvasContainer = document.getElementById('canvasContainer');
    canvas = document.getElementById('gameCanvas');
    if (canvas) {
        ctx = canvas.getContext('2d');
    } else {
        console.error("Canvas element not found!");
    }
    simulationStatusEl = document.getElementById('simulationStatus');
    collectedFragmentsUIEl = document.getElementById('collectedFragmentsUI');
    simulationTitleEl = document.getElementById('simulationTitle'); // Si vous voulez le contrôler dynamiquement
}

function initializeCanvas(gridWidth, gridHeight, levelTileSize) {
    currentGridWidth = gridWidth;
    currentGridHeight = gridHeight;
    // Si le niveau spécifie une tileSize, on pourrait l'utiliser,
    // sinon on la calcule dynamiquement lors du redimensionnement.
    // Pour l'instant, on se base sur le calcul dynamique.
    handleResize(); // Calcule la tileSize et dessine la grille vide
}

function drawInitialState(rover, fragments, labPosition) {
    // Efface le canvas et redessine tout
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawLab(labPosition);
    drawFragments(fragments);
    drawRover(rover);
}

function drawState(rover, fragments, labPosition) {
    // Version optimisée qui pourrait ne redessiner que ce qui a changé,
    // mais pour ce jeu, un redessin complet est plus simple et suffisant.
    drawInitialState(rover, fragments, labPosition);
}

function updateStatus(message) {
    if (simulationStatusEl) {
        simulationStatusEl.textContent = message;
    }
}

function updateFragmentCount(collected, total) {
    if (collectedFragmentsUIEl) {
        collectedFragmentsUIEl.textContent = `Fragments: ${collected} / ${total}`;
    }
}

// --- Fonctions de Dessin Internes ---

function drawGrid() {
    if (!ctx || currentGridWidth === 0 || currentGridHeight === 0) return;
    ctx.strokeStyle = '#2D3748'; // Couleur des lignes de la grille
    ctx.lineWidth = 1;

    for (let x = 0; x <= currentGridWidth; x++) {
        ctx.beginPath();
        ctx.moveTo(x * currentTileSize, 0);
        ctx.lineTo(x * currentTileSize, currentGridHeight * currentTileSize);
        ctx.stroke();
    }
    for (let y = 0; y <= currentGridHeight; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * currentTileSize);
        ctx.lineTo(currentGridWidth * currentTileSize, y * currentTileSize);
        ctx.stroke();
    }
}

function drawLab(labPosition) {
    if (!ctx || !labPosition) return;
    const labColor = 'rgba(56, 161, 105, 0.7)'; // Vert labo
    const labBorderColor = '#2F855A';

    ctx.fillStyle = labColor;
    ctx.fillRect(labPosition.x * currentTileSize, labPosition.y * currentTileSize, currentTileSize, currentTileSize);
    ctx.strokeStyle = labBorderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(labPosition.x * currentTileSize, labPosition.y * currentTileSize, currentTileSize, currentTileSize);

    ctx.fillStyle = '#EDF2F7'; // Couleur du texte "LAB"
    ctx.font = `bold ${Math.max(10, currentTileSize / 3.5)}px Orbitron`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LAB', labPosition.x * currentTileSize + currentTileSize / 2, labPosition.y * currentTileSize + currentTileSize / 2);
}

function drawFragments(fragments) {
    if (!ctx || !fragments) return;
    fragments.forEach(fragment => {
        if (!fragment.collected) {
            ctx.fillStyle = fragment.color || '#F6E05E'; // Couleur du fragment
            ctx.beginPath();
            ctx.arc(
                fragment.x * currentTileSize + currentTileSize / 2,
                fragment.y * currentTileSize + currentTileSize / 2,
                currentTileSize / 3, // Rayon du fragment
                0, Math.PI * 2
            );
            ctx.fill();

            // Petit reflet sur le fragment
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(
                fragment.x * currentTileSize + currentTileSize / 2 - currentTileSize * 0.07,
                fragment.y * currentTileSize + currentTileSize / 2 - currentTileSize * 0.07,
                currentTileSize / 9,
                0, Math.PI * 2
            );
            ctx.fill();
        }
    });
}

function drawRover(rover) {
    if (!ctx || !rover || typeof rover.x === 'undefined') return;

    ctx.save();
    const centerX = rover.x * currentTileSize + currentTileSize / 2;
    const centerY = rover.y * currentTileSize + currentTileSize / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate(rover.angle * Math.PI / 180);

    // Corps du rover
    ctx.fillStyle = rover.color || '#63B3ED'; // Couleur du rover
    ctx.fillRect(-currentTileSize * 0.4, -currentTileSize * 0.25, currentTileSize * 0.8, currentTileSize * 0.5);

    // Roues
    const wheelRadius = currentTileSize * 0.12;
    const wheelOffsetY = currentTileSize * 0.25; // Distance du centre Y
    const wheelOffsetX = currentTileSize * 0.35; // Distance du centre X
    ctx.fillStyle = '#A0AEC0'; // Couleur des roues
    // Haut-gauche
    ctx.beginPath(); ctx.arc(-wheelOffsetX, -wheelOffsetY, wheelRadius, 0, Math.PI * 2); ctx.fill();
    // Haut-droite
    ctx.beginPath(); ctx.arc(wheelOffsetX, -wheelOffsetY, wheelRadius, 0, Math.PI * 2); ctx.fill();
    // Bas-gauche
    ctx.beginPath(); ctx.arc(-wheelOffsetX, wheelOffsetY, wheelRadius, 0, Math.PI * 2); ctx.fill();
    // Bas-droite
    ctx.beginPath(); ctx.arc(wheelOffsetX, wheelOffsetY, wheelRadius, 0, Math.PI * 2); ctx.fill();

    // "Phare" ou capteur avant
    ctx.fillStyle = '#FBBF24'; // Jaune/Ambre
    ctx.fillRect(currentTileSize * 0.3, -currentTileSize * 0.05, currentTileSize * 0.15, currentTileSize * 0.1);

    ctx.restore();

    // Dessin de la trace
    if (rover.trail && rover.trail.length > 1) {
        ctx.strokeStyle = 'rgba(66, 153, 225, 0.5)'; // Bleu semi-transparent pour la trace
        ctx.lineWidth = Math.max(1, currentTileSize * 0.075);
        ctx.beginPath();
        ctx.moveTo(rover.trail[0].x * currentTileSize + currentTileSize / 2, rover.trail[0].y * currentTileSize + currentTileSize / 2);
        for (let i = 1; i < rover.trail.length; i++) {
            ctx.lineTo(rover.trail[i].x * currentTileSize + currentTileSize / 2, rover.trail[i].y * currentTileSize + currentTileSize / 2);
        }
        ctx.stroke();
    }
}

function handleResize() {
    if (!canvas || !canvasContainer || !simulationStatusEl || !collectedFragmentsUIEl || currentGridWidth === 0 || currentGridHeight === 0) {
        // Attendre que le GameController fournisse les dimensions de la grille
        return;
    }

    const panelStyle = getComputedStyle(canvasContainer.parentElement); // simulationPanel
    const containerStyle = getComputedStyle(canvasContainer);

    const panelPaddingTop = parseFloat(panelStyle.paddingTop);
    const panelPaddingBottom = parseFloat(panelStyle.paddingBottom);
    const panelPaddingLeft = parseFloat(panelStyle.paddingLeft);
    const panelPaddingRight = parseFloat(panelStyle.paddingRight);

    // Utiliser la variable simulationTitleEl du module, initialisée dans initializeSimulationElements
    const titleHeight = simulationTitleEl ? (simulationTitleEl.offsetHeight + parseFloat(getComputedStyle(simulationTitleEl).marginBottom)) : 0;

    const statusHeight = simulationStatusEl.offsetHeight + parseFloat(getComputedStyle(simulationStatusEl).marginTop);
    const fragmentsUiHeight = collectedFragmentsUIEl.offsetHeight + parseFloat(getComputedStyle(collectedFragmentsUIEl).marginTop);
    const canvasContainerMarginBottom = parseFloat(containerStyle.marginBottom);

    const availableWidthForCanvas = canvasContainer.parentElement.clientWidth - panelPaddingLeft - panelPaddingRight;
    const availableHeightForCanvas = canvasContainer.parentElement.clientHeight - panelPaddingTop - panelPaddingBottom - titleHeight - statusHeight - fragmentsUiHeight - canvasContainerMarginBottom;


    if (availableWidthForCanvas <= 0 || availableHeightForCanvas <= 0) {
        currentTileSize = TILE_SIZE_DEFAULT / 2; // Petite taille de secours
    } else {
        currentTileSize = Math.max(10, Math.min(
            Math.floor(availableWidthForCanvas / currentGridWidth),
            Math.floor(availableHeightForCanvas / currentGridHeight)
        ));
    }

    canvas.width = currentGridWidth * currentTileSize;
    canvas.height = currentGridHeight * currentTileSize;

    // Redessiner uniquement la grille ici.
    // Le GameController se chargera de redessiner l'état complet du jeu (rover, fragments, etc.)
    // en appelant simulationAPI.drawState(...) après que handleResize ait été exécuté.
    drawGrid();
}

// Exporter l'API du module
export { loadSimulationPanel };