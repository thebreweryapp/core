const BaseConnector = require('../BaseConnector');

const defaultConnectors = {
  sql: 'brewery-sql-connector'
};

/**
 * 
 * @param {Object} config
 * @property {*} connector instance of type connector or name(string) of connector
 * @property 
 */
const dataSourceFactory = ({ name, connector, config }) => {
  
  let resolvedConnector;
  
  if(typeof connector === 'string') {
    if(connector in defaultConnectors) {
      try {
        resolvedConnector = require(defaultConnectors[connector]);
      } catch(err) {
        console.log(`Unable to resolve ${defaultConnectors[connector]}. Please install brewery-sql-connector`);
        throw new Error(err);
      }
    } else {
      throw new Error(`Invalid connector ${connector}`);
    }
  } else if (connector instanceof BaseConnector) {
    resolvedConnector = connector;
  } else {
    throw new Error(`Invalid connector ${connector}, connector must be one of default connectors or an instance of BaseConnector`)
  }

  const dataSource = resolvedConnector.initialize(config);

  resolvedConnector.connect()
    .then(() => {
      console.log(`DataSource ${name} has successfully established connection!`);
    })
    .catch((err) => {
      console.log(`DataSource ${name} has failed to establish connection!`, err);
    });
    
  return dataSource;
};

module.exports = dataSourceFactory;