export default {
  name: 'card_number',
  type: 'format',
  handler: value => {
    if (/[^0-9-\s]+/.test(value)) return false

    // The Luhn Algorithm. It's so pretty.
    let nCheck = 0
    let nDigit = 0
    let bEven = false

    value = value.replace(/\D/g, '')

    for (let n = value.length - 1; n >= 0; n--) {
      const cDigit = value.charAt(n)
      nDigit = parseInt(cDigit, 10)

      if (bEven) {
        if ((nDigit *= 2) > 9) nDigit -= 9
      }

      nCheck += nDigit
      bEven = !bEven
    }

    return nCheck % 10 === 0
  }
}
