const fs = require('fs');
const path = require('path');
const inflection = require( 'inflection' );

const singularizeToUpper = (str) => {
  return inflection.singularize(str.replace(/^./, f => f.toUpperCase()));
};


module.exports = {
  load({ sequelize, baseFolder, indexFile = 'index.js' }) {
    const loaded = {
      models: {}
    };

    fs
      .readdirSync(baseFolder)
      .filter((file) => {
        return (file.indexOf('.') !== 0) && (file !== indexFile) && (file.slice(-3) === '.js');
      })
      .forEach((file) => {
        const model = sequelize['import'](path.join(baseFolder, file));
        const modelName = singularizeToUpper(file.split('.')[0]) + 'Model';
        loaded.models[modelName] = model;
      });

    Object.keys(loaded.models).forEach((modelName) => {
      if(loaded.models[modelName].associate) {
        loaded.models[modelName].associate(loaded);
      }
    });
    loaded.database = sequelize;
    return loaded;
  }
};
