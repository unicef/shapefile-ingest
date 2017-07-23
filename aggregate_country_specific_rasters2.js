// node aggregate_country_specific_rasters2.js
var async = require('async');
var bluebird = require('bluebird');
var pg = require('pg');
var fs = require('fs');
var tif_source = 'worldpop';
var exec = require('child_process').exec;
var config = require('./config');
var aggregations_dir = config.aggregations_dir;
var save_to_dir = config.save_to_dir;
var save_raster_dir = config.save_raster_dir;
var table_names = require('./shared/table_names');
var jsonfile = require('jsonfile');
// var command = 'psql -l -t | cut -d'|' -f1 ';
var command = "psql -lqt  | grep _";
var pg_config = config.pg_config;

var ArgumentParser = require('argparse').ArgumentParser;
var parser = new ArgumentParser({
  version: '0.0.1',
  addHelp: true,
  description: 'Aggregate a csv of airport by admin 1 and 2'
});

parser.addArgument(
  ['-c', '--continue'],
  {help: 'Continue from last file in save directory'}
)

var args = parser.parseArgs();
var continue_from_last = args.continue;

var default_save_dir = save_to_dir + 'population/' + tif_source + '/' + 'gadm2-8'
var current_country_codes = fs.readdirSync(default_save_dir).map(f => { return f.match(/^[a-z]{3}/)[0]; })

// Get array of 3 letter iso country codes for which a table exists in postgres.
table_names.country_table_names(pg_config)
.then(tables => {
  var wanted_country_codes = Object.keys(tables);
  if (continue_from_last) {
    wanted_country_codes = wanted_country_codes.filter(c => { current_country_codes.filter(e => { return a.indexOf(e) === -1}); })
  }
  bluebird.each(Object.keys(tables), (country, i) => {
    return process_tables(country, tables[country]).then(() => {
      // Drop raster from table if exists
      drop_raster_table('all_countries', 'pop');
    });
  }, {concurrency: 1})
  .then(process.exit);
});

function tiff_file_name(content) {
  var ary = content.split(/\//);
  return ary[ary.length-1].replace(/.tif\n/g, '');
}

function process_tables(country, country_tables) {
  return new Promise((resolve, reject) => {
    fetch_raster(country)
    .then(tif_file => {
      console.log(tif_file, '!!!')
      if (!tif_file) { return resolve();}
      bluebird.each(country_tables, table => {
        console.log(country_tables)
        return scan_raster(country, table, tif_file);
      }, {concurrency: 1})
      .then(() => {
        exec('rm -r ' + aggregations_dir + 'population/' + country + '*', function (err, stdout, stderr) {
          resolve();
        });
      })
    })
  })
}

function fetch_raster(country) {
  return new Promise((resolve, reject) => {
    // return resolve('COL_ppp_v2b_2015_UNadj')
    // return resolve('popmap15adj');
    // Execute bash script to fetch population raster for country
    // unzips it before importing it to country db in postgres
    // as table named 'pop'
    var command = 'bash ./lib/fetch_and_process_raster.sh ' + country + ' ' + aggregations_dir + ' population ' + save_raster_dir;
    console.log(command);

    exec(command,{maxBuffer: 4096 * 2500}, (err, stdout, stderr) => {
      console.log(err, stdout, stderr)
      var tif_file = tiff_file_name(stdout);
      if (err) {
        console.error(err);
        callback();
        return;
      }
      // Remove unzipped directory if tif is corrupt
      if (tif_file.length < 4) {
        var command = 'rm -rf ' + aggregations_dir + 'population/' + country + '*';
        exec(command,{maxBuffer: 2048 * 1500}, (err, stdout, stderr) => {
          resolve();
        });
      } else {
        resolve(tif_file);
      }
    });
  })
}

function scan_raster(country, admin_table, tif_file) {
  return new Promise((resolve, reject) => {
    var results = [];
    config.database = country;
    pg.connect(pg_config, (err, client, done) => {
      var shapefile_source = admin_table.split('_')[admin_table.split('_').length-1];
      var st = table_names.form_select_command(admin_table, shapefile_source, 'sum');

      var query = client.query(st);

      // Stream results back one row at a time
      query.on('row', (row) => {
        console.log(row);
        results.push(row);
      });
      // After all data is returned, close connection and return results
      query.on('end', () => {
        form_filename(country, shapefile_source, admin_table, tif_file, results)
        .then(filename => {
          fs.writeFile(filename,
          JSON.stringify(results), (err) => {
            if (err) console.log(err)
            console.log('done!', country, admin_table)
            done();
            return resolve(country);
          });
        })
      });
    });
  })
}

function form_filename(country, shapefile_source, admin_table, tif_file, results) {
  return new Promise((resolve, reject) => {
    get_area_from_geojson(country)
    .then(kilo_sum_actual => {
      var pop_sum = parseInt(results.reduce((s, r) => { return s + r.sum }, 0));
      var kilo_sum_overlay = parseInt(results.reduce((s, r) => { return s + r.kilometers}, 0));
      console.log(kilo_sum_overlay, kilo_sum_actual);
      var file = save_to_dir + 'population/' + tif_source + '/' + shapefile_source + '/' +
      admin_table.replace(/^admin/, country) +
      '^' + tif_file +
      '^' + tif_source +
      '^' + pop_sum +
      '^' + kilo_sum_overlay +
      '^' + kilo_sum_actual +
      '.json';
      resolve(file);
    })
  })
}

function get_area_from_geojson(country) {
  return new Promise((resolve, reject) => {
    // var = geo_properties = require(config.geojson_properties_dir + country + '_0.json');
    jsonfile.readFile(config.geo_properties_dir + 'gadm2-8/' + country + '_0.json', (err, obj) => {
      if (err) {
        return reject(err);
      }
      resolve(obj[0].SQKM);
    })
  })
}

function drop_raster_table(country, kind) {
  var command = 'bash ./lib/drop_raster_table.sh ' + country + ' ' + kind
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      console.log(stdout)
      if (err) {
        console.error(err);
        resolve();
      }
      resolve()
    });
  });
}
