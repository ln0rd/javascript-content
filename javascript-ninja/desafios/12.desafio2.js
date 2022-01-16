// Crie uma função que receba dois argumentos e retorne a soma dos mesmos.
function sum( n1, n2) {
    return n1 + n2
}

// Declare uma variável que receba a invocação da função criada acima, passando dois números quaisquer por argumento, e somando `5` ao resultado retornado da função.
var p = sum( 1, 22 ) + 5


// Qual o valor atualizado dessa variável?
console.log( p )


// Declare uma nova variável, sem valor.
var l

/*
Crie uma função que adicione um valor à variável criada acima, e retorne a string:
    O valor da variável agora é VALOR.
Onde VALOR é o novo valor da variável.
*/
function addvalue(value) {
    l = value
    return 'o valor da variavel agora é ' + l

}


// Invoque a função criada acima.
console.log ( addvalue(2) )



// Qual o retorno da função (Use comentários de bloco).
/* o valor d variavel agora é 2 */

/*
Crie uma função com as seguintes características:
1. A função deve receber 3 argumentos;
2. Se qualquer um dos três argumentos não estiverem preenchidos, a função deve retornar a string:
    Preencha todos os valores corretamente!
3. O retorno da função deve ser a multiplicação dos 3 argumentos, somando `2` ao resultado da multiplicação.
*/
function response( a, b, c) {
    if ( a === undefined || b === undefined || c === undefined ){

        return 'preencha todos os valores'

    } else {

        return ( a * b * c ) + 2

    }
}

// Invoque a função criada acima, passando só dois números como argumento.
console.log(response( 1,2 ))

// Qual o resultado da invocação acima (Use comentários para mostrar o valor retornado).
//preencha todos os valores

// Agora invoque novamente a função criada acima, mas passando todos os três argumentos necessários.
console.log(response(1, 2, 3))

// Qual o resultado da invocação acima (Use comentários para mostrar o valor retornado).
//8

/*
Crie uma função com as seguintes características:
1. A função deve receber 3 argumentos.
2. Se somente um argumento for passado, retorne o valor do argumento.
3. Se dois argumentos forem passados, retorne a soma dos dois argumentos.
4. Se todos os argumentos forem passados, retorne a soma do primeiro com o segundo, e o resultado, dividido pelo terceiro.
5. Se nenhum argumento for passado, retorne o valor booleano `false`.
6. E ainda, se nenhuma das condições acima forem atendidas, retorne `null`.
*/

function f(a,b,c) {

    if (a === undefined && b === undefined && c === undefined) {

        return false

    } else if (b === undefined && c === undefined ) {

        return ( a )

    } else if ( c === undefined ) {

        return a + b

    } else {

        return ( a + b ) / c

    }

}


// Invoque a função acima utilizando todas as possibilidades (com nenhum argumento, com um, com dois e com três.) Coloque um comentário de linha ao lado da função com o resultado de cada invocação.
console.log( f() )
console.log( f( 1 ) )
console.log( f( 2, 2) )
console.log( f( 2, 2, 4) )
