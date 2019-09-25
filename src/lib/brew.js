const Application = require('./Application');

/**
 *
 * @param {Object} config
 * @return {Application}
 */
const brew = (config, cb) => {
  const app = new Application(config);
  app
    ._boot()
    .then(() => {
      cb(null, app);
    })
    .catch(err => {
      cb(err);
    });
};

module.exports = brew;
