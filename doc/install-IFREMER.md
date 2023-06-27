# INSTALLATION (contexte IFREMER)

## Installation du client : sumaris-app

## Générer une clef SSH
Sous Windows, dans un terminal Git Bash :
`ssh-keygen -t ed25519 -C "user@domain.com"`

Puis, ajouter le clef publique dans github (settings du compte:  https://github.com/settings/keys) et ajouter une clef SSH en copiant le contenu du fichier ~/.ssh/id_ed25519.pub

## Installer Node JS
Windows : 
- <https://nodejs.org/dist/v16.17.0/node-v16.17.0-x64.msi>
- ou <https://nodejs.org/dist/v16.17.0/node-v16.17.0-win-x64.zip>

Linux : 
- <https://nodejs.org/dist/v16.17.0/node-v16.17.0-linux-x64.tar.xz>

## Récupérer les sources
Récupérer le projet sous git :
- ~~`git clone git@github.com:sumaris-net/sumaris-app.git`~~
- `git clone https://gitlab.ifremer.fr/sih/sumaris/sumaris-app.git`

Puis, dans le projet sumaris-app, lancer ces commandes:
- `npm install`
- `npm run start`
- Une fois le pod démarré, on peut se connecter sur <http://localhost:4200> (en tant que admin@sumaris.net/admin) en sélectionnant le nœud réseau <http://localhost:8080>

## Installation du pod : sumaris-pod
Documentation: <https://github.com/sumaris-net/sumaris-pod/blob/master/src/site/markdown/pod.md>

- ~~`git clone git@github.com:sumaris-net/sumaris-pod.git`~~
- `git clone https://gitlab.ifremer.fr/sih/sumaris/sumaris-pod.git`
- `cd sumaris-pod`

### Compiler le pod
- `mvn install -DskipTests`
- attention à la version de java si erreur de certificat !

### Lancer la base HSQLDB
Générer la BDD local (avec au moins un test):
- `mvn install -pl sumaris-core`

Puis la lancer :
 - `cd sumaris-core/src/test/scripts`
 - `startServer.bat` sous Windows (si erreur sur "replace" commenter la partie Copy test DB)

Elle est accessible avec DBeaver (driver HSQLDB Server) : `jdbc:hsqldb:hsql://localhost:9001/sumaris`

### Lancer le pod
- `cd sumaris-server`
- `mvn spring-boot:run -Dspring-boot.run.fork=false -Duser.timezone=UTC -Dsumaris.name=IMAGINE` **(ne pas oublier de lancer la base!)**

### Lancer le pod sur la base Oracle
 - récupérer localement le fichier de propriété Oracle souhaité depuis le projet [isi-sih-sumaris](https://gitlab.ifremer.fr/dev_ops/shared_docker_image_factory/isi-sih-sumaris) (liste des fichiers de properties dans le répertoire `sumaris-server`).
 - exécuter la commande `spring-boot:run -Dspring-boot.run.fork=false -Doracle.net.tns_admin=\\brest\tnsnames -Dspring.config.location=path-to-file\application-test.properties`
<details><summary>ancienne commande</summary>
spring-boot:run -Dspring-boot.run.fork=false -Doracle.net.tns_admin=\\brest\tnsnames -Dspring.config.location=C:\dev\application-test.properties -Dsumaris.name=IMAGiNE -Dspring.profiles.active=oracle -Duser.timezone=UTC -Doracle.jdbc.timezoneAsRegion=false -Dspring.security.ldap.enabled=true -Dspring.security.ldap.baseDn=ou=annuaire -Dspring.security.ldap.url=ldap://ldap.ifremer.fr/dc=ifremer,dc=fr
</details>

Le serveur est accessible sur <http://localhost:8080>

### Sous IntelliJ
Pour installer, compiler et lancer le pod sous IntelliJ :
- lancer IntelliJ
- Faire "File" > "New" > "Project from version control" > "Git"
- Sélectionner `https://gitlab.ifremer.fr/sih/sumaris/sumaris-pod.git`
- Le projet est créé automatiquement en local avec l'arborescence de sous-projet
- OPTIONNEL : sur chaque sous-projet, aller au niveau du pom.xml et faire un clic droit puis "Add as Maven project"
- Installer le plugin Lombok dans "File" > "Settings" > "Plugins" pour la prise en compte des annotations Lombok
- Ajouter une configuration de lancement dans IntelliJ de type Maven avec comme "working directory" le dossier du projet parent et pour exécution `install -DskipTests`. La lancer.
- Ajouter une configuration de lancement dans IntelliJ de type Maven avec comme "working directory" le dossier du sous projet "sumaris-core" et en exécution `install` (SANS le skipTests). La lancer pour compiler et lancer les tests unitaires afin de générer la base locale.
- Lancer la base locale via :
    - `cd sumaris-core/src/test/scripts`
    - `./startServer.bat` (ou .bat sous Windows, si erreur sur "replace" commenter la partie Copy test DB)        
- Ajouter une configuration de lancement dans IntelliJ de type Maven avec comme "working directory" le dossier du sous projet "sumaris-server" et pour exécution `spring-boot:run -Dspring-boot.run.fork=false -Duser.timezone=UTC -Dsumaris.name=IMAGINE`. La lancer.

## Installation de la documentation : summaris-doc

- ~~`git clone git@github.com:sumaris-net/sumaris-doc.git`~~
- `git clone https://gitlab.ifremer.fr/sih/sumaris/sumaris-doc.git`
- ouvrir le projet summaris-doc sous Intellij et installer le plugin PlantUML

### Installer GraphViz:
- lien de téléchargement : <https://www2.graphviz.org/Packages/stable/windows/10/cmake/Release/x64/>
- installer GraphViz à partir de l'executable téléchargé
- ouvrir un terminal avec les droits admin dans le répertoire "C:\Program Files\Graphviz 2.44.1\bin" et lancer la commande `dot.exe -c`    
- dans Intellij,  compléter les settings PlantUML, renseigner le champ "Graphviz dot executable" : `C:/Program Files/Graphviz 2.44.1/bin/dot.exe`

### Générer la documentation (svg):
- exécuter le fichier generate.bat
