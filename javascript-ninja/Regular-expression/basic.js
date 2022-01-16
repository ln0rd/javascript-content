var text = 'Python é uma linguagem de programação de alto nível,[4] interpretada, de script, imperativa, orientada a objetos, funcional, de tipagem dinâmica e forte. Foi lançada por Guido van Rossum em 1991.[1] Atualmente possui um modelo de desenvolvimento comunitário, aberto e gerenciado pela organização sem fins lucrativos Python Software Foundation. Apesar de várias partes da linguagem possuírem padrões e especificações formais, a linguagem como um todo não é formalmente especificada. O padrão de facto é a implementação CPython.'

// ele procura as letras todas juntas
result = text.match(/Python/g)

// traz todas as letras
result2 = text.match(/\w/g)

console.log( result )

console.log( result2 )

//traz todos os numeros
console.log( result3 = text.match(/\d/g) )

//quando casar dois numeros juntos ele mostra
console.log( result3 = text.match(/\d\d/g) )

// quando casar tres numeros juntos ele mostra
console.log( result3 = text.match(/\d\d\d/g) )

// quando casar quatro numeros ele mostra
console.log( result3 = text.match(/\d\d\d\d/g) )


//pega o conjunto de letras li ou Py
console.log( result4 = text.match(/li|Py/g) )

// [] significa classe, então ele busca por um desses no texto
// dentro da lista de caracteres todos são idenpendentes é como se fosse (/ 1 | 2 | 3 /)
console.log( text.match(/[123]/g) )

// () é uma forma de separar grupo de caracteres a ser pesquisado
console.log(text.match(/(script)|(Python)/g) )

//todos os caracteres de 0 a 9
console.log( text.match( /[0-9]/g ) )

//todos as letras de A a Z MAIUSCULAS
console.log( text.match( /[A-Z]/g ) )

//todos as letras de a a z minusculas
console.log(text.match(/[a-z]/g))

//tas as letras Maiusculas e minusculas de A a Z e todos os numeros de 0 a 9
console.log( text.match(/[A-Za-z0-9]/) )


//espaços em branco
console.log( text.match(/\s/g) )

//verifica se tem quebra de linha
console.log( text.match( /\n/g ) )

//verifica se tem tab no texto
console.log( text.match(/\t/g) )

//qualquer caracter execeto quebra de linha
console.log(text.match(/./g))

//casar com a quantia
console.log(text.match( /....../ ))
console.log(text.match( /\w\w\w\w\w\w\w/ ))
