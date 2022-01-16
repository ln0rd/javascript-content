const {createServer} = require("grpc-kit");
const server = createServer();

server.use({
  protoPath: "greeter.proto",
  packageName: "greeter",
  serviceName: "Greeter",
  routes: {
    hello: (call, callback) => {
      callback(null, { message: `Hello, ${call.request.name}` });
    },
    goodbye: async (call) => {
      return { message: `Goodbye, ${call.request.name}` };
    }
  }
});

server.listen("0.0.0.0:50051");
