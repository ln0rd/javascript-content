var nome = 'leo2'

function escopo() {

    return nome  = 'leo';


}

function escopo2() {

    var nome = 'leo2';
    return nome

}


function escopo3(params) {

    let nome = 'leo3'
    return nome

}

console.log( nome )
console.log( escopo() )
console.log( escopo2() )
console.log( escopo3() )
