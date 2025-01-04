Réponses au question du PLay store, sur l'usage de la récupération des positions en tâche de fond.

## Quelle est la finalité principale de votre application ?

Il s'agit d'une application scientifique, de collecte de données halieutiques (ressources en mer) utilisées par des pêcheurs professionnels ou des observateurs scientifiques.
Les données sont collectées en mer ou sur des ports de pêcheurs. La géolocalisation est donc cruciale.

## Décrivez la fonctionnalité de votre appli, qui a besoin d'accéder aux données de localisation en arrière-plan.

Lors de la saisie d'une sortie en mer, uniquement sur la base de données des Seychelles (SFA - sih.sfa.sc) les données GPS sont collectée en tâche de fond.
Cela permet d'accélérer la récupération de la position, en prenant directement la dernière, sans attendre la réponse GPS (qui peut être longue).
Pour y accéder :
- ouvrir l'app sur la base de données "sih.sfa.sc"
- Créer une sortie
- Lors de la saisie, les positions GPS sont collectées, et la dernière est utilisée lors de l'enregistrement.
