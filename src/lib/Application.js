/**
 * Import Awilix
 * */
const {
  createContainer,
  Lifetime,
  asClass,
  asFunction,
  asValue
} = require('awilix');

const serverless = require('serverless-http');

const { scopePerRequest } = require('awilix-express');

const dataSourceFactory = require('./factories/dataSourceFactory');
const logger = require('./logger');
const server = require('./Server');
const { readFiles } = require('./utils');

class Application {
  constructor(config) {
    this.config = config;
    this.container = createContainer();
  }

  getServer() {
    return this.container.resolve('server');
  }

  getServerless() {
    return serverless(this.container.resolve('server').express);
  }

  _boot() {
    const { sources } = this.config.app;
    return this._loadSources(sources).then(
      ([
        useCases,
        dataSourceConfigs,
        modelDefinitions,
        repositories,
        middlewares,
        controllers,
        router
      ]) => {
        // Build Models and Datasources
        const { models, datasources } = this._buildModelsAndDatasources(
          modelDefinitions,
          dataSourceConfigs
        );

        // Set Application properties and inject as dependencies to container
        this._setConfig(this.config);
        this._setUseCases(useCases);
        this._setDatasources(datasources);
        this._setModels(models);
        this._setRepositories(repositories);
        this._setContainerMiddleware();
        this._setMiddlewares(middlewares);
        this._setControllers(controllers);
        this._setLogger(logger);
        this._setRouter(router);
        this._setServer(server);
      }
    );
  }

  _setUseCases(useCases) {
    this.useCases = useCases;
    this.container.register(
      Object.keys(useCases).reduce((acc, val) => {
        acc[val] = asClass(useCases[val]);
        return acc;
      }, {})
    );
  }

  _setDatasources(datasources) {
    this.datasources = datasources;
    this.container.register(
      Object.keys(datasources).reduce((acc, val) => {
        acc[val] = asValue(datasources[val]);
        return acc;
      }, {})
    );
  }

  _setModels(models) {
    this.models = models;
    this.container.register(
      Object.keys(models).reduce((acc, val) => {
        acc[val] = asValue(models[val]);
        return acc;
      }, {})
    );
  }

  _setRepositories(repositories) {
    this.repositories = repositories;
    this.container.register(
      Object.keys(repositories).reduce((acc, val) => {
        acc[val] = asClass(repositories[val], { lifetime: Lifetime.SINGLETON });
        return acc;
      }, {})
    );
  }

  _setContainerMiddleware() {
    this.container.register({
      containerMiddleware: asValue(scopePerRequest(this.container))
    });
  }

  _setMiddlewares(middlewares) {
    this.middlewares = middlewares;
    this.container.register(
      Object.keys(middlewares).reduce((acc, val) => {
        acc[val] = asValue(middlewares[val]);
        return acc;
      }, {})
    );
  }

  _setControllers(controllers) {
    this.controllers = controllers;
    this.container.register(
      Object.keys(controllers).reduce((acc, val) => {
        acc[val] = asClass(controllers[val], { lifetime: Lifetime.SINGLETON });
        return acc;
      }, {})
    );
  }

  _setRouter(router) {
    this.router = router;
    this.container.register({
      router: asFunction(router, { lifetime: Lifetime.SINGLETON })
    });
  }

  _setServer(server) {
    this.container.register({
      server: asClass(server, { lifetime: Lifetime.SINGLETON })
    });
    this.server = this.container.resolve('server');
    this.serverless = serverless(this.server.express);
  }

  _setLogger(logger) {
    this.logger = logger;
    this.container.register({
      logger: asFunction(logger, { lifetime: Lifetime.SINGLETON })
    });
  }

  _setConfig(config) {
    this.container.register({
      config: asValue(config)
    });
  }

  _loadSources(sources) {
    return Promise.all([
      readFiles(sources.app),
      readFiles(sources.dataSource, false),
      readFiles(sources.model, false),
      readFiles(sources.repository),
      readFiles(sources.middleware),
      readFiles(sources.controller)
    ]).then(result => {
      result.push(require(sources.router));
      return result;
    });
  }

  _buildModelsAndDatasources(modelDefinitions, dataSourceConfigs) {
    let datasourceInstances = {};

    if (dataSourceConfigs.length > 0) {
      // build dataSources
      datasourceInstances = dataSourceConfigs.reduce(
        (dataSources, dataSourceConfig) => {
          dataSources[dataSourceConfig.name] = dataSourceFactory(
            dataSourceConfig
          );
          return dataSources;
        },
        {}
      );
    }

    // group models by datasource
    const modelDefinitionsByDatasource = modelDefinitions.reduce((acc, val) => {
      if (!(val.datasource in datasourceInstances)) {
        throw new Error(
          `Datasource "${val.datasource}" defined in model "${val.name}" doesnt exist`
        );
      }

      if (!(val.datasource in acc)) {
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
    Object.keys(modelDefinitionsByDatasource).forEach(key => {
      const datasourceInstance = datasourceInstances[key];
      const datasourceModels = modelDefinitionsByDatasource[key];
      const thisModels = {};

      datasourceModels.forEach(modelDefinition => {
        const model = modelDefinition.definition(
          datasourceInstance,
          datasourceInstance.DataTypes
        );
        thisModels[modelDefinition.name] = model;
      });

      Object.keys(thisModels).forEach(modelName => {
        if (thisModels[modelName].associate) {
          thisModels[modelName].associate();
        }
      });

      if (datasourceInstance.isSync) {
        if (datasourceInstance.alter) {
          datasourceInstance.sync({ alter: true });
        } else {
          datasourceInstance.sync();
        }
      }

      Object.assign(models, thisModels);
      datasources[key] = datasourceInstance;
    });

    return {
      models,
      datasources
    };
  }
}

module.exports = Application;
