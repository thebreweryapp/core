const Event = require('./Event');
class BaseConnector extends Event {

  static setCustomMethods(customMethods) {
    customMethods.forEach((customMethod) => {
      this[customMethod.name] = customMethod.value;
    });
  }
}

BaseConnector.setEvents(['initialized', 'connected', 'disconnected']);


module.exports = BaseConnector;
