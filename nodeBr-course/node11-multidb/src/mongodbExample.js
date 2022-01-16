// npm install mongoose
const Mongoose = require('mongoose')

// connecta com o Mongodb e especificar por ultimo o banco
Mongoose.connect('mongodb://myuser:mypassword@localhost:27017/herois',{ useNewUrlParser: true }, function (error) {
    if (!error) {
        return
    }
    console.log('Falha na Conexão: ', error)
})

const connection = Mongoose.connection

connection.once('open', function () {
    console.log('database rodando')
})


setTimeout(() => {
    const state = connection.readyState
    // console.log( state )
}, 2000);

// states = 0 deconectado, 1 conectado, 2 conectando, 3 desconectando


const heroiSchema = new Mongoose.Schema({
    nome: {
        type: String,
        required: true,
    },
    poder: {
        type: String,
        required: true
    },
    insertedAt: {
        type: Date,
        default: new Date
    }
})

const model = Mongoose.model('herois', heroiSchema)

async function cadastrar() {
    const resultCadastrar = await model.create({ nome: 'Fumikage Tokoyami', poder: 'Dark Shadown' })

    console.log( 'ResultCadastrar: ', resultCadastrar )
}

async function listar(){
    const resultListar = await model.find({})

    console.log('consulta: ', resultListar )
}



// cadastrar()
listar()
