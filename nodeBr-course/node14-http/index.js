const http = require('http')

http.createServer((requeste, response) => {
    response.end('Hello Node!!!')
})
.listen(5000, () => console.log('O servidor está rodando'))
