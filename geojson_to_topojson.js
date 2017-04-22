//  node --max_old_space_size=2048 geojson_to_topojson.js -s gadm2-8 -t 0.1
var config = require('./config');
var fs = require('fs');
var jsonfile = require('jsonfile');
var simplify = require('simplify-geojson')
var topojson = require('topojson');
var custom_tolerence = {
  AUS: 0.05,
  BRA: 0.05,
  CAN: 0.05,
  FRA: 0.05,
  BRA: 0.05
}
var ArgumentParser = require('argparse').ArgumentParser;
var bluebird = require('bluebird');
var async = require('async');
var geojson_dir = config.geojson_dir;
var topojson_dir = config.topojson_dir;

var parser = new ArgumentParser({
  version: '0.0.1',
  addHelp: true,
  description: 'Aggregate a csv of airport by admin 1 and 2'
});

parser.addArgument(
  ['-s', '--source'],
  {help: 'String: shapefile set source'}
);

parser.addArgument(
  ['-t', '--tolerance'],
  {help: 'Number: in degrees (e.g. lat/lon distance) eg 0.005'}
);

var args = parser.parseArgs();
var source = args.source;
var tolerance = args.tolerance;
var topo_source_dir = topojson_dir + source;


var geo_files = fs.readdirSync(geojson_dir).filter(f => { return f.match(/json/);})

bluebird.each(geo_files, f => {
  return process_file(f);
}, {concurrency: 1}).then(() => {
  console.log('done!');
});

function process_file(f) {
  return new Promise((resolve, reject) => {
    async.waterfall([
      function(callback) {
        read_jsonfile(geojson_dir + f)
        .then(geojson => {
          callback(null, geojson);
        });
      },
      function(geojson, callback) {
        var country = f.match(/[A-Z]{3}/)[0]
        console.log(country)
        var geojson = simplify(geojson, custom_tolerence[country] || tolerance);
        topojsonize(geojson, f)
        .then(callback);
      }
    ], function (err, result) {
      resolve();
    });
  })
}

function topojsonize(feature_collection, f) {
  return new Promise(function(resolve, reject) {
    var c = topojson.topology(
      {collection: feature_collection},
      {
        'property-transform': function(object) {
          console.log(!!object)
          return object.properties
        }
      });

      // var unsimplified = JSON.parse(JSON.stringify(c));  // copy data
      // topojson.simplify(c, {
      //   'coordinate-system': 'spherical',
      //   'retain-proportion': 0.2
      // });

      // topojson.simplify(c, {quantization: '1e4', simplify: '1e-8'})
      jsonfile.writeFile(topo_source_dir + '/' + f, c, (err, data) => {
        resolve();
      });
  });
}

/**
 * Read geojson file
 *
 * @param{string} geojson - geojson file with path
 * @param{bool} verbose - Option to display debug
 * @return{Promise} Fulfilled when geojson is returned.
 */
function read_jsonfile(geojson) {
  return new Promise(function(resolve, reject) {
    jsonfile.readFile(geojson, function(err, feature_collection) {
      if (err) {
        return reject(err);
      }
      resolve(feature_collection);
    });
  });
}
