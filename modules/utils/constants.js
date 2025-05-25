// modules/utils/constants.js

export const TILE_SIZE_DEFAULT = 40; // Une taille de tuile par défaut, si non spécifiée par le niveau

export const COMMAND_DETAILS = {
  cmd_forward: {
    text: 'Avancer',
    icon: '⬆️',
    colorClass: 'bg-blue-500', // Classe Tailwind pour la couleur de fond
    borderColorClass: 'border-blue-500' // Classe Tailwind pour la bordure (utilisée dans l'ancien script)
  },
  cmd_turn_left: {
    text: 'Tourner à Gauche',
    icon: '⬅️',
    colorClass: 'bg-yellow-500',
    borderColorClass: 'border-yellow-500'
  },
  cmd_turn_right: {
    text: 'Tourner à Droite',
    icon: '➡️',
    colorClass: 'bg-green-500',
    borderColorClass: 'border-green-500'
  },
  // Ajoutez d'autres commandes ici si nécessaire à l'avenir
  // Par exemple, pour une commande "Reculer":
  // cmd_backward: {
  //   text: 'Reculer',
  //   icon: '⬇️',
  //   colorClass: 'bg-gray-500',
  //   borderColorClass: 'border-gray-500'
  // }
};

export const DIALOG_TYPES = {
  ELYA: 'elya',
  ISAAC: 'isaac',
  CONSOLE: 'console',
  DEFAULT: 'default'
};

// D'autres constantes globales pourraient être ajoutées ici,
// par exemple, des messages d'erreur communs, des configurations par défaut, etc.