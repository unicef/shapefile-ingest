mkdir -p data/shapefiles
mkdir -p data/zipped
check_file() {
  local dir="$1"
  if [ -d "$dir" ]; then
      echo "yay: $dir found"
  else
      echo "Missing required $dir"
  fi
}
check_file 'data/shapefiles' $SHAPEFILES
check_file 'data/zipped' $ZIPPED_FILES
