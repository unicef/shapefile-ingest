// node shapefile_to_geojson -s gadm2-8
// node shapefile_to_geojson -s gadm2-8 -p true
var ArgumentParser = require('argparse').ArgumentParser;
var bluebird = require('bluebird');
var config = require('./config');
var fs = require('fs');

var mkdirp = require('mkdirp');
var ogr2ogr = require('ogr2ogr');


var parser = new ArgumentParser({
  version: '0.0.1',
  addHelp: true,
  description: 'Aggregate a csv of airport by admin 1 and 2'
});

parser.addArgument(
  ['-s', '--source'],
  {help: 'Shapefile source. Example: gadm2-8'}
);

parser.addArgument(
  ['-p', '--properties_only'],
  {help: 'Properties only, no coordinates'}
);

var args = parser.parseArgs();
var source = args.source;
var just_properties = args.properties_only;
var shapefile_dir = config.shapefile_dir + source + '/';
var geojson_dir = (just_properties ? config.geo_properties_dir : config.geojson_dir) + source;

var shapefile_dirs = fs.readdirSync(shapefile_dir).filter(f => { return f.match(/[A-Z]{3}/)});

bluebird.each(shapefile_dirs, country => {
  return prepare_to_geojsonize(country);
}, {concurrency: 1})
.then(process.exit)
/**
 * Creates directory for country before saving geometry for each admin level
 * @param{String} country_code - 3 letter ISO country code
 * @return{Promise} Fulfilled -
 */
function prepare_to_geojsonize(country_code) {
  return new Promise((resolve, reject) => {
    // mkdirp(geojson_dir + country_code, err => {
    //   if (err){
    //     console.log(err);
    //     return reject(err);
    //   }
      // I'm just lazy.
      bluebird.each([0,1,2,3,4,5,6,7,8,9,10], level => {
        return geojsonize(country_code, level);
      }, {concurrency: 1})
      .then(resolve);
    // });
  });
};

/**
 * Converts shapefile to geojson
 * @param{String} country_code - 3 letter ISO country code
 * @param{String} admin_level - Level of admin
 * @return{Promise} Fulfilled -
 */
function geojsonize(country_code, admin_level) {
  var input = shapefile_dir + country_code + '/' + country_code + '_adm' + admin_level + '.shp';
  var output = geojson_dir + '/' + country_code + '_' + admin_level + '.json';
  console.log(input, output)
  return new Promise((resolve, reject) => {
    if (fs.existsSync(input)) {
      var ogr = ogr2ogr(input).timeout(500000);
      ogr.exec((err, data) => {
        if (err) {
         console.log(err);
         return resolve(err);
        }
        var content;
        if (just_properties) {
          content = data.features.map(e => {return e.properties;});
        } else {
          content = data;
        }
        
        fs.writeFile(output, JSON.stringify(content), function(err) {
          if (err) throw err;
          console.log('Finished with', country_code, admin_level)
          resolve();
        });
      });
    } else {
      resolve();
    }
  });
}
