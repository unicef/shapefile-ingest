// node upload_jsons_to_blob.js -k aegypti -d aegypti
// node upload_jsons.js -k topojson -s gadm2-8

var ArgumentParser = require('argparse').ArgumentParser;
var azure_storage = require('azure-storage');
var config = require('./config');
var bluebird = require('bluebird');
var fs = require('fs');

var parser = new ArgumentParser({
  version: '0.0.1',
  addHelp: true,
  description: 'Aggregate a csv of airport by admin 1 and 2'
});

parser.addArgument(
  ['-k', '--kind'],
  {help: 'Kind of json: geojson or topojson'}
);
parser.addArgument(
  ['-s', '--source'],
  {help: 'Name of container with json to import'}
);
var args = parser.parseArgs();
var kind = args.kind;

var azure_key = config[kind].azure.key1;
var storage_account = config[kind].azure.storage_account;
var blobSvc = azure_storage.createBlobService(storage_account, azure_key);
var source = args.source;
var json_dir = config[kind].directory + source;//'./data/aggregations/' + kind + '/processed'// + json_src;
var files = fs.readdirSync(json_dir).filter(f => { return f.match(/j/);});

bluebird.each(files, function(file, i) {
  return upload_blob(file, i);
}, {concurrency: 1}).catch(function(err) {console.log(err);})
.then(() => {
  console.log('Done!');
  process.exit();
});

function upload_blob(file, i) {
  console.log(i, file);
  return new Promise(function(resolve, reject) {
    blobSvc.createBlockBlobFromLocalFile(source, file, json_dir + '/' + file, function(err){
      if (err) {
        return reject(err);
      } else{
        resolve();
      }
    });
  });
}
