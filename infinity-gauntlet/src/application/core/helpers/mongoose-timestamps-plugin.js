module.exports = mongooseTimestampsPlugin

function mongooseTimestampsPlugin() {
  return function(schema) {
    schema.add({ updated_at: Date, created_at: Date })
    schema.pre('save', function(next) {
      var timestamp = new Date()
      if (this.isNew) {
        this.created_at = timestamp
      }
      this.updated_at = timestamp
      next()
    })
  }
}
