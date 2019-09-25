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
  const sourceAbsolute = path.join(
    process.cwd(),
    process.env.NODE_PATH,
    source
  );
  if (fs.statSync(sourceAbsolute).isDirectory()) {
    fs.readdirSync(sourceAbsolute)
      .filter(file => {
        return file.indexOf('.') !== 0 &&
          fs.statSync(path.join(sourceAbsolute, file)).isDirectory()
          ? true
          : file.slice(-3) === '.js';
      })
      .forEach(file => {
        if (fs.statSync(path.join(sourceAbsolute, file)).isDirectory()) {
          recursiveReadObj(path.join(source, file), files);
        } else {
          files[file.split('.')[0]] = require(path.join(source, file));
        }
      });
  } else {
    const fileName = path.basename(source);
    const ext = fileName.slice(-3);
    if (ext !== '.js') {
      throw new Error(`Invalid file ${fileName} in source ${source}`);
    }
    files[fileName.split('.')[0]] = require(source);
  }
  return files;
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
  const sourceAbsolute = path.join(
    process.cwd(),
    process.env.NODE_PATH,
    source
  );
  if (fs.statSync(sourceAbsolute).isDirectory()) {
    fs.readdirSync(sourceAbsolute)
      .filter(file => {
        return file.indexOf('.') !== 0 &&
          fs.statSync(path.join(sourceAbsolute, file)).isDirectory()
          ? true
          : file.slice(-3) === '.js';
      })
      .forEach(file => {
        fs.statSync(path.join(sourceAbsolute, file)).isDirectory()
          ? recursiveReadArr(path.join(source, file), files)
          : files.push(require(path.join(source, file)));
      });
  } else {
    const fileName = path.basename(source);
    const ext = fileName.slice(-3);
    if (ext !== '.js') {
      throw new Error(`Invalid file ${fileName} in source ${source}`);
    }
    files.push(require(source));
  }
  return files;
};

/**
 * reads files from directories
 * @param {Array} sources
 * @return {Promise}
 */
const readFiles = (sources, obj = true) => {
  return new Promise((resolve, reject) => {
    let reader = recursiveReadArr;
    let accumulator = [];
    if (obj) {
      reader = recursiveReadObj;
      accumulator = {};
    }

    try {
      const files = sources.reduce((acc, source) => {
        return reader(source, acc);
      }, accumulator);
      resolve(files);
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = readFiles;
