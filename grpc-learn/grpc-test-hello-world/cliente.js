const {createClient} = require("grpc-kit");
const client = createClient({
  protoPath: "greeter.proto",
  packageName: "greeter",
  serviceName: "Greeter"
}, "0.0.0.0:50051");

client.hello({ name: "Jack" }, (err, response) => {
  if(err) throw err;
  console.log(response.message);
});

client.goodbye({ name: "John" }, (err, response) => {
  if(err) throw err;
  console.log(response.message);
});