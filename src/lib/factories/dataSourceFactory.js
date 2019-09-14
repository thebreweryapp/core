const BaseConnector = require('../BaseConnector');
const { defaultConnectors } = require('../../../config');

/**
 *
 * @param {Object} config
 * @property {*} connector instance of type connector or name(string) of connector
 * @property
 */
const dataSourceFactory = ({ name, connector, config }) => {
  let resolvedConnector;

  if (typeof connector === 'string') {
    if (connector in defaultConnectors) {
      try {
        resolvedConnector = require(defaultConnectors[connector]);
      } catch (err) {
        console.log(
          `Unable to resolve ${defaultConnectors[connector]}. Please install ${defaultConnectors[connector]}`
        );
        throw new Error(err);
      }
    } else {
      throw new Error(`Invalid connector ${connector}`);
    }
  } else if (connector instanceof BaseConnector) {
    resolvedConnector = connector;
  } else {
    throw new Error(
      `Invalid connector ${connector}, connector must be one of default connectors or an instance of BaseConnector`
    );
  }

  const dataSource = resolvedConnector.initialize(config);

  return dataSource;
};

module.exports = dataSourceFactory;
