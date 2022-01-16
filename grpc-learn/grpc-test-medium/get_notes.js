const client = require('./cliente')

client.list({}, (error, notes) => {
    if (!error) {
        console.log('successfully fetch List notes')
        console.log(notes)
    } else {
        console.error(error)
    }
})