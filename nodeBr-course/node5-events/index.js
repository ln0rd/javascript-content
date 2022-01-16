const EventEmitter = require('events')
class Emissor extends EventEmitter{

}

const meuEmissor = new Emissor()
const nomeEvento = 'usuario:click'
meuEmissor.on( nomeEvento , function (click) {
    console.log( 'um usuario clicou', click )
}  )

// meuEmissor.emit(nomeEvento, 'na barra de rolagem')
// meuEmissor.emit(nomeEvento, 'no ok')

// let count = 0
// setInterval(() => {
//     meuEmissor.emit(nomeEvento, 'no ok' + (count++))
// }, 1000);

const stdin = process.openStdin()
function main() {
    return new Promise(function(resolve, reject) {
        stdin.addListener('data', function (value) {
            console.log( `Você digitou: ${value.toString().trim()}` )
            return resolve( value )
        })
    })
}

main().then( function (resultado) {
    console.log('resultado', resultado.toString)
} )
