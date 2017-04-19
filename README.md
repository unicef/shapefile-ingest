# Get shapefiles for all countries from gadm.org
- This is a component of [MagicBox](https://github.com/unicef/magicbox/wiki)

### What it does
- Downloads [gadm](http://gadm.org) series 2.8 zipped shapefiles for each country.
- Unzips them to directory specified in config.js

##### set up
  `cp config-sample.js config.js`
  `bash setup.sh`
  Zipped shape files will be downloaded directory in data directory.

##### run
  npm install
  node download_shapefiles_from_gadm.js
