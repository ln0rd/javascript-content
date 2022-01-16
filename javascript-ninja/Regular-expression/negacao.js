var text = 'World of Warcraft é um jogo on - line, (MMORPG) da produtora Blizzard lançado em 2004. O jogo se passa no mundo fantástico de Azeroth, introduzido no primeiro jogo da série, Warcraft: Orcs & Humans em 1994.'

//pega tudo menos o que esta na lista, usando ˆ
console.log(text.match( /[ˆo]/g ) )

//QUALQUER caracter que n seja alfanumerico
console.log(text.match( /\W/g ) )

// QUALQUER caracter menos os digitos(numeros)
console.log(text.match( /\D/g ) )

// Qualquer caracter menos os ESPAÇOS EM BRANCO
console.log(text.match( /\S/g ) )

//Pega todos carcteres que seja espaçø e tudo o que não é espaçø
console.log(text.match( /\S\s/g ) )

//ele tem que se repetir no minimo duas vezes
console.log(text.match( /\d{2}/g ) )

//ele tem que se repetir no minimo 4 vezes
console.log(text.match( /\d{4}/g ) )

//ele tem que se repetir entre 1 a 4 vezes
console.log(text.match( /\d{1,4}/g ) )



