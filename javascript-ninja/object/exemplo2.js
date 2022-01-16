variavel = { propriedade1: '', propriedade2: 10, propriedade3: true }


console.log(variavel)


console.log( variavel.propriedade1 )
console.log( variavel.propriedade2 )
console.log(    variavel.propriedade3 )

pessoa = {
    nome: 'leonardo',
    idade: 22,
    altura: 1.74,
    sexo: 'm',
    peso: 90,
    andar: function() {
        return 'pessoa andando'
    },
    aniversario: function () {
        pessoa.idade += 1
    },
    mudarSexo: function() {
        pessoa.sexo == 'm'? pessoa.sexo = 'f': pessoa.sexo = 'm'
    }

}


myvar = function(){ return 'variavel myvar' }

console.log( myvar )
console.log( myvar() )

console.log(pessoa.andar())

console.log( pessoa.idade )
pessoa.aniversario()
console.log( pessoa.idade )


console.log( pessoa.sexo )
pessoa.mudarSexo()
console.log(pessoa.sexo)
pessoa.mudarSexo()
console.log(pessoa.sexo)
