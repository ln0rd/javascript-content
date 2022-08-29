export function flattenObj(obj, roots = []) {
  return Object.keys(obj).reduce(
    (memo, prop) =>
      Object.assign(
        {},
        memo,
        Object.prototype.toString.call(obj[`${prop}`]) === '[object Object]'
          ? flattenObj(obj[`${prop}`], roots.concat([prop]))
          : { [roots.concat([prop]).join('.')]: obj[`${prop}`] }
      ),
    {}
  )
}

/**
 * Retorna um cópia parcial de um objeto contendo apenas as chaves especificadas.
 * Se a chave não existe, a propriedade é ignorada.
 * @param {Array<string>} names Lista de chaves a serem selecionadas do objeto base.
 * @param {Object} obj Objeto base.
 * @returns {Object} Cópia parcial do objeto base contendo apenas propriedades listadas em names.
 */
export function pick(names, obj) {
  let result = {}
  for (let [key, value] of Object.entries(obj)) {
    if (names.includes(key)) {
      result = Object.assign(result, { [key]: value })
    }
  }
  return result
}
