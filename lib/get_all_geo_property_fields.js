var config = require('../config');
var geo_properties_dir = config.geo_properties_dir;
var fs = require('fs');
var readjson = require('readjson')
var shapefile_set = 'gadm2-8'

// Scan each country shapeefile directory for highest admin level shapefile.
var columns = fs.readdirSync(geo_properties_dir + '/' + shapefile_set).reduce((h, file) => {
  // Not sure while geo props file is an array.
  var fields = readjson.sync(geo_properties_dir + '/' + shapefile_set + '/' + file);
  Object.keys(fields[0]).forEach(f => {
    h[f] = h[f] ? h[f] + 1 : 1;
  })
  return h;
}, {})

var columns = Object.keys(columns).map(e => {
    return e + " CHAR(150)"
  }).join(',')

console.log(columns)
// exports.get_geo_property_fields = () => {
//   return columns;
// }
