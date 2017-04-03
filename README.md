# Get shapefiles for all countries, store geojson in ElasticSearch
- This is a component of [MagicBox](https://github.com/unicef/magicbox/wiki)

### What it does

##### app.js

- Downloads [gadm](http://gadm.org) series 2.8 zipped shapefiles for each country.
- Unzips them to directory specified in config.js

##### run
  npm install
  node download_shapefiles_from_gadm.js
