module.exports = class FileError extends Error {
  constructor(fileType) {
    super()

    this.name = this.constructor.name
    this.public = true
    this.fileType = fileType

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    } else {
      this.stack = new Error().stack
    }

    this.message = `Error to create ${fileType} Conciliation File`
  }
}
