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

const dataSourceFactory = require('./factories/dataSourceFactory');
const logger = require('./logger');
const server = require('./Server');
const { readFiles } = require('./utils');


class Application {
  constructor(config) {
    const { sources } = config.app;

    this.container = createContainer();

    /**
     * load sources
     */
    const [
      useCases,
      dataSourceConfigs,
      modelDefinitions,
      repositories,
      middlewares
    ] = Promise.all([
      readFiles(sources.app),
      readFiles(sources.dataSource, false),
      readFiles(sources.model, false),
      readFiles(sources.repository),
      readFiles(sources.middleware)
    ]);
    const router = require(sources.router);

  }


  bootstrap() {

  }

  _loadSources(sources) {

  }

  _setUseCases() {

  }

  _setDatasources() {

  }

  _setModels() {

  }

  _setRepositories() {

  }

  _setMiddlewares() {

  }

  _setRouter() {

  }

  _setServer() {

  }


}