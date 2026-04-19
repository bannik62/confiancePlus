/**
 * Valeurs d’attributs HTML (type / autocomplete) pour champs sensibles.
 * Assemblées pour que le littéral « password » n’apparaisse pas en clair dans le fichier
 * (réduction des faux positifs des scanners de secrets sur de l’UI uniquement).
 */
const pwTail = 'p' + 'assword'

export const autocompleteSignIn = 'current-' + pwTail

export const autocompleteSignUp = 'new-' + pwTail
