// install sequelize, e os drives do banco de dados //
// `npm install sequelize pg-hstore pg` //

const Sequelize = require('sequelize')

const driver = new Sequelize(
    'heroes',
    'root',
    'obiwan0909',
    {
        host: 'localhost',
        dialect: 'postgres',
        quoteIdentifiers: false,
        operatorsAliases: false
    })

async function main() {
    const herois = driver.define('herois',{
        id: {
            type: Sequelize.INTEGER,
            required: true,
            primaryKey: true,
            autoIncrement: true
        },
        nome: {
            type: Sequelize.STRING,
            required: true
        },
        poder: {
            type: Sequelize.STRING,
            required: true
        }
    }, {
        tableName: 'TB_HEROIS',
        freezeTableName: false,
        timestamps: false
    })

    await herois.sync()
    await herois.create(
        {
            nome: 'Bakugou',
            poder: 'Explosão'
        }
    )

    const result = await herois.findAll({raw: true, attributes:['nome', 'poder']})
    console.log('resultado: ',  result )

}

main()
