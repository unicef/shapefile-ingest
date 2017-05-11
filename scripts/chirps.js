var async = require('async');
var bluebird = require('bluebird');
var moment = require('moment');
var config = require('../config');
var ftp = require('ftp-get')
var targz = require('targz');
var fs = require('fs');
var exec = require('child_process').exec;
var save_to_dir = config.save_to_dir + 'precipitation/chirps/'

function download(obj) {
  return new Promise((resolve, reject) => {
    async.waterfall([
      function(callback) {
        console.log(obj.url)
        ftp.get(obj.url,  obj.dir + obj.file_name, function (err, res) {
          if (err) {
            console.log(err, '****')
          }
          callback();
        })
      },

      function(callback) {
        var command = 'gunzip ' + save_to_dir + obj.file_name;
        exec(command, (err, stdout, stderr) => {
          if (err) {
            console.error(err);
          }
          callback();
        });
      },

      function(callback) {
        var command = 'node aggregate_raster_by_all_countries.js --tif ' + obj.day + ' -s chirps -k precipitation -m mean';
        console.log(command);
        exec(command, (err, stdout, stderr) => {
          if (err) {
            console.error(err);
          }
          callback();
        });
      },

      function(callback) {
        var command = 'rm ' + save_to_dir + obj.file_name.replace(/.gz/, '');
        console.log(command);
        exec(command, (err, stdout, stderr) => {
          if (err) {
            console.error(err);
          }
          callback();
        });
      },
    ], function (err, result) {
      setTimeout(() => {return resolve();}, 300)
        // result now equals 'done'
    });

  })
}

var dates = [];
var c = 0;
var year = 2017;
var file_type = '.tif.gz';

while(c < 365) {
  var day = moment(year + '-01-01').add(c, 'days').format('YYYY.MM.DD');
  // if (day === moment('2015-11-01').format('YYYY.MM.DD')) {
  //   file_type = '.tif';
  //   var dir = './data/tif/';
  // }
  var url = 'ftp://chg-ftpout.geog.ucsb.edu/pub/org/chg/products/CHIRPS-2.0/global_daily/tifs/p05/' + year + '/chirps-v2.0.' + day + file_type;

  dates.push(
    {
      url: url,
      type: file_type,
      dir: save_to_dir,
      day: day,
      year: year,
      file_name: day + file_type
    }
  )
  c++;
}
bluebird.each(dates, (obj, index) => {
  return download(obj);
}, {concurrency: 1})
.then(() => {
  console.log('done with all')
})
