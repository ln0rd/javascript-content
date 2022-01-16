const axios = require('axios')

async function getPerson( name ) {
    const url = `https://swapi.co/api/people/?search=${name}&format=json`
    const result = await axios.get(url)
    return result.data
}

module.exports = {
    getPerson
}
