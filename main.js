import { GameController } from './modules/game-controller/game-controller.js';
import { loadCommandPanel } from './modules/command-panel/command-panel.js';
import { loadSimulationPanel } from './modules/simulation/simulation.js';
import { loadDialog } from './modules/dialog/dialog.js';

async function initializeApp() {
    const gameController = new GameController();

    // Charger les modules UI et récupérer leurs API
    const commandPanelAPI = await loadCommandPanel(document.getElementById('command-panel-container'), gameController);
    const simulationAPI = await loadSimulationPanel(document.getElementById('simulation-container'));
    await loadDialog(document.getElementById('dialog-container'));
    
    // Enregistrer les API des modules UI auprès du GameController
    gameController.registerUIModules(commandPanelAPI, simulationAPI);

    // Start the game (e.g., load level 1)
    try {
        await gameController.startGame(); // startGame should handle loading the initial level
    } catch (error) {
        console.error("Failed to initialize the game:", error);
        alert("Erreur critique lors de l'initialisation du jeu. Vérifiez la console.");
    }

    window.addEventListener('resize', () => {
        if (gameController.isMissionActive()) { // Vérifier si une mission est active avant de redessiner
            gameController.handleResize();
        }
    });
}

document.addEventListener('DOMContentLoaded', initializeApp);