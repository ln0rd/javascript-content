const grpc = require('grpc')
const PROTO_PATH = './notes.proto'
const NoteService = grpc.load(PROTO_PATH).NoteService
const cliente = new NoteService('localhost:50051', grpc.credentials.createInsecure())

module.exports = cliente