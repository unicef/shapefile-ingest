#!/bin/bash
# Used by psql_import_shapefiles


upper=`echo "$1" | tr /a-z/ /A-Z/`
upper_to_file=$upper'_adm';

# Check if database exists...
if [ -z $(psql -lqt | cut -d \| -f 1 | grep $1) ]; then
	echo "Database doesn't exist, creating it now..."
	createdb $1
	psql $1 -c "CREATE EXTENSION postgis;"
fi
#
# # Drop the table if it exists
psql $1 -c 'DROP TABLE IF EXISTS admin_' + $2 + ';'

echo data/unzipped/$upper/$upper_to_file$2
shp2pgsql -s 4326 -D -I data/unzipped/$upper/$upper_to_file$2 admin_$2_$3 | psql $1
