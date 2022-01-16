docker ps
docker exec -it 4fae705f5138 mongo -u root -p obiwan0909 --authenticationDatabase herois

db.herois.insertMany([
    {
        nome: 'Deku',
        poder: 'All for One'
    },
    {
        nome: 'Bakugou',
        poder: 'Explosion'
    },
    {
        nome: 'Eresar Head',
        poder: 'Eraser'
    },
    {
        nome: 'Todoroki Shoto',
        Poder: 'Half hot half cold'
    },
    {
        nome: 'Uraraka',
        poder: 'Gravitation'
    }
])

use herois


// create
db.herois.create({ nome: 'Iron man', poder: 'Rico'})

// read
db.herois.find({})

// update
db.herois.update({_id: ObjectId("5c3a2c977ee732c8bb409df3")}, {$set: {nome: 'All Might'}})

// delete
db.herois.delete({_id: id})

