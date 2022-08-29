/**
 * Cria um filtro no formato de query suportada pelo mongoDB a partir
 * de um objeto que pode possuir propriedades com valor simples ou array de múltiplos valores.
 * Para a conversão, a seguinte premissa é adotada: uma propriedade com valores múltiplos (array)
 * gera uma condição 'ou' entre eles, ou seja, qualquer um dos é suficiente para atender a condição.
 *
 * Exemplo:
 *   Entrada:
 *   {
 *     keyA: "value1",
 *     keyB: ["value2", "value3"]
 *   }
 *   Saída:
 *   {
 *     keyA: "value1",
 *     keyB: {
 *       $in: ["value2", "value3"]
 *     }
 *   }
 */
export const createMatchFilters = function(filterParams) {
  let filter = {}
  Object.entries(filterParams)
    .filter(validValuesFilter)
    .forEach(([key, value]) => {
      const filterValue = Array.isArray(value)
        ? createMultiValueMatchFilter(value)
        : createSingleValueMatchFilter(value)
      filter = Object.assign(filter, { [key]: filterValue })
    })
  return filter
}

// eslint-disable-next-line no-unused-vars
function validValuesFilter([_, value]) {
  return Array.isArray(value) ? isValidList(value) : isValidValue(value)
}

function isValidList(valueList) {
  if (valueList.length <= 0) return false
  for (const value of valueList) {
    if (!isValidValue(value)) {
      return false
    }
  }
  return true
}

function isValidValue(value) {
  return value !== null && value !== '' && value !== undefined
}

function createSingleValueMatchFilter(value) {
  return value
}

function createMultiValueMatchFilter(value) {
  return {
    $in: value
  }
}
