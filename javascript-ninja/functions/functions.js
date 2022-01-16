function nome(){

}
//como a função não retorna nada, ela retorna undefined
console.log( nome() )

//apenas diz que é uma função, não foi executada
console.log( nome )

x = 1
console.log(x)

function soma() {

    x += 1

}
soma()
console.log(x)
// ------------------ //

function value(){

    return 2 + 2

}

console.log(2 + value() )


function nonumber( x , y){

    return x + y;
}

console.log( nonumber() )
