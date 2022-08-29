/* eslint-disable no-console */
import { Writable } from 'stream'
import bunyan from 'bunyan'
import config from 'framework/core/config'

const writable = new Writable({
  objectMode: true,
  write(chunk, encoding, callback) {
    if (typeof chunk === 'string') {
      try {
        console.log(JSON.parse(chunk.trim()))
      } catch (err) {
        console.log(chunk.trim())
      }
    } else {
      console.log(chunk)
    }
    callback()
  }
})
export default function createLogger(opts = {}) {
  if (process.env.SILENT_MODE === 'true') {
    const log = {
      fatal: () => {},
      error: () => {},
      warn: () => {},
      info: () => {},
      debug: () => {},
      trace: () => {}
    }

    return Object.assign({}, log, {
      child: () => log // 12/21: tests that depended on this were not passing in CI because of SILENT_MODE flag
    })
  }

  opts.streams = [
    {
      level: config.core.logger.level,
      stream: process.env.NODE_ENV === 'production' ? process.stdout : writable
    }
  ]

  const bunyanErrSerializer = bunyan.stdSerializers.err
  let defaultSerializers = bunyan.stdSerializers
  defaultSerializers.err = function(err) {
    let obj = bunyanErrSerializer(err)
    if (obj && err && err.context) {
      obj.context = err.context
    }
    return obj
  }
  opts.serializers = opts.serializers || defaultSerializers

  return bunyan.createLogger(opts)
}
