//se existir ele vai passar o numero por onde começa, se não ele retorna -1
 // do final para o inicio
arr = [1, 2, 3, 4, 5]

console.log(arr.lastIndexOf(3))
console.log(arr.lastIndexOf(1))
console.log(arr.lastIndexOf(5))
console.log(arr.lastIndexOf(10))
console.log(arr.lastIndexOf(14))


name = 'leonardo'

console.log(name.lastIndexOf('a'))
console.log(name.lastIndexOf('leo'))
console.log(name.lastIndexOf('rd'))
console.log(name.lastIndexOf('u'))

// o segundo parametro é a partir do numero passado mas contando do ultimo ao primeiro
console.log(name.lastIndexOf('e', 3))
