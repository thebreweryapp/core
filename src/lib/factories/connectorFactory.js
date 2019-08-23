const BaseConnector = require('../BaseConnector');

/**
 * Factory for creating connectors
 * 
 * @param {Function} initialize initialize method to be used by connector
 * @param {Function} connect 
 * @param {Function} disconnect 
 * @param {Function} modelDecorator 
 * @param {Array} customMethods custom methods to be decorated on the Connector object
 * 
 * @return {Object} the connector class
 */
const connectorFactory = (name, initialize, connect, disconnect = () => {}) => {
  
  
  const Connector = Object.create(BaseConnector);
  Connector.name = name;
  Connector.initialize = initialize;
  Connector.connect = connect;
  Connector.disconnect = disconnect;

  return Connector;
};

module.exports = connectorFactory;