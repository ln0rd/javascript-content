//Falsy
// - undefined
// - null
// - NaN
// 0
// -0
// '' ou ""

//Trusthy


let teste

if( 1 ) {
    teste = true
} else {
    teste = false
}
// 1 é verdadeiro
console.log(teste)

if (0) {
    teste = true
} else {
    teste = false
}
// 0 é falso
console.log(teste)

if ('') {
    teste = true
} else {
    teste = false
}
// 0 é falso
console.log(teste)

if (undefined) {
    teste = true
} else {
    teste = false
}
// 0 é falso
console.log(teste)

if ('0') {
    teste = true
} else {
    teste = false
}
// 0 é falso
console.log(teste)


console.log(!true)
console.log(!!true)
console.log(!1)
console.log(!!1)

