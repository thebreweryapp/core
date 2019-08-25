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
const { readFiles } = require('./utils');

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

  let datasourceInstances = {};

  if (dataSourceConfigs.length > 0) {
    // build dataSources
    datasourceInstances = dataSourceConfigs.reduce((dataSources, dataSourceConfig) => {
      dataSources[dataSourceConfig.name] = dataSourceFactory(dataSourceConfig);
      return dataSources;
    }, {});
  }
  
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

    const thisModels = {};

    datasourceModels.forEach((modelDefinition) => {
      const model = modelDefinition.definition(datasourceInstance, datasourceInstance.DataTypes);
      if(datasourceInstance.isSync) {
        model.sync();
      }
      thisModels[modelDefinition.name] = model;
    });

    Object.keys(thisModels).forEach((modelName) => {
      if(thisModels[modelName].associate) {
        thisModels[modelName].associate();
      }
    });
    Object.assign(models, thisModels);
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