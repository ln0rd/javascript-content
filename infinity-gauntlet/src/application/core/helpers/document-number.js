export function isCpf(doc) {
  let documentNumber = doc

  if (documentNumber === '') return false
  documentNumber = documentNumber.replace(/[^\d]+/g, '')

  if (!documentNumber || documentNumber.length !== 11) return false

  let add = 0

  for (let i = 0; i < 9; i += 1) {
    add += parseInt(documentNumber.charAt(i), 10) * (10 - i)
  }

  let rev = 11 - add % 11

  if (rev === 10 || rev === 11) {
    rev = 0
  }

  if (rev !== parseInt(documentNumber.charAt(9), 10)) return false

  add = 0

  for (let i = 0; i < 10; i += 1) {
    add += parseInt(documentNumber.charAt(i), 10) * (11 - i)
  }

  rev = 11 - add % 11

  if (rev === 10 || rev === 11) rev = 0

  if (rev !== parseInt(documentNumber.charAt(10), 10)) return false

  return true
}

export function isCnpj(cnpj) {
  if (!cnpj || cnpj.length !== 14) {
    return false
  }

  let i
  let length = cnpj.length - 2
  let numbers = cnpj.substring(0, length)
  const digits = cnpj.substring(length)
  let sum = 0
  let pos = length - 7

  for (i = length; i >= 1; i -= 1) {
    sum += numbers.charAt(length - i) * pos--

    if (pos < 2) {
      pos = 9
    }
  }

  let result = sum % 11 < 2 ? 0 : 11 - sum % 11

  if (result !== parseInt(digits.charAt(0), 10)) {
    return false
  }

  length += 1
  numbers = cnpj.substring(0, length)
  sum = 0
  pos = length - 7

  for (i = length; i >= 1; i -= 1) {
    sum += numbers.charAt(length - i) * pos--

    if (pos < 2) {
      pos = 9
    }
  }

  result = sum % 11 < 2 ? 0 : 11 - sum % 11

  if (result !== parseInt(digits.charAt(1), 10)) {
    return false
  }

  return true
}
