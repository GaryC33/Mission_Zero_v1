// modules/dialog/dialog.js
let modalElement;
let modalTitleElement;
let modalMessageTextElement;
let closeModalButtonElement;
let modalOkButtonElement;
let modalContentElement;
let modalCharacterHeader;
let modalCharacterImage;
let modalCharacterName;
let modalCustomActionsContainer;

const DIALOG_CONFIG = {
    elya: {
        borderColor: 'border-sky-500', // Bleu ciel pour Elya
        characterName: 'Elya',
        imageUrl: '../assets/elya1.svg' // Si vous avez une image pour Elya
    },
    isaac: {
        borderColor: 'border-red-600', // Rouge/Bordeaux pour Isaac
        characterName: 'Isaac',
        imageUrl: '../assets/isaac1.svg' // Chemin vers l'image d'Isaac
    },
    console: {
        borderColor: 'border-slate-300', // Blanc/Gris clair pour la Console Ermes
        characterName: 'Console Ermes',
    },
    default: {
        borderColor: 'border-gray-600', // Un gris neutre par défaut
        characterName: '',
    }
};

async function loadDialog(containerElement) {
    try {
        const response = await fetch('./modules/dialog/dialog.html');
        if (!response.ok) {
            throw new Error(`Échec du chargement de dialog.html: ${response.statusText}`);
        }
        const htmlContent = await response.text();
        containerElement.innerHTML = htmlContent;
        initializeDialogElements();
    } catch (error) {
        console.error("Erreur lors du chargement du module de dialogue:", error);
        containerElement.innerHTML = "<p class='text-red-500'>Erreur lors du chargement du module de dialogue.</p>";
    }
}

function initializeDialogElements() {
    modalElement = document.getElementById('genericModal');
    modalTitleElement = document.getElementById('modalTitle');
    modalMessageTextElement = document.getElementById('modalMessageText');
    closeModalButtonElement = document.getElementById('closeModalButton');
    modalOkButtonElement = document.getElementById('modalOkButton');
    modalContentElement = document.getElementById('modalContent');
    modalCharacterHeader = document.getElementById('modalCharacterHeader');
    modalCharacterImage = document.getElementById('modalCharacterImage');
    modalCharacterName = document.getElementById('modalCharacterName');
    modalCustomActionsContainer = document.getElementById('modalCustomActions');

    if (closeModalButtonElement) {
        closeModalButtonElement.addEventListener('click', hideDialog);
    }
    if (modalOkButtonElement) {
        modalOkButtonElement.addEventListener('click', hideDialog);
    }
    if (modalElement) {
        modalElement.addEventListener('click', (event) => {
            if (event.target === modalElement) {
                hideDialog();
            }
        });
    }
}

/**
 * Affiche une boîte de dialogue avec les options spécifiées.
 * @param {object} options - Les options de la boîte de dialogue.
 * @param {('elya'|'isaac'|'console'|'default')} [options.type='default'] - Le type de dialogue.
 * @param {string} options.title - Le titre de la boîte de dialogue.
 * @param {string} options.message - Le contenu du message.
 * @param {Array<{text: string, action: function, className?: string}>} [options.actions=null] - Boutons d'action personnalisés.
 */
function showDialog({ type = 'default', title, message, actions = null }) {
    if (!modalElement || !modalContentElement) {
        console.error('Éléments de dialogue non initialisés. Appelez loadDialog en premier.');
        return;
    }

    const config = DIALOG_CONFIG[type] || DIALOG_CONFIG.default;

    // Retire les anciennes classes de couleur de bordure
    Object.values(DIALOG_CONFIG).forEach(c => {
        if (c.borderColor) modalContentElement.classList.remove(c.borderColor);
    });
    // Ajoute la nouvelle classe de couleur de bordure
    if (config.borderColor) {
        modalContentElement.classList.add(config.borderColor);
    }

    modalTitleElement.textContent = title;
    modalMessageTextElement.textContent = message;

    if (type === 'isaac' && config.imageUrl) {
        modalCharacterHeader.style.display = 'flex';
        modalCharacterImage.src = config.imageUrl;
        modalCharacterImage.alt = config.characterName;
        modalCharacterImage.style.display = 'block';
        modalCharacterName.textContent = config.characterName;
    } else if (type === 'elya' || type === 'console') {
        modalCharacterHeader.style.display = 'flex';
        modalCharacterImage.style.display = 'none'; // Pas d'image spécifique par défaut
        modalCharacterName.textContent = config.characterName;
         if (type === 'elya' && config.imageUrl) { // Image optionnelle pour Elya
            modalCharacterImage.src = config.imageUrl;
            modalCharacterImage.alt = config.characterName;
            modalCharacterImage.style.display = 'block';
        }
    } else {
        modalCharacterHeader.style.display = 'none';
    }

    modalCustomActionsContainer.innerHTML = '';
    if (actions && actions.length > 0) {
        modalOkButtonElement.style.display = 'none';
        actions.forEach(action => {
            const button = document.createElement('button');
            button.textContent = action.text;
            button.className = action.className || 'bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-md mx-1 orbitron';
            button.addEventListener('click', () => {
                action.action();
            });
            modalCustomActionsContainer.appendChild(button);
        });
    } else {
        modalOkButtonElement.style.display = 'block';
    }

    modalElement.classList.remove('hidden');
}

function hideDialog() {
    if (modalElement) {
        modalElement.classList.add('hidden');
    }
}

export { loadDialog, showDialog, hideDialog };