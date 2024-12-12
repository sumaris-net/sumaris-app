[![pipeline status](https://gitlab.ifremer.fr/sih-public/sumaris/sumaris-app/badges/master/pipeline.svg)](https://gitlab.ifremer.fr/sih-public/sumaris/sumaris-app/-/commits/master)

# SUMARiS App

SUMARiS App is a data collection tool for fisheries monitoring.

Originally, the project started in 2018, with a shared database on skates and rays.
Developments then continued with other data collection programs : self-sampling for French fishermen, biological sampling for Ifremer, quality controls in auctions, ...

## Installation

### On Android

Download then install the latest APK file

or 

Install the app from the [play store](https://play.google.com/store/apps/details?id=net.sumaris.app) 


### On iOS

Install the app from the [Apple Store](https://testflight.apple.com/join/Unp1FxKH)

### As a website, on a Linux web server (Apache, nginx)

To install or update SUMARiS on a web server, you can use the installation script using cURL:

```
curl -o- https://raw.githubusercontent.com/sumaris-net/sumaris-app/master/install.sh | bash
```

or Wget:

```
wget -qO- https://raw.githubusercontent.com/sumaris-net/sumaris-app/master/install.sh | bash
```

## Contribute

See our documentation :
- [How-to build](doc/build.md)
- [Environment setup](doc/setup.md)
- [Developer guide](doc/developer_guide.md)
- Privacy policy: [EN](doc/privacy_policy.md) | [FR](doc/privacy_policy_fr.md)
- Full documentation (functional and technical) : https://gitlab.ifremer.fr/sih-public/sumaris/sumaris-doc

## License

Free software, distributed under a [AGPL v3 license](./LICENSE).
