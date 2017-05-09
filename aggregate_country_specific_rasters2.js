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
// var command = 'psql -l -t | cut -d'|' -f1 ';
var command = "psql -lqt  | grep _";
var pg_config = config.pg_config;

// Get array of 3 letter iso country codes for which a db exists in postgres.
country_table_names()
.then(tables => {
  bluebird.each(Object.keys(tables), (country, i) => {
    return process_tables(country, tables[country]).then(() => {
      // Drop raster from table if exists
      drop_raster_table('all_countries', 'pop');
    });
  }, {concurrency: 1})
  .then(process.exit);
});

function country_table_names() {
  return new Promise((resolve, reject) => {
    var results = [];
    console.log('About to query...');
    pg.connect(pg_config, (err, client, done) => {
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
            if (h[country]) {
              h[country].push(e);
            } else {
              h[country] = [e];
            }
            //h[country] = h[country] ? h[country].push(e) : [e];
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
      if (!tif_file) { return resolve();}
      console.log(country_tables, '!!!!');
      bluebird.each(country_tables, table => {
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

function customize_to_shapefile_source_specific_properties(st, admin_level, source) {
  switch(source) {
    case 'gadm2-8':
      for(var i = 0; i <= admin_level; i++) {
        st += '"' + admin_table + '"' + '.ID_' + i + ', ';
      }
      return st;
      break;
    // case 'santiblanko':
    //   return st += '"' + admin_table + '"' + '.dpto as ID_1,' + '"' + admin_table + '"' + '.wcolgen02_ as ID_2, '

    default:
      return st;
  }
}

function form_select_command(admin_table, shapefile_source) {
  var admin_level = parseInt(admin_table.match(/\d/)[0]);
  var st;
  console.log(admin_level, shapefile_source, '****')
  switch(shapefile_source) {
    case 'gadm2-8':
      st = 'SELECT gid, ST_Area(geom::geography)/1609.34^2 AS kilometers, ';
      st = customize_to_shapefile_source_specific_properties(st, admin_table, admin_level, shapefile_source);
      st += 'SUM((ST_SummaryStats(ST_Clip(rast, geom))).sum) FROM "' +
      admin_table +
      '" LEFT JOIN pop ON ST_Intersects("' + admin_table +
      '".geom, pop.rast) GROUP BY gid;';
      return st;
      break
    case 'santiblanko':
      // return "SELECT ST_Area(col_2_santiblanko.wkb_geometry::geography)/1609.34^2 AS kilometers, dpto, wcolgen02_ as id_2, SUM((ST_SummaryStats(ST_Clip(rast, wkb_geometry, -9999))).sum) FROM col_2_santiblanko LEFT JOIN pop ON ST_Intersects(col_2_santiblanko.wkb_geometry, pop.rast) GROUP BY id_1, id_2, kilometers;"
      return "SELECT ST_Area(col_2_santiblanko.wkb_geometry::geography)/1609.34^2 AS kilometers, dpto, wcolgen02_, SUM((ST_SummaryStats(ST_Clip(rast, wkb_geometry, -9999))).sum) FROM col_2_santiblanko LEFT JOIN pop ON ST_Intersects(col_2_santiblanko.wkb_geometry, pop.rast) GROUP BY dpto, wcolgen02_, kilometers;"
    default:
      return st;
  }
}

function scan_raster(country, admin_table, tif_file) {
  return new Promise((resolve, reject) => {
    var results = [];
    config.database = country;
    pg.connect(pg_config, (err, client, done) => {
      var shapefile_source = admin_table.split('_')[admin_table.split('_').length-1];
      var st = form_select_command(admin_table, shapefile_source);
      var query = client.query(st);

      // Stream results back one row at a time
      query.on('row', (row) => {
        console.log(row);
        results.push(row);
      });
      // After all data is returned, close connection and return results
      query.on('end', () => {
        var pop_sum = parseInt(results.reduce((s, r) => { return s + r.sum }, 0));
        var kilo_sum = parseInt(results.reduce((s, r) => { return s + r.kilometers}, 0));
        var file = save_to_dir + 'population/' + tif_source + '/' + shapefile_source + '/' +
        admin_table.replace(/^admin/, country) +
        '^' + tif_file +
        '^' + tif_source +
        '^' + pop_sum +
        '^' + kilo_sum +
        '.json';

        fs.writeFile(file,
        JSON.stringify(results), (err) => {
          if (err) console.log(err)
          console.log('done!', country, admin_table)
          done();
          return resolve(country);
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
