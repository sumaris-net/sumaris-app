# Development Environment Setup

> Look at the up-to-date documentation at: https://gitlab.ifremer.fr/sih-public/sumaris/sumaris-doc/-/tree/master/architecture/app

## Prerequisites
### Generate an SSH key
On Windows, in a Git Bash terminal:
`ssh-keygen -t ed25519 -C "user@domain.com"`

Then, add the public key to GitHub (account settings:  https://github.com/settings/keys) and add an SSH key by copying the contents of the file ~/.ssh/id_ed25519.pub.

### Install Node JS
Windows:
- <https://nodejs.org/dist/v16.17.0/node-v16.17.0-x64.msi>
- or <https://nodejs.org/dist/v16.17.0/node-v16.17.0-win-x64.zip>

Linux:
- <https://nodejs.org/dist/v16.17.0/node-v16.17.0-linux-x64.tar.xz>

## Compile and launch
Clone the project from git:
- `git clone https://gitlab.ifremer.fr/sih/sumaris/sumaris-app.git`

Then, in the sumaris-app project, run these commands:
- `npm install`
- `npm run start`
- Once the pod starts, you can connect at <http://localhost:4200> (as admin@sumaris.net/admin) by selecting the network node <http://localhost:8080>
