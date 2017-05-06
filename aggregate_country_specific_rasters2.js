// node aggregate_country_specific_rasters_by_admin2.js
var async = require('async');
var bluebird = require('bluebird');
var pg = require('pg');
var fs = require('fs');
var tif_source = 'worldpop';
var exec = require('child_process').exec;
var config = require('./config');
var aggregations_dir = config.aggregations_dir;
// var command = 'psql -l -t | cut -d'|' -f1 ';
var command = "psql -lqt  | grep _";
var config = config.pg_config;
var connectionString = 'postgres://localhost:5432/all_countries';
config.database = 'all_countries';

// Get array of 3 letter iso country codes for which a db exists in postgres.
country_table_names()
.then(tables => {
  bluebird.each(Object.keys(tables).filter(c=> { console.log(c, '!!!');return c.match(/col/)}), (country, i) => {
    return process_tables(country, tables[country]).then(() => {
      // Drop raster from table if exists
      // drop_raster_table(country, 'pop');
    });
  }, {concurrency: 1})
  .then(process.exit);
});

function country_table_names() {
  return new Promise((resolve, reject) => {
    var results = [];
    console.log('About to query...');

    pg.connect(config, (err, client, done) => {

      var st = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';";
      var query = client.query(st);
      // Stream results back one row at a time
      query.on('row', (row) => {
        results.push(row);
      });
      // After all data is returned, close connection and return results
      query.on('end', () => {
        resolve(results.filter(
          r => { return r.table_name.match(/[a-z]{3}_\d/);}
          )
          .map(r => { return r.table_name})
          .reduce((h, e) => {
            var country = e.match(/[a-z]{3}/)[0];
            h[country] = h[country] ? h[country].push(e) : [e];
            return h;
          }, {})
        );
      });
    });
  });
}

function tiff_file_name(content) {
  var ary = content.split(/\//);
  return ary[ary.length-1].replace(/.tif\n/g, '');
}

function process_tables(country, country_tables) {
  return new Promise((resolve, reject) => {
    fetch_raster(country)
    .then(tif_file => {
      bluebird.each(country_tables, table => {
        return scan_raster(country, table, connectionString, tif_file);
      }, {concurrency: 1})
      .then(resolve)
    })
  })
}

function fetch_raster(country) {
  return new Promise((resolve, reject) => {
    // return resolve('popmap15adj');
    // Execute bash script to fetch population raster for country
    // unzips it before importing it to country db in postgres
    // as table named 'pop'
    var command = 'bash ./lib/fetch_and_process_raster.sh ' + country + ' ' + aggregations_dir + ' population';
    exec(command,{maxBuffer: 4096 * 2500}, (err, stdout, stderr) => {
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

function customize_to_shapefile_source_specific_properties(st, admin_table) {
  var admin_level = parseInt(admin_table.match(/\d/)[0]);
  var source = admin_table.split('_')[admin_table.split('_').length-1];
  switch(source) {
    case 'gadm2-8':
      for(var i = 0; i <= admin_level; i++) {
        st += '"' + admin_table + '"' + '.ID_' + i + ', ';
      }
      return st;
      break
    case 'santiblanko':
      return st += '"' + admin_table + '"' + '.dpto as ID_1,' + '"' + admin_table + '"' + '.wcolgen02_ as ID_2, '
    default:
      return st;
  }

}

function scan_raster(country, admin_table, connectionString, tif_file) {
  return new Promise((resolve, reject) => {
    var results = [];
    config.database = country;
    pg.connect(config, (err, client, done) => {
      var st = 'SELECT gid, ST_Area(geom::geography)/1609.34^2 AS kilometers, ';

      st = customize_to_shapefile_source_specific_properties(st, admin_table);
      st += 'SUM((ST_SummaryStats(ST_Clip(rast, geom))).sum) FROM "' +
      admin_table +
      '" LEFT JOIN pop ON ST_Intersects("' + admin_table +
      '".geom, pop.rast) GROUP BY gid;';
      console.log(st);
      process.exit()
      var query = client.query(st);

      // Stream results back one row at a time
      query.on('row', (row) => {
        console.log(row);
        results.push(row);
      });
      // After all data is returned, close connection and return results
      query.on('end', () => {
        // content = content + results.map(r => {return [file, r.sum || 0, r.dpto, r.wcolgen02_, 'col_0_' + r.dpto + '_' + r.wcolgen02_ + '_santiblanko'].join(" ") }).join("\n")
        // Get population for whole country to store in file name
        var pop_sum = parseInt(results.reduce((s, r) => { return s + r.sum }, 0));
        var kilo_sum = parseInt(results.reduce((s, r) => { return s + r.kilometers}, 0));
        fs.writeFile(aggregations_dir + '/population/processed/' +
        admin_table.table_name.replace(/^admin/, country) +
        '^' + tif_file +
        '^' + tif_source +
        '^' + pop_sum +
        '^' + kilo_sum +
        '.json',
        JSON.stringify(results), (err) => {
          if (err) console.log(err)
          console.log('done!', country, admin_table)
          exec('rm -r ' + aggregations_dir + '/human/' + country + '*', function (err, stdout, stderr) {
            done();
            resolve();
          });
        });
      });
    });
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
