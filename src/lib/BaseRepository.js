class BaseRepository {
  constructor(model, toEntity = null, toDatabase = null) {
    this.model = model;
    this.toEntity = toEntity;
    this.toDatabase = toDatabase;
  }

  async getAll(...args) {
    const results = await this.model.findAll(...args);

    if (this.toEntity) {
      return results.map(result => {
        return this.toEntity(result);
      });
    } else {
      return results;
    }
  }

  async getById(id, options = {}) {
    const result = await this._getById(id, options);

    if (this.toEntity) {
      return this.toEntity(result);
    } else {
      return result;
    }
  }

  async add(entity) {
    const result = await this.model.create(entity);

    if (this.toEntity) {
      return this.toEntity(result);
    } else {
      return result;
    }
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

      if (this.toEntity) {
        return this.toEntity(updatedEntity);
      } else {
        return updatedEntity;
      }
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
