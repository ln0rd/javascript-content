export default {
  name: 'integer',
  type: 'coercion',
  handler: value => {
    return parseInt(value, 10)
  }
}
