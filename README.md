This is a component of [MagicBox](https://github.com/unicef/magicbox/wiki)

#### Set up
    npm install
    cp config-sample.js config.js
    bash setup.sh

### Get shapefiles for all countries from gadm.org
- Downloads [gadm](http://gadm.org) series 2.8 zipped shapefiles for each country.
- Unzips them to directory specified in config.js

`node download_shapefiles_from_gadm.js -s gadm2-8`

Zipped shape files will be downloaded to directory in data directory.

### Import shapefiles to postgres
- Creates a database in postgres for every country
- Imports the highest admin level shapefile to country database.

#### [Install postgres](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-postgresql-on-ubuntu-16-04)
`sudo apt-get install postgis`

##### Install GDAL/OGR on ubuntu  
`sudo add-apt-repository ppa:ubuntugis/ppa && sudo apt-get update`  
`sudo apt-get install gdal-bin`


`node import_shapefiles_to_postgres.js -s gadm2-8`


### Convert shapefiles to geojson
`node shapefile_to_geojson -s gadm2-8`

  `rm  ./data/geojson/gadm2-8/CAN_0.json; ogr2ogr -f GeoJSON data/geojson/gadm2-8/CAN_0.json data/shapefiles/CAN/CAN_adm0.shp`
  `rm  ./data/geojson/gadm2-8/CAN_1.json; ogr2ogr -f GeoJSON data/geojson/gadm2-8/CAN_1.json data/shapefiles/CAN/CAN_adm1.shp`
  `rm  ./data/geojson/gadm2-8/CAN_2.json; ogr2ogr -f GeoJSON data/geojson/gadm2-8/CAN_2.json data/shapefiles/CAN/CAN_adm2.shp`
  `rm  ./data/geojson/gadm2-8/CAN_3.json; ogr2ogr -f GeoJSON -lco COORDINATE_PRECISION=8 data/geojson/gadm2-8/CAN_3.json data/shapefiles/CAN/CAN_adm3.shp`

  `rm  ./data/geojson/gadm2-8/CHL_0.json; ogr2ogr -f GeoJSON data/geojson/gadm2-8/CHL_0.json data/shapefiles/CHL/CHL_adm0.shp`
  `rm  ./data/geojson/gadm2-8/CHL_1.json; ogr2ogr -f GeoJSON data/geojson/gadm2-8/CHL_1.json data/shapefiles/CHL/CHL_adm1.shp`
  `rm  ./data/geojson/gadm2-8/CHL_2.json; ogr2ogr -f GeoJSON data/geojson/gadm2-8/CHL_2.json data/shapefiles/CHL/CHL_adm2.shp`
  `rm  ./data/geojson/geojson/gadm2-8/CHL_3.json; ogr2ogr -f GeoJSON data/geojson/gadm2-8/CHL_3.json data/shapefiles/CHL/CHL_adm3.shp`
  `rm  ./data/geojson/gadm2-8/USA_0.json; ogr2ogr -f GeoJSON data/geojson/gadm2-8/USA_0.json data/shapefiles/USA/USA_adm0.shp`
  `rm  ./data/geojson/gadm2-8/USA_1.json; ogr2ogr -f GeoJSON data/geojson/gadm2-8/USA_1.json data/shapefiles/USA/USA_adm1.shp`
  `rm  ./data/geojson/gadm2-8/USA_2.json; ogr2ogr -f GeoJSON data/geojson/gadm2-8/USA_2.json data/shapefiles/USA/USA_adm2.shp`
  `rm  ./data/geojson/gadm2-8/AUS_2.json; ogr2ogr -f GeoJSON data/geojson/gadm2-8/AUS_2.json data/shapefiles/AUS/AUS_adm2.shp`
  `rm  ./data/geojson/gadm2-8/THA_3.json; ogr2ogr -f GeoJSON data/geojson/gadm2-8/THA_3.json data/shapefiles/THA/THA_adm3.shp`
  `rm  ./data/geojson/gadm2-8/VNM_3.json; ogr2ogr -f GeoJSON data/ggeojson/adm2-8/VNM_3.json data/shapefiles/VNM/VNM_adm3.shp`
  `rm  ./data/geojson/gadm2-8/PRT_3.json; ogr2ogr -f GeoJSON data/geojson/gadm2-8/PRT_3.json data/shapefiles/PRT/PRT_adm3.shp`
  `rm  ./data/geojson/gadm2-8/ZAF_4.json; ogr2ogr -f GeoJSON data/geojson/gadm2-8/ZAF_4.json data/shapefiles/ZAF/ZAF_adm4.shp`
