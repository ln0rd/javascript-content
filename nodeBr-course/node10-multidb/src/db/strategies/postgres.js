const Icrud = require('./interfaces/icrud')
const Sequelize = require('sequelize')


class Postgres extends Icrud {
    constructor() {
        super()
        this._driver = null
        this._herois = null
    }

    async isConnected(){
        try {
            await this._driver.authenticate()
            return true
        } catch (error) {
            console.error( 'Ocorreu um erro: ', error )
            return false
        }
    }

    async defineModel(){
        this._herois = this._driver.define('herois', {
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

        await this._herois.sync()
    }

    async connect(){
        this._driver = new Sequelize(
            'heroes',
            'root',
            'obiwan0909',
            {
                host: 'localhost',
                dialect: 'postgres',
                quoteIdentifiers: false,
                operatorsAliases: false
            })
            await this.defineModel()
    }

    async create(item) {
        // return this._herois.create(item)
        const {
            dataValues
        } = await this._herois.create(item)

        return dataValues
    }

    async delete(id){
        const query =  id ? { id } : {}
        return this._herois.destroy({where:query})
    }

    async update(id, item){
        return await this._herois.update(item, { where: {id:id} })
    }

    async read(item = {}) {
        return this._herois.findAll({where: item, raw: true})
    }

}

module.exports = Postgres
