// modules/fragment/fragment.js

/**
 * Crée et retourne un tableau d'objets fragments basé sur la configuration du niveau.
 * @param {object} fragmentConfig - La configuration des fragments pour le niveau.
 * @param {number} gridWidth - La largeur de la grille du niveau.
 * @param {number} gridHeight - La hauteur de la grille du niveau.
 * @param {Array<object>} initialAvoidPositions - Un tableau de positions initiales à éviter.
 * @returns {Array<object>} Un tableau d'objets fragments.
 */
export function createFragments(fragmentConfig, gridWidth, gridHeight, initialAvoidPositions = []) {
    const newFragments = [];
    const defaultColor = '#F6E05E'; // Jaune par défaut si non spécifié

    if (!fragmentConfig) {
        console.error("Configuration des fragments manquante.");
        return [];
    }

    if (fragmentConfig.type === 'random') {
        const avoidPositions = [...initialAvoidPositions]; // Copie pour pouvoir ajouter les fragments déjà placés
        let attempts = 0;
        const maxAttempts = gridWidth * gridHeight * 2; // Limite pour éviter une boucle infinie

        while (newFragments.length < fragmentConfig.count && attempts < maxAttempts) {
            const x = Math.floor(Math.random() * gridWidth);
            const y = Math.floor(Math.random() * gridHeight);

            const isInvalidPosition = avoidPositions.some(p => p.x === x && p.y === y) ||
                                    newFragments.some(f => f.x === x && f.y === y);

            if (!isInvalidPosition) {
                newFragments.push({
                    id: `frag-rand-${newFragments.length}`, // ID unique pour la logique interne
                    displayId: newFragments.length + 1, // ID convivial pour l'affichage
                    x,
                    y,
                    collected: false,
                    color: fragmentConfig.color || defaultColor
                });
                // Ajoute la position du nouveau fragment aux positions à éviter pour les suivants
                avoidPositions.push({ x, y });
            }
            attempts++;
        }

        if (newFragments.length < fragmentConfig.count) {
            console.warn(`Avertissement: Impossible de placer tous les ${fragmentConfig.count} fragments aléatoires sans collision après ${maxAttempts} tentatives. ${newFragments.length} fragments placés.`);
        }
    } else if (fragmentConfig.type === 'fixed' && fragmentConfig.positions) {
        fragmentConfig.positions.forEach((pos, index) => {
            newFragments.push({
                id: `frag-fixed-${index}`, // ID unique pour la logique interne
                displayId: index + 1, // ID convivial pour l'affichage
                x: pos.x,
                y: pos.y,
                collected: false,
                color: fragmentConfig.color || defaultColor
            });
        });
    } else {
        console.error("Configuration des fragments invalide ou type non supporté.");
    }

    return newFragments;
}

/**
 * Vérifie si le rover est sur un fragment non collecté.
 * Si oui, marque le fragment comme collecté et retourne l'ID du fragment.
 * @param {object} rover - L'objet rover avec ses propriétés x et y.
 * @param {Array<object>} fragmentsArray - Le tableau des fragments du jeu.
 * @returns {string|null} L'ID du fragment collecté, ou null si aucun fragment n'est collecté.
 */
export function checkFragmentCollision(rover, fragmentsArray) {
    if (!rover || !fragmentsArray) return null;

    for (const fragment of fragmentsArray) {
        if (!fragment.collected && rover.x === fragment.x && rover.y === fragment.y) {
            fragment.collected = true;
            return fragment.id; // Retourne l'ID interne du fragment qui vient d'être collecté
        }
    }
    return null; // Aucun nouveau fragment collecté
}

/**
 * Réinitialise l'état 'collected' de tous les fragments.
 * Utile lors de la réinitialisation d'un niveau.
 * @param {Array<object>} fragmentsArray - Le tableau des fragments du jeu.
 */
export function resetFragments(fragmentsArray) {
    if (fragmentsArray) {
        fragmentsArray.forEach(fragment => {
            fragment.collected = false;
        });
    }
}