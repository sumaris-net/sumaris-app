# Developer guide

> Look at the up-to-date documentation at: https://gitlab.ifremer.fr/sih-public/sumaris/sumaris-doc/-/tree/master/architecture/app

## Writing components

- For each Angular component (v14):
  - Use the Ionic framework, and if necessary, Angular Material. Use the Moment class for dates.
  - Use RxState with providers: [RxState] in the @Component declaration.
  - Right above each component class, declare an interface MyComponentState:
    * Replace "MyComponent" with the name of the component.
    * Add the component's dynamic attributes to this interface.
  - Within the constructor:
    * Limit the parameters by using injector: Injector to facilitate inheritance.
    * Define all parameters with `protected` visibility.
    * Add a parameter state: RxState<MyComponentState>.
  - For each dynamic attribute of the component:
    * Define the attribute with its basic type in the MyComponentState class.
    * In the component, define a getter and a setter with @Input that uses state:
    ```ts
    get attribute(): string {
      return this.state.get('attribute');
    }
    @Input() set attribute(value: string) {
      this.state.set('attribute', () => value);
    }
    ```    
  - For modals (if needed):
    * Use IonicModal.
    * Do not define the modal in the HTML template (inline) but in a separate component.
    * Manage the modal from the calling component via ModalController.
  - For any generated code (by GPT or otherwise):
    - Do not generate TypeScript imports.
    - Add a comment line at the beginning of the class indicating that the code is under a free license (GPL version 3), but do not write out the full license.

  - Use the `ngx-translate` library for labels:
    - Use the `TranslateModule` imported from `@ngx-translate/core`.
    - Add an i18n key prefix "MY_COMPONENT." before each i18n key.
    - In the template, translate each label by indicating the i18n key followed by the `translate` pipe.
    - Define the translation for each key in a "fr.json" translation file.

