# INSTALLATION (contexte IFREMER)

## Génére une clef SSH
Sous Windows, dans un terminal Git Bash :
`ssh-keygen -t ed25519 -C "user@comain.com"`

Puis, ajouter le clef publique dans github (settings du compte:  https://github.com/settings/keys) et ajouter une clef SSH en copiant le contenu du fichier ~/.ssh/id_ed25519.pub


## Installer Node JS
Windows : 
- <https://nodejs.org/dist/v12.18.3/node-v12.18.3-x64.msi>
- ou <https://nodejs.org/dist/v12.18.3/node-v12.18.3-win-x64.zip>

Linux : 
- <https://nodejs.org/dist/v12.18.3/node-v12.18.3-linux-x64.tar.xz>

## récupération du projet
 - récupérer le projet sous git: 
 - `git clone https://gitlab.ifremer.fr/sih/sumaris/sumaris-app.git`
 - github pour info : `git clone git@github.com:sumaris-net/sumaris-app.git` (ou https:  <https://github.com/sumaris-net/sumaris-app.git>)
    

Puis, dans le projet sumaris-app, lancer ces commandes:
 - `npm install`
 - `npm run start`
 - Une fois le Pod démarré, on peut se connecter sur <http://localhost:4200> (en tant que admin@sumaris.net/admin) en sélectionnant le nœud réseau <http://localhost:8080>
</s>

## Installation du Pod
Documentation: <https://github.com/sumaris-net/sumaris-pod/blob/master/src/site/markdown/pod.md>
~~- `git clone git@github.com:sumaris-net/sumaris-pod.git`~~
- `git clone https://gitlab.ifremer.fr/sih/sumaris/sumaris-pod.git`
- `cd sumaris-pod`

## Compiler le Pod
- `mvn install -DskipTests`
- attention à la version de java si erreur de certificat!

## Lancer la BDD HsqlDB
Générer la BDD local (avec au moins un test):
- `mvn install -pl sumaris-core`

Puis la lancer :
 - `cd sumaris-core/src/test/scripts`
 - `startServer.bat` sous Windows (si erreur sur "replace" commenter la partie Copy test DB)

## Lancer le Pod
- (copier lib/libsodium.dll dans target/classes)
- `cd sumaris-server`
- `mvn -Prun` **(ne pas oublier de lancer la base!)**

Le serveur est accessible sur <http://localhost:8080>

### Sous IntelliJ
Pour installer, compiler et lancer le pod sous IntelliJ :
- lancer IntelliJ
- Faire "File" > "New" > "Project from version control" > "Git"
- Sélectionner `git@github.com:sumaris-net/sumaris-pod.git` (ou son équivalent https: <https://github.com/sumaris-net/sumaris-pod.git>) en url puis choisir le dossier local
- Le projet est créé automatiquement en local avec l'arborescence de sous-projet
- OPTIONNEL : Sur chaque sous-projet, aller au niveau du pom.xml et faire un clic droit puis "Add as Maven project"
- Ajouter une configuration d'installation dans IntelliJ de type Maven avec comme "working directory" le dossier du projet parent et pour exécution "install -DskipTests". La lancer
- Ajouter une configuration d'installation dans IntelliJ de type Maven avec comme "working directory" le dossier du sous projet "sumaris-core" et en exécution "install" (SANS le skipTests). La lancer pour compiler et lancer les tests unitaires afin de générer la base locale.
- lancer la base locale via:
    - `cd sumaris-core/src/test/scripts`
    - `./startServer.bat` (ou .bat sous Windows, si erreur sur "replace" commenter la partie Copy test DB)        
- Lancer le pod : Ajouter une configuration de lancement dans IntelliJ de type Maven avec comme "working directory" le dossier du sous projet "sumaris-server" et un profile avec pour valeur "run". La lancer

## Installation du projet summaris doc

- lancer la commande : `git clone git@github.com:sumaris-net/sumaris-doc.git`
- ouvrir le projet summaris-doc sous Intellij et installer le plugin PlantUML

### installer GraphViz:
- lien de téléchargement : <https://www2.graphviz.org/Packages/stable/windows/10/cmake/Release/x64/>
- installer GraphViz à partir de l'executable téléchargé
- ouvrir un terminal avec les droits admin dans le répertoire "C:\Program Files\Graphviz 2.44.1\bin" et lancer la commande `dot.exe -c`    
- dans Intellij,  compléter les settings PlantUML, renseigner le champ "Graphviz dot executable" : `C:/Program Files/Graphviz 2.44.1/bin/dot.exe`

### génération de la documentation (svg):
- exécuter le fichier generate.bat


