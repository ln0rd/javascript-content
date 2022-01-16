const axios = require('axios')
const URL = `https://swapi.co/api/people`

async function obterPessoas(nome) {
    const url = `${URL}/?search=${nome}&format=json`
    const response = await axios.get(url)
    return response.data
}

// descomentar para ver a execução no proprio arquivo

// obterPessoas('r2')
//     .then( function (resultado) {
//         // json.stringfy para parsear o resultado para um objeto acessivel
//         // agora é possivel acessar propriedades do objeto resultado
//         // que veio da api
//         console.log( `Resultado: ${JSON.stringify(resultado)}` )
//     } )
//     .catch( function (error) {
//         console.log( `Erro: ${error}` )
//     } )


// para usar esse modulo em outro arquivo

module.exports = {
    obterPessoas
}
