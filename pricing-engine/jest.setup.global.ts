export default () => {
  if (process.argv.find((a) => a === '--silent')) {
    process.env.IS_SILENT = 'true'
  }
}
