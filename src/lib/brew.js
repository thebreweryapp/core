/**
 * Import Awilix
 * */
const {
  createContainer,
  Lifetime,
  asClass,
  asFunction,
  asValue,
} = require('awilix');

const { scopePerRequest } = require('awilix-express');

const fs = require('fs');
const path = require('path');
const dataSourceFactory = require('./factories/dataSourceFactory');
const logger = require('./logger');
const server = require('./Server');

/**
 * Reads files in a directory recursively and 
 * stores in an object with the file name as key
 * 
 * @param {String} sourceDir 
 * @param {Object} files 
 */
const recursiveReadObj = (sourceDir, files = {}) => {
  fs.readdirSync(sourceDir).forEach(file => {
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
  fs.readdirSync(sourceDir).forEach(file => {
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


/**
 * Build dataSources out of dataSource configs
 * @param {Array} dataSourceConfigs
 * @return {Array} Array of dataSources
 */
const buildDataSources = (dataSourceConfigs) => {
  return dataSourceConfigs.reduce((dataSources, dataSourceConfig) => {
    dataSources[dataSourceConfig.name] = dataSourceFactory(dataSourceConfig);
    return dataSources;
  }, {});
};


/**
 * 
 * @param {Object} config
 * @property {Array} models array string of directories where models are located
 * @property {Array} dataSources array string of directories where dataSources config are located
 * 
 * @return {Object}
 */
const brew = (config) => {

  const { sources } = config.app;

  // get router
  const router = require(sources.router);
  // get dataSource configs
  const dataSourceConfigs = readFiles(sources.dataSource, false);

  // build dataSources
  const datasourceInstances = buildDataSources(dataSourceConfigs);
  //  build models
  let modelDefinitions = readFiles(sources.model, false);

  // group models by datasource
  modelDefinitions = modelDefinitions.reduce((acc, val) => {
    if(!(val.datasource in datasourceInstances)) {
      throw new Error (`Datasource "${val.datasource}" defined in model "${val.name}" doesnt exist`);
    }
    
    if(!(val.datasource in acc)) {
      acc[val.datasource] = [];
    }
    acc[val.datasource].push({
      definition: val.definition,
      name: val.name
    });
    return acc;
  }, {});

  let models = {};
  let datasources = {};

  // create models and datasources
  Object.keys(modelDefinitions).forEach((key) => {
    const datasourceInstance = datasourceInstances[key];
    const datasourceModels = modelDefinitions[key];

    datasourceModels.forEach((modelDefinition) => {
      const model = modelDefinition.definition(datasourceInstance, datasourceInstance.DataTypes);
      if(datasourceInstance.isSync) {
        model.sync();
      }
      models[modelDefinition.name] = model;
    });

    datasources[key] = datasourceInstance;
  });

  // load repositories
  const repositories = readFiles(sources.repository);
  // load middlewares
  const middlewares = readFiles(sources.middleware);
  // load use cases
  const useCases = readFiles(sources.app);
  
  // Create DI Container
  const container = createContainer();

  // System
  container
    .register({
      server: asClass(server, { lifetime: Lifetime.SINGLETON }),
      router: asFunction(router, { lifetime: Lifetime.SINGLETON }),
      logger: asFunction(logger, { lifetime: Lifetime.SINGLETON }),
      config: asValue(config),
    })

  // dataSources
    .register(Object.keys(datasources).reduce((acc, val) => {
      acc[val] = asValue(datasources[val]);
      return acc;
    }, {}))
  
  // Models
    .register(Object.keys(models).reduce((acc, val) => {
      acc[val] = asValue(models[val]);
      return acc;
    }, {}))

  // Repositories
    .register(Object.keys(repositories).reduce((acc, val) => {
      acc[val] = asClass(repositories[val], { lifetime: Lifetime.SINGLETON });
      return acc;
    }, {}))

  // container middleware
    .register({
      containerMiddleware: asValue(scopePerRequest(container))
    })

  // middlewares
    .register(Object.keys(middlewares).reduce((acc, val) => {
      acc[val] = asValue(middlewares[val]);
      return acc;
    }, {}))

  // use cases
    .register(Object.keys(useCases).reduce((acc, val) => {
      acc[val] = asClass(useCases[val]);
      return acc;
    }, {}));

  return {
    container,
    server: container.resolve('server')
  };
};

module.exports = brew;