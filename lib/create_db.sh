#!/bin/bash
# Used by psql_import_shapefiles


upper=`echo "$1" | tr /a-z/ /A-Z/`

# Check if database exists...
#if [ -z $(psql -lqt | cut -d \| -f 1 | grep $1) ]; then
	echo "Database doesn't exist, creating it now..."
	createdb $1
	psql $1 -c "CREATE EXTENSION postgis;"
#fi
#
# # Drop the table if it exists
psql $1 -c 'DROP TABLE IF EXISTS ' $1 + '_' + $3 + ';'

shp2pgsql -s 4326 -D -I $4/$upper/$2 $1_$3_gadm2-8 | psql $1


shp2pgsql -s 4326 -D -I AFG_0.json afg_0 | psql all_countries_one_db
