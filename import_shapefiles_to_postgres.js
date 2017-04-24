// Create a database in postgres for every country
// Import the highest admin level shapefile to country database.

//node import_shapefiles_to_postgres.js -s gadm2-8
var ArgumentParser = require('argparse').ArgumentParser;
var config = require('./config');
var fs = require('fs');
var bluebird = require('bluebird');
var exec = require('child_process').exec;

var parser = new ArgumentParser({
  version: '0.0.1',
  addHelp: true,
  description: 'Aggregate a csv of airport by admin 1 and 2'
});

parser.addArgument(
  ['-s', '--source'],
  {help: 'Shapefile source. Example: gadm2-8'}
);

var args = parser.parseArgs();
var source = args.source;
var shapefile_dir = config.shapefile_dir + source;
console.log(shapefile_dir)
var shapefile_dirs = fs.readdirSync(shapefile_dir);

// Scan each country shapeefile directory for highest admin level shapefile.
var wanted_files = shapefile_dirs.reduce(
  (h, iso) => {
    h[iso] = fs.readdirSync(shapefile_dir + '/' + iso).filter( f => {
      return f.match('shp$');
    }).sort((a, b) => {
      var first = a.match(/\d/)[0];
      var second = b.match(/\d/)[0];
      return second - first;
    })[0]
    return h;},
  {})

bluebird.each(Object.keys(wanted_files), function(country, i) {
  return import_shapefile(country, wanted_files[country]);
}, {concurrency: 1})
.catch(console.log)
.then(() => {
  console.log('Done with import of admins.');
  process.exit();
});

/**
 * Get list of countries you need shapefiles for, then fetch them.
 * TODO Destroy local file on upload complete
 * @param{String} country - 3 letter country ISO code taken from wikipedia
 * @param{Integer} admin_level - admin level
 * @return{Promise} Fulfilled when all
 */
function import_shapefile(country, shapefile) {
  return new Promise((resolve, reject) => {
    var admin_level = shapefile.match(/\d/)[0];
    var command = 'bash lib/create_db.sh ' + country.toLowerCase() + ' ' + shapefile + ' ' + admin_level + ' ' + shapefile_dir;
    console.log(command)
    // resolve();
    exec(command,{maxBuffer: 2048 * 2500}, (err, stdout, stderr) => {
      if (err) {
        console.error(err);
        return reject(err);
      }
      resolve();
      console.log(stdout);
    });
  });
}
