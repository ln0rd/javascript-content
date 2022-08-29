require('module-alias/register')

// Load datadog tracer
if (process.env.DATADOG_ENABLED === 'true') {
  require('dd-trace').init()
}

require('framework/core/adapters/error-reporter').wrapError(
  require('framework/queue/dry-runner').default
)
