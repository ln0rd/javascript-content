export default {
  name: 'expiration_date',
  type: 'format',
  handler: date => {
    let month
    let year
    const today = new Date()

    if (date.length === 4) {
      month = date.substring(0, 2)
      year = `20${date.substring(2, 4)}`
    } else if (date.length === 6) {
      month = date.substring(0, 2)
      year = date.substring(2, 6)
    } else {
      month = null
      year = null
    }

    month = parseInt(month, 10)
    year = parseInt(year, 10)

    if (year > today.getFullYear()) {
      return true
    } else if (year === today.getFullYear() && month >= today.getMonth() + 1) {
      return true
    }

    return false
  }
}
