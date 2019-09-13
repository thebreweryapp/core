const fs = require('fs');
const path = require('path');

/**
 * Reads files in a directory recursively and 
 * stores in an object with the file name as key
 * 
 * @param {String} source 
 * @param {Object} files
 * 
 * @return {Promise} 
 */
const recursiveReadObj = (source, files = {}) => {
  return new Promise((resolve, reject) => {
    try {
      if(fs.statSync(source).isDirectory()) {
        fs.readdirSync(source)
        .filter((file) => {
          return (file.indexOf('.') !== 0) && fs.statSync(path.join(source, file)).isDirectory() ? true : file.slice(-3) === '.js';
        })
        .forEach(file => { const deb = path.join(source, file)
          if(fs.statSync(path.join(source, file)).isDirectory()) {
            recursiveReadObj(path.join(source, file), files);
          } else {
            files[file.split('.')[0]] = require(path.join(source, file));
          }
        });
      } else {
        const fileName = path.basename(source);
        const ext = fileName.slice(-3);
        if(ext !== '.js') {
          reject(`Invalid file ${fileName} in source ${source}`)
        }
        files[fileName.split('.')[0]] = require(source);
      }
    
      resolve(files);
    } catch(err) {
      reject(err);
    }
  });
};


/**
 * Reads files in a directory recursively and 
 * stores in an Array
 * 
 * @param {String} source 
 * @param {Object} files
 * 
 * @return {Promise}
 */
const recursiveReadArr = (source, files = []) => {
  return new Promise((resolve, reject) => {
    try {
      if(fs.statSync(source).isDirectory()) {
        fs.readdirSync(source)
          .filter((file) => {
            return (file.indexOf('.') !== 0) && fs.statSync(path.join(source, file)).isDirectory() ? true : file.slice(-3) === '.js';
          })  
          .forEach(file => {
            fs.statSync(path.join(source, file)).isDirectory()
              ? recursiveReadArr(path.join(source, file), files)
              : files.push(require(path.join(source, file)));
          });
      } else {
        const fileName = path.basename(source);
        const ext = fileName.slice(-3);
        if(ext !== '.js') {
          reject(`Invalid file ${fileName} in source ${source}`)
        }
        files.push(require(source));
      }
      resolve(files);
    } catch(err) {
      reject(err);
    }
  });
};


/**
 * reads files from directories
 * @param {Array} sources 
 * @return {Promise}
 */
const readFiles = (sources, obj = true) => {
  let reader = recursiveReadArr;
  let accumulator = [];
  if(obj) {
    reader = recursiveReadObj;
    accumulator = {};
  }

  const files = sources.reduce((acc, source) => {
    return reader(source, acc);
  }, accumulator);

  return Promise.all(files);
};

module.exports = readFiles;