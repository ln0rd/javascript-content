export function getFullErrorStack(ex) {
  var ret = ex.stack || ex.toString()
  if (ex.cause && typeof ex.cause === 'function') {
    var cex = ex.cause()
    if (cex) {
      ret += '\nCaused by: ' + getFullErrorStack(cex)
    }
  }
  return ret
}

export function errorSerializer(err) {
  if (!err || !err.stack) return err
  var obj = {
    message: err.message,
    name: err.name,
    stack: getFullErrorStack(err),
    code: err.code,
    signal: err.signal
  }
  return obj
}

export function throwWithContext(error, context = {}) {
  error.context = context
  throw error
}
