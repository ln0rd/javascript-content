const BaseRepository = model =>
  /**
   * This repository implementation aims at covering
   *  */
  class GenericRepository {
    constructor() {
      this.Model = model
    }

    /**
     * Finds a single document on the database according to the Repository entity
     * and the supplied params
     *
     * @param {Object} query The query parameters
     * @param projection
     * @param {{}} options
     */
    findOne(query, projection = null, options = {}) {
      return this.Model.findOne(query, projection, options).exec()
    }

    /**
     * Finds documents on the database according to the Repository entity
     * and the supplied params
     *
     * @param {Object} query The query parameters
     * @param projection
     * @param {{}} options
     */
    find(query, projection = null, options = {}) {
      return this.Model.find(query, projection, options).exec()
    }

    /**
     * Creates a document on the database according to the Repository Entity
     * and the supplied params.
     *
     * @param {Object|Object[]} params The creation parameters or an array of them
     */
    create(params) {
      return Array.isArray(params)
        ? this.Model.create(...params)
        : this.Model.create(params)
    }

    /**
     * Updates document on the database according to the Repository entity
     * and the supplied params, using `query` to find the document and using `patch`
     * to update it.
     *
     * @param {Object} query The query parameters
     * @param {Object} patch The object with the data that will be updated in the query result
     */
    update(query, patch) {
      return this.Model.update(query, patch)
    }

    /**
     * Updates multiple documents on the database according to the Repository entity
     * and the supplied params, using `query` to find the documents and using `patch`
     * to update them.
     *
     * @param {Object} query The query parameters
     * @param {Object} patch The object with the data that will be updated in the query result
     */
    updateMany(query, patch) {
      return this.Model.updateMany(query, patch)
    }

    /**
     * Updates many the Entity according to the provided Ids.
     *
     * @param {Number[]} ids The Ids of the Entities
     * @param {Object} patch The intended updates to the documents
     */
    updateByIds(ids, patch) {
      const query = {
        _id: { $in: ids }
      }

      return this.updateMany(query, patch)
    }

    /**
     * Update a single document in a collection
     *
     * @param {Object} filter The Filter used to select the document to update
     * @param {Object|Array} update The update operations to be applied to the document
     */
    updateOne(filter, update) {
      return this.Model.updateOne(filter, update)
    }
  }

module.exports = {
  BaseRepository
}
