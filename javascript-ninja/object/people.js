var pessoa = {}

// variavel pessoa é do tipo objeto
console.log(pessoa)

pessoa = {
    altura: 1.74,
    peso: 90
}

console.log(pessoa)

//acessando um indice do objeto
console.log( pessoa.altura )

//alterando valor da propriedade do objeto
pessoa.altura = 1.80

console.log(pessoa.altura)

console.log(pessoa['altura'])

pessoa = {
    nome: 'leonardo',
    idade: 22,
    passos: 8000,
    andar: function () {
        return pessoa.passos +=1
    }

}

console.log( pessoa.passos )
pessoa.andar()
console.log( pessoa.passos )
