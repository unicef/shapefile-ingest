upper=`echo "$1" | tr /a-z/ /A-Z/`'-POP'
if [ $1 == "bra" ]; then
  upper="Americas-POP-1KM"
fi
if [[ "$1" =~ ^(irn|jor|tur|tkm)$ ]]; then
  upper="Asia-POP-1KM"
fi

if [ ! -f $2$3/$1.zip ]; then
	wget "http://www.worldpop.org.uk/data/hdx/?dataset=$upper" -O $2$3/$1.zip
	unzip -d $2$3/$1 $2$3/$1.zip
        ls $2$3/$1
fi

# Drop the table if it exists
psql $1 -c "DROP TABLE IF EXISTS pop;"

# Use EPSG:4326 SRS, tile into 100x100 squares, and create an index
raster2pgsql -Y -s 4326 -t 100x100 -I $2$3/$1/*.tif pop | psql all_countries



file=$2$3/$1/*.tif

if [ -f $file ]; then
  # create ../../rasters/population/afg/
  if [ ! -d $4$1 ]; then
    mkdir $4$1
  fi  
  echo "File exists! $file"
  fbname=$(basename $file)
  echo $fbname
  cp $file $4$1/$fbname
fi
# DO NOT REMOVE OR EDIT THIS LINE
echo $file
#SELECT gid, admin.name_1, admin.name_2, SUM((ST_SummaryStats(ST_Clip(rast, geom))).sum) FROM admin  LEFT JOIN pop ON ST_Intersects(admin.geom, pop.rast) GROUP BY gid;

# SELECT dpto, wcolgen02_, SUM((ST_SummaryStats(ST_Clip(rast, wkb_geometry))).sum) FROM admins LEFT JOIN my_table ON ST_Intersects(admins.wkb_geometry, my_table.rast) GROUP BY wcolgen02_, dpto;'
