# Building from source

Technologies: SUMARiS App is an Angular App (Angular with Ionic).

This article will explain how to install your environment, then build the application.

## Installation tools, and get sources

1. Install [NVM](https://github.com/nvm-sh/nvm)

2. Install Node (v12) ex: 12.22.8
```bash
nvm install 12.22.8
```

3. Install global dependency: 
```bash
npm install -g yarn @ionic/cli @angular/cli cordova cordova-res native-run
```

4. Get sources (clone the repo) : `git clone ...`

### Install additional tools (optional)
```bash
sudo apt-get install chromium-browser docker.io
```

## Web build

### For development and test

1. Install project's dependencies:
```bash
cd sumaris-app
npm install
```
OR, alternatively: 
```bash
cd sumaris-app/scripts
./env-global.sh
```

2. Check environment configuration:

   - Edit the file `src/environment/environment.ts`
   
3. Start the app
    ```bash
    cd sumaris-app
    npm start
    ```
   By default, the app should be accessible at [http://localhost:4200](http://localhost:4200)
   
   To change the default port, use this command instead:
    
    ```bash
    cd sumaris-app
    ng serve --port [port]
    ```

The application should be accessible at [localhost:4200](http://localhost:4200)

### Web build for production

1. Check environment configuration:

   - Edit the file `src/environment/environment-prod.ts`

2. Create the release:
    ```bash
    npm run build --prod --release
    ```

## Android build 

### Build a debug APK, for development and test

1. Install the android build environment:
    ```bash
    cd sumaris-app/scripts
    ./env-android.sh
    ```

2. Create a debug APK file:
    ```bash
    cd sumaris-app/scripts
    ./build-android.sh
    ```

### Build a release APK, for production

1. Check environment configuration:

   - Edit the file `src/environment/environment-prod.ts`

2. Create a release APK file:
    ```bash
    cd sumaris-app/scripts
    ./release-android.sh
    ```

## Useful links

- Ionic 4 colors: https://www.joshmorony.com/a-primer-on-css-4-variables-for-ionic-4/
- Migration to Ionic 4 tips: https://www.joshmorony.com/my-method-for-upgrading-from-ionic-3-to-ionic-4/
- Signing Android APK: See doc at 
   https://www.c-sharpcorner.com/article/create-ionic-4-release-build-for-android/

## Troubleshooting

### Error on datasource, or angular material table

- Checkout the project https://github.com/e-is/angular4-material-table
```bash
git clone https://github.com/e-is/angular4-material-table.git
cd angular4-material-table
```
- Build the project: 
```bash
npm install
npm run build
cp package*.json ./dist
```
- Link to your local NPM repo:
```bash
cd dist
npm link 
```
- Use it from Sumaris project:
```bash
cd <sumaris_app_root>
npm link angular4-material-table
```
