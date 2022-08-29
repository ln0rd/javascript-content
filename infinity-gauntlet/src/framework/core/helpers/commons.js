/**
 * deepHideKey returns a new object which has some of the original Object's properties replaced with
 * the optional hidePattern parameter.
 *
 * If obj is the null object it returns null.
 *
 * @param {Object} obj is an Object with some properties we want to hide.
 * @param {string[]} hideKeys is an array that contains the keys to be hidden.
 * @param {string} hidePattern is the patterns that all sensitive properties are replaced with.
 *
 * @returns {Object} an object with sentive properties's values replaced.
 */
export function deepHideKey(obj, hideKeys, hidePattern = '***') {
  function isObject(obj) {
    return (
      obj === Object(obj) &&
      Object.prototype.toString.call(obj) !== '[object Array]'
    )
  }

  function hide(key) {
    return hideKeys.includes(key) ? hidePattern : obj[key]
  }

  if (isObject(obj)) {
    return Object.keys(obj).reduce((cleaned, key) => {
      cleaned[key] = isObject(obj[key])
        ? deepHideKey(obj[key], hideKeys)
        : hide(key)
      return cleaned
    }, {})
  } else {
    return null
  }
}
