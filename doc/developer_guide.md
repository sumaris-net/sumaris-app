# Developer guide

## Composant Angular

- Pour chaque composant Angular (v14):
  - Utiliser Ionic framework, et si besoin Angular Material. Utiliser la classe Moment pour les dates.
  - Utiliser RxState avec providers: [RxState] dans la déclaration @Component.
  - Juste au-dessus de chaque classe composant, déclarer une interface MonComponentState :
    * En remplaçant "MonComponent" par le nom du composant.
    * Ajouter les attributs dynamiques du composant dans cette interface.
  - Dans le constructeur :
    * Limiter les paramètres en utilisant injector: Injector pour faciliter l'héritage.
    * Définir tous les paramètres avec une visibilité protected.
    * Ajouter un paramètre state: RxState<MonComposantState>.
  - Pour chaque attribut dynamique du composant :
    * Définir l'attribut avec son type simple dans la classe MonComposantState.
    * Dans le composant, définir un getter et un setter avec @Input qui utilise state :
    ```ts
    get attribute(): string {
      return this.state.get('attribute');
    }
    @Input() set attribute(value: string) {
      this.state.set('attribute', () => value);
    }
    ```    
  - Pour les modales (si besoin) :
    *  Utiliser IonicModal.
    *  Ne pas définir la modale dans le template HTML (inline) mais dans un composant séparé.
    *  Gérer la modale depuis le composant appelant via ModalController.
  - Pour tout code généré (par GPT ou autre) :
    - Ne pas générer les imports TypeScript.
    - Ajouter une ligne de commentaire, en entête de classe, indiquant que le code est sous licence libre (GPL version 3), sans toutefois écrire la licence en entier. 

  - Utiliser la bibliothèque `ngx-translate` pour les libellés :
    - Utiliser le module `TranslateModule` importé depuis `@ngx-translate/core`.
    - Ajouter un préfixe de clé i18n "MON_COMPOSANT." devant chaque clé i18n.
    - Dans le template, traduire chaque libellé en indiquant la clef i18n suivi de la pipe `translate`.
    - Définir la traduction de chaque clé dans un fichier de traduction "fr.json".
