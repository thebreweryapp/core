const fs = require('fs');
const path = require('path');

/**
 * Reads files in a directory recursively and 
 * stores in an object with the file name as key
 * 
 * @param {String} sourceDir 
 * @param {Object} files 
 */
const recursiveReadObj = (sourceDir, files = {}) => {
  fs.readdirSync(sourceDir)
    .filter((file) => {
      return (file.indexOf('.') !== 0) && fs.statSync(path.join(sourceDir, file)).isDirectory() ? true : file.slice(-3) === '.js';
    })
    .forEach(file => { const deb = path.join(sourceDir, file)
      if(fs.statSync(path.join(sourceDir, file)).isDirectory()) {
        recursiveReadObj(path.join(sourceDir, file), files);
      } else {
        files[file.split('.')[0]] = require(path.join(sourceDir, file));
      }
    });
  return files;
};


/**
 * Reads files in a directory recursively and 
 * stores in an Array
 * 
 * @param {String} sourceDir 
 * @param {Object} files 
 */
const recursiveReadArr = (sourceDir, files = []) => {
  fs.readdirSync(sourceDir)
    .filter((file) => {
      return (file.indexOf('.') !== 0) && fs.statSync(path.join(sourceDir, file)).isDirectory() ? true : file.slice(-3) === '.js';
    })  
    .forEach(file => {
      fs.statSync(path.join(sourceDir, file)).isDirectory()
        ? recursiveReadArr(path.join(sourceDir, file), files)
        : files.push(require(path.join(sourceDir, file)));

  });
  return files;
};


/**
 * reads files from directories
 * @param {Array} sources 
 * @return {Array}
 */
const readFiles = (sources, obj = true) => {
  let reader = recursiveReadArr;
  let accumulator = [];
  if(obj) {
    reader = recursiveReadObj;
    accumulator = {};
  }

  return sources.reduce((acc, sourceDir) => {
    return reader(sourceDir, acc);
  }, accumulator);
};

module.exports = readFiles;