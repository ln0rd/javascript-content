require('module-alias/register')
const assert = require('assert')

if (process.argv.length < 3) {
  throw new Error(
    'First parameter must be a valid application type: [api, worker, runner, webhook, scheduler].'
  )
}
const applicationType = process.argv[2]

const init = {
  api: 'framework/api/server',
  runner: 'framework/queue/runner',
  scheduler: 'framework/queue/scheduler',
  webhook: 'application/webhook/consumer',
  worker: 'framework/queue/worker'
}

assert(typeof init[applicationType] === 'string')

const opts = {
  // The handlers in this array will not be loaded by the API
  apiExcludeHandlers: (process.env.API_EXCLUDE_HANDLERS || '').split(','),

  // The databases in this object will not be connected. Valid keys: redis, rabbitmq, mongodb
  disabledDatabases: (process.env.DISABLED_DATABASES || '')
    .split(',')
    .reduce(function(acc, k) {
      return Object.assign({}, acc, { [k]: true })
    }, {})
}

// Load datadog tracer
if (process.env.DATADOG_ENABLED === 'true') {
  require('dd-trace').init({
    profiling: process.env.IG_API_PROFILING_ENABLED === 'true'
  })
}

require('framework/core/adapters/error-reporter').wrapError(() =>
  require(init[applicationType]).default(opts)
)
