import { init, start } from 'interfaces/api'

// eslint-disable-next-line @typescript-eslint/no-floating-promises
init().then(() => start())

process.on('unhandledRejection', (err) => {
  // eslint-disable-next-line no-console
  console.log(err)
  process.exit(1)
})
