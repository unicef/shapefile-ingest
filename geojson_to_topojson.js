//  node --max_old_space_size=2048 geojson_to_topojson.js -s gadm2-8 -t 0.001
var config = require('./config');
var ArgumentParser = require('argparse').ArgumentParser;
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
  ['-t', '--tolerance'],
  {help: 'Number: in degrees (e.g. lat/lon distance) eg 0.005'}
);

var args = parser.parseArgs();
var source = args.source;
var tolerance = args.tolerance;

var fs = require('fs');
var jsonfile = require('jsonfile');
var simplify = require('simplify-geojson')
var topojson = require('topojson');
var custom_tolerance = {
  //AUS: 0.05,
  //  DEU: 0.01,
  //BRA: 0.05,
  //CAN: 0.05,
  //CHN: 0.02,
  //FRA: 0.03,
   //ESP: 0.005,
   CHL: 0.003,
  //GRL: 0.005,
  //  IND: 0.016,
  //ITA: 0.01,
  //RUS: 0.008,
  //MEX: 0.005,
    //MDG: 0.005,
   //PER: 0.005,
   //PHL: 0.03,
    //PRT: 0.003,
    //ROU: 0.005,
   //RWA: 0.01,
   //THA: 0.01
   //TZA: 0.005,
     //UGA: 0.005,
   
   //VNM: 0.01,
   //ZAF: 0.01,
   
}

var bluebird = require('bluebird');
var async = require('async');

var shapefile_dir = config.shapefile_dir + source + '/';
var geojson_dir = config.geojson_dir + source + '/';
var topojson_dir = config.topojson_dir + source + '/';


var geo_files = fs.readdirSync(geojson_dir).filter(f => { return f.match(/json/);})

bluebird.each(geo_files, f => {
  return process_file(f);
}, {concurrency: 1}).then(() => {
  console.log('done!');
});

function process_file(f) {
  var country = f.match(/[A-Z]{3}/)[0]
  return new Promise((resolve, reject) => {
    if (!custom_tolerance[country]) { return resolve()};
    async.waterfall([
      function(callback) {
        read_jsonfile(geojson_dir + f)
        .then(geojson => {
          callback(null, geojson);
        });
      },
      function(geojson, callback) {
        console.log(country,custom_tolerance[country] || tolerance )
        var geojson = simplify(geojson, custom_tolerance[country] || tolerance);
        
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
      jsonfile.writeFile(topojson_dir + '/' + f, c, (err, data) => {
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
