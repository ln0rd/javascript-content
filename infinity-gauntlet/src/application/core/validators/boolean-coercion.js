export default {
  name: 'boolean',
  type: 'coercion',
  handler: value => {
    return value === 'true'
  }
}
