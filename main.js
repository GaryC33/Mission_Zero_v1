import { GameController } from './modules/game-controller/game-controller.js';
import { loadCommandPanel } from './modules/command-panel/command-panel.js';
import { loadSimulationPanel } from './modules/simulation/simulation.js';
import { loadDialog } from './modules/dialog/dialog.js';
// import { EventBus } from './modules/utils/event-bus.js'; // Uncomment if you use an EventBus

async function initializeApp() {
    // const eventBus = new EventBus(); // Uncomment if you use an EventBus

    // Load HTML for core UI modules
    await loadCommandPanel(document.getElementById('command-panel-container'));
    await loadSimulationPanel(document.getElementById('simulation-container'));
    await loadDialog(document.getElementById('dialog-container'));
    
    // Initialize the Game Controller
    // Pass the eventBus if modules need to communicate indirectly
    // const gameController = new GameController(eventBus);
    const gameController = new GameController(); // Simpler for now, can add eventBus later

    // Start the game (e.g., load level 1)
    try {
        await gameController.startGame(); // startGame should handle loading the initial level
    } catch (error) {
        console.error("Failed to initialize the game:", error);
        // Display a critical error message to the user, perhaps using the dialog module if it loaded
        // For now, alert:
        alert("Erreur critique lors de l'initialisation du jeu. Vérifiez la console.");
    }

    // Setup resize listener for the simulation panel (or handle within simulation.js itself)
    window.addEventListener('resize', () => {
        if (gameController.simulation) { // Assuming simulation module instance is accessible
            gameController.simulation.handleResize();
        }
    });
}

document.addEventListener('DOMContentLoaded', initializeApp);