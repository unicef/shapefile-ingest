mkdir -p data/shapefiles
mkdir -p data/zipfiles
mkdir -p data/aggregations/human/processed
mkdir -p data/aggregations/aegypti/processed
mkdir -p data/geojson/gadm2-8
mkdir -p data/topojson/gadm2-8
mkdir -p data/shapefiles/gadm2-8

check_file() {
  local dir="$1"
  if [ -d "$dir" ]; then
      echo "yay: $dir found"
  else
      echo "Missing required $dir"
  fi
}
check_file 'data/shapefiles'
check_file 'data/zipfiles'
check_file 'data/aggregations/human'
check_file 'data/aggregations/human/processed'
check_file 'data/aggregations/aegypti/processed'
check_file 'data/geojson/gadm2-8'
check_file 'data/topojson/gadm2-8'
check_file 'data/shapefiles/gadm2-8'
