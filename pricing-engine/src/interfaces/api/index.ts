import * as Hapi from '@hapi/hapi'
import * as HapiPino from 'hapi-pino'
import * as HapiSwagger from 'hapi-swagger'
import * as Inert from '@hapi/inert'
import * as Vision from '@hapi/vision'
import { Routes } from './routes'

const isProdEnv = process.env.NODE_ENV === 'production'

const server = Hapi.server({
  port: process.env.PORT,
  host: process.env.HOST || '0.0.0.0',
  debug: false,
})

const init = async (): Promise<Hapi.Server> => {
  server.route(Routes)

  const swaggerOptions: HapiSwagger.RegisterOptions = {
    info: {
      title: 'Pricing Engine',
      version: process.env.npm_package_version,
    },
  }

  const plugins: Array<Hapi.ServerRegisterPluginObject<unknown>> = [
    {
      plugin: Inert,
    },
    {
      plugin: Vision,
    },
    {
      plugin: HapiSwagger,
      options: swaggerOptions,
    },
    {
      plugin: HapiPino,
      options: {
        prettyPrint: !isProdEnv,
      },
    },
  ]

  await server.register(plugins)

  return server
}

const start = async (): Promise<void> => {
  await server.start()

  server.logger.info({ uri: server.info.uri }, 'server-running')
}

export { init, start }
