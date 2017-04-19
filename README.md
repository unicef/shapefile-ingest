This is a component of [MagicBox](https://github.com/unicef/magicbox/wiki)

### Get shapefiles for all countries from gadm.org
- Downloads [gadm](http://gadm.org) series 2.8 zipped shapefiles for each country.
- Unzips them to directory specified in config.js

### Import shapefiles to postgres
- Creates a database in postgres for every country
- Imports the highest admin level shapefile to country database.

##### set up
  [Install postgres](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-postgresql-on-ubuntu-16-04)
  `sudo apt-get install postgis`

  `cp config-sample.js config.js`

  `bash setup.sh`

  Zipped shape files will be downloaded to directory in data directory.

##### run
  npm install
  - node download_shapefiles_from_gadm.js
  - node import_shapefiles_postgres.js
