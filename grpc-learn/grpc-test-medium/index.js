const grpc = require('grpc')
const notesProto = grpc.load('notes.proto')


//Mock
const notes = [
    {id: '1', title: 'Note 1', content: 'Content 1'},
    {id: '2', title: 'Note 2', content: 'Content 2'}
]

// Create a server 
const server = new grpc.Server()
server.bind('127.0.0.1:50051', grpc.ServerCredentials.createInsecure())


server.addService(notesProto.NoteService.service, {
    list: (_, callback) => {
        callback(null, notes)
    }
})

    
console.log('Server running at 127.0.0.1:50051')

server.start()

