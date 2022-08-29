if (process.env.IS_SILENT) {
  process.stdout.write = jest.fn()
}
