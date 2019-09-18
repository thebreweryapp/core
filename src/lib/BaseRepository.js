class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async getAll(...args) {
    return this.model.findAll(...args);
  }

  async getById(id, options = {}) {
    return this._getById(id, options);
  }

  async add(entity) {
    return this.model.create(entity);
  }

  async remove(id, options) {
    const entity = await this._getById(id);

    return entity.destroy(options);
  }

  async update(id, newData) {
    const entity = await this._getById(id);

    const transaction = await this.model.sequelize.transaction();

    try {
      const updatedEntity = await entity.update(newData, { transaction });

      await transaction.commit();

      return updatedEntity;
    } catch (error) {
      await transaction.rollback();

      throw error;
    }
  }

  async count() {
    return this.model.count();
  }

  // Private

  async _getById(id, options = {}) {
    options.rejectOnEmpty = true;
    try {
      const result = await this.model.findByPk(id, options);
      return result;
    } catch (error) {
      if (error.name === 'SequelizeEmptyResultError') {
        const notFoundError = new Error('NotFoundError');
        notFoundError.details = `${this.model.name} with id ${id} can't be found.`;

        throw notFoundError;
      }

      throw error;
    }
  }
}

module.exports = BaseRepository;
