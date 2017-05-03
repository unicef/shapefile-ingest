// node aggregate_raster_by_all_countries.js --tif aegypti -s simon_hay -m mean -f gadm2-8
var async = require('async');
var bluebird = require('bluebird');
var pg = require('pg');
var fs = require('fs');
var ArgumentParser = require('argparse').ArgumentParser;
var exec = require('child_ss').exec;
var command = 'psql all_countries -c "\\dt" ';
var config = require('./config').pg_config;
var save_to_dir = config.save_to_dir;
var parser = new ArgumentParser({
  version: '0.0.1',
  addHelp: true,
  description: 'Aggregate a csv of airport by admin 1 and 2'
});

parser.addArgument(
  ['-t', '--tif'],
  {help: 'Name of tif to import'}
);
parser.addArgument(
  ['-s', '--source'],
  {help: 'Source of tif to import'}
);

parser.addArgument(
  ['-m', '--sum_or_mean'],
  {help: 'sum or mean'}
)

parser.addArgument(
  ['-f', '--shapefile'],
  {help: 'Shapefile source: gadm2-8'}
)

var args = parser.parseArgs();
var tif = args.tif;
var tif_source = args.source;
var shapefile_source = args.source;
var sum_or_mean = args.sum_or_mean;

function execute_command(command) {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error(err);
      }
      resolve(stdout);
    });
  });
}

// Get list of country for which exists a table in all_countries db.
function country_db_names() {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error(err);
      }
      resolve(
        stdout.split(/\n/)
        .map(e => { return e.replace(/\s+/g, '');})
        .map(e => {
          return e.split('|')[1];
        })
        .filter(e => {
          return !!e && e.match(/[a-z]{3}_\d/);
        })
      );
    });
  });
}

async.waterfall([
  function(callback) {
    // Use EPSG:4326 SRS, tile into 100x100 squares, and create an index
    var command = 'psql all_countries -c "DROP TABLE IF EXISTS pop"';
    execute_command(command)
    .then(response => {
      console.log(response);
      callback();
    });
  },

  function(callback) {
    console.log('About to add ', tif)
    // Use EPSG:4326 SRS, tile into 100x100 squares, and create an index
    var command = "raster2pgsql -Y -s 4326 -t 100x100 -I data/aegypti/" + tif + ".tif pop | psql all_countries";
    execute_command(command)
    .then(response => {
      console.log(response);
      callback();
    });
  },

  function(callback) {
    country_db_names()
    .then(admin_source_tables => {
      bluebird.each(admin_source_tables, t => {
        [country, admin_level, shp_source] = t.split(/_/);
        return scan_raster(country, admin_level, shp_source);
      }, {concurrency: 1})
      .then(() => {
        callback();
      });
    });
  },
  function(callback) {
    // Use EPSG:4326 SRS, tile into 100x100 squares, and create an index
    var command = 'psql all_countries -c "DROP TABLE IF EXISTS pop"'
    execute_command(command)
    .then(response => {
      console.log(response);
      callback();
    });
  }
], function() {
  console.log('done!');
  ss.exit()
});

function scan_raster(country, admin_level, shp_source) {
  var table = [country, admin_level, shp_source].join('_');

  var results = [];
  console.log('About to query...');

  return new Promise((resolve, reject) => {
    pg.connect(config, (err, client, done) => {

      var aggregation = sum_or_mean === 'sum' ? 'SUM((ST_SummaryStats(ST_Clip(rast, geom))).sum)' : '(ST_SummaryStats(ST_Clip(rast, geom))).mean';

      var st = 'SELECT gid, ST_Area(geom::geography)/1609.34^2 AS kilometers,';
      for(var i = 0; i <= admin_level; i++) {
        st += '"' + table + '"' + '.ID_' + i + ', ';
      }

      st += aggregation + ' FROM "' +
      table +
      '" LEFT JOIN pop ON ST_Intersects("' + table +

      '".geom, pop.rast) GROUP BY gid';

      if (sum_or_mean === 'sum' ) {
        st += 'sum';
      } else {
        st += ', mean;';
      }

      var query = client.query(st);
      console.log(st);
      // Stream results back one row at a time
      query.on('row', (row) => {
        results.push(row);
      });
      // After all data is returned, close connection and return results
      query.on('end', () => {
       // var pop_sum = parseInt(results.reduce((s, r) => { return s + r.sum }, 0));
        var kilo_sum = parseInt(results.reduce((s, r) => { return s + r.kilometers}, 0));
        var results2 = results.map(e => { console.log(e, '***', sum_or_mean, e[sum_or_mean]) ;return e[sum_or_mean];});

        var sum = 0;
        var amount = null;
        results2.forEach(e => { if (e) { sum += e;}});

        if (sum_or_mean === 'mean') {
          var avg = 0;
          if (sum) {
            avg = sum/results2.length;
          }
          amount =  Math.ceil(avg * 100000) / 100000;
        } else {
          amount = sum;
        }

        // content = content + results.map(r => {return [file, r.sum || 0, r.dpto, r.wcolgen02_, 'col_0_' + r.dpto + '_' + r.wcolgen02_ + '_santiblanko'].join(" ") }).join("\n")
        fs.writeFile(save_to_dir + shapefile_source + '/' +
        country + '^' + table +
        '^' + tif +
        '^' + tif_source +
        '^' + amount +
        '^' + kilo_sum +
        '.json',
        JSON.stringify(results), (err) => {
          if (err) console.log(err)
          console.log('done!', country, table)
          done();
          resolve();
        });
      });
    });
  })
}
