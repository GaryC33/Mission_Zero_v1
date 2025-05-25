// modules/rover/rover.js

/**
 * Crée un nouvel objet rover avec une configuration initiale.
 * @param {object} initialConfig - La configuration initiale du rover.
 * @param {number} initialConfig.x - Position x de départ.
 * @param {number} initialConfig.y - Position y de départ.
 * @param {number} initialConfig.angle - Angle de départ en degrés (0=droite, 90=bas, 180=gauche, 270=haut).
 * @param {string} [initialConfig.color='#63B3ED'] - Couleur du rover.
 * @returns {object} L'objet rover initialisé.
 */
export function createRover(initialConfig) {
    return {
        x: initialConfig.x,
        y: initialConfig.y,
        angle: initialConfig.angle, // 0: Droite, 90: Bas, 180: Gauche, 270: Haut
        color: initialConfig.color || '#63B3ED', // Bleu par défaut
        trail: [{ x: initialConfig.x, y: initialConfig.y }] // La trace commence à la position initiale
    };
}

/**
 * Déplace le rover d'une case dans sa direction actuelle, si possible.
 * @param {object} rover - L'objet rover à déplacer.
 * @param {number} gridWidth - La largeur de la grille.
 * @param {number} gridHeight - La hauteur de la grille.
 * @returns {boolean} True si le rover a bougé, false s'il a rencontré une bordure.
 */
export function moveRover(rover, gridWidth, gridHeight) {
    let newX = rover.x;
    let newY = rover.y;
    let moved = false;

    switch (rover.angle) {
        case 0: // Droite
            if (rover.x + 1 < gridWidth) {
                newX++;
                moved = true;
            }
            break;
        case 90: // Bas
            if (rover.y + 1 < gridHeight) {
                newY++;
                moved = true;
            }
            break;
        case 180: // Gauche
            if (rover.x - 1 >= 0) {
                newX--;
                moved = true;
            }
            break;
        case 270: // Haut
            if (rover.y - 1 >= 0) {
                newY--;
                moved = true;
            }
            break;
    }

    if (moved) {
        rover.x = newX;
        rover.y = newY;
        rover.trail.push({ x: newX, y: newY });
    }
    return moved;
}

/**
 * Fait tourner le rover de 90 degrés vers la gauche.
 * @param {object} rover - L'objet rover à faire tourner.
 */
export function turnRoverLeft(rover) {
    rover.angle = (rover.angle - 90 + 360) % 360;
}

/**
 * Fait tourner le rover de 90 degrés vers la droite.
 * @param {object} rover - L'objet rover à faire tourner.
 */
export function turnRoverRight(rover) {
    rover.angle = (rover.angle + 90) % 360;
}

/**
 * Réinitialise la trace du rover, en ne gardant que sa position actuelle.
 * Utile lors du démarrage d'un nouveau segment de séquence à partir d'un checkpoint.
 * @param {object} rover - L'objet rover.
 */
export function resetRoverTrail(rover) {
    rover.trail = [{ x: rover.x, y: rover.y }];
}

/**
 * Récupère la position actuelle du rover.
 * @param {object} rover - L'objet rover.
 * @returns {{x: number, y: number}} La position x et y du rover.
 */
export function getRoverPosition(rover) {
    return { x: rover.x, y: rover.y };
}

/**
 * Récupère l'état complet du rover (position, angle, couleur, trace).
 * Utile pour sauvegarder l'état dans un checkpoint.
 * @param {object} rover - L'objet rover.
 * @returns {object} Une copie de l'état du rover.
 */
export function getRoverState(rover) {
    return JSON.parse(JSON.stringify(rover)); // Crée une copie profonde
}