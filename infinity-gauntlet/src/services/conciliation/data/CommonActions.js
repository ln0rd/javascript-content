const { createLogger } = require('@hashlab/logger')
const Logger = createLogger({ name: 'CONCILIATION_SERVICE' })

module.exports = class CommonActions {
  /**
   *
   * @param {mongoose.Model} model
   */
  constructor(model) {
    this.model = model
  }

  /**
   * @param {Object} filter
   * @param {Object} project
   * @return {Promise}
   */
  async find(filter, project) {
    try {
      return await this.model
        .find(filter)
        .select(project)
        .lean()
        .exec()
    } catch (err) {
      Logger.error(
        { err, filter, model: this.model.modelName },
        'find-action-error'
      )
      throw err
    }
  }

  /**
   * @param {Object} filter
   * @param {Object} project
   * @returns {Promise<mongoose.Model|undefined>}
   */
  async findOne(filter, project) {
    try {
      return await this.model
        .findOne(filter)
        .select(project)
        .lean()
        .exec()
    } catch (err) {
      Logger.error(
        { err, filter, model: this.model.modelName },
        'find-one-action-error'
      )
      throw err
    }
  }

  /**
   * @param _id
   * @param project
   * @return {Promise<void>}
   */
  async findById(_id, project) {
    try {
      return await this.model
        .findOne({ _id })
        .select(project)
        .lean()
        .exec()
    } catch (err) {
      Logger.error(
        { err, _id, model: this.model.modelName },
        'find-by-id-action-error'
      )
      throw err
    }
  }

  /**
   * @param {array} list
   * @param {Object} project
   * @return {Promise}
   */
  findByIds(list, project) {
    return this.find({ _id: { $in: list } }, project)
  }

  async create(data) {
    try {
      return await this.model.create(data)
    } catch (err) {
      Logger.error({ err }, 'create-action-error')
      throw err
    }
  }

  /**
   * @param filter
   * @param fields
   * @return {Promise<*>}
   */
  async updateOne(filter, fields) {
    try {
      return await this.model.updateOne(filter, fields)
    } catch (err) {
      Logger.error({ err }, 'update-one-action-error')
      throw err
    }
  }

  /**
   * @param {array} aggregateQuery
   * @return {Promise}
   */
  async aggregate(aggregateQuery) {
    try {
      return await this.model.aggregate(aggregateQuery)
    } catch (err) {
      Logger.error({ err }, 'aggregate-action-error')
      throw err
    }
  }
}
