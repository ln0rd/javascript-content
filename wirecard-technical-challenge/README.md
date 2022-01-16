# Como Rodar aplicação

### Requisitos (Contenha instalado em sua máquina)

- Npm package
- MongoDb
- NodeJS
- Docker (Caso opte em utilizar)

### Subindo um container do MongoDB no Docker

```
docker run \
    --name mongodb \
    -p 27017:27017 \
    -e MONGO_INITDB_ROOT_USERNAME=admin \
    -e MONGO_INITDB_ROOT_PASSWORD=mypassword \
    -d \
    mongo:4 \
```

### Criando um database dentro do MongoDb e um usuario para acessar essas informações

```
docker exec -it mongodb \
    mongo --host localhost -u admin -p mypassword --authenticationDatabase admin \
    --eval "db.getSiblingDB('wirecard').createUser({user: 'myuser', pwd: 'mypassword', roles: [{role: 'readWrite', db: 'wirecard'}]})"
```

### Executando o projeto
Precisamos instalar a node_modules para que a api funcione corretamente com suas dependências,
vá até a pasta:
```
api/v1
```
e execute o seguinte comando:
```
npm install
```
assim que o mongoDb estiver funcionando com as configurações acima, vá até o arquivo:
```
api/v1/routes/index.js
```
e execute o comando para iniciar o funcionando da api:
```
node index.js
```
Neste momento a api já esta disponível para receber as rotas.

### Rotas disponiveis

Link para acessar a Documentação da API.
```
https://documenter.getpostman.com/view/5267825/RztispvQ
```
### Estrutura do projeto

O projeto contem suas camadas separadas em controllers, services, database, routes e utils, e o arquivo index.js
fica na na pasta routes do projeto para receber as rotas, as controllers ficam no encargo de mandar os dados recebidos para o serviço correto que fica dentro da pasta services, onde ocorrem validações dos dados que chegam,
assim do serviço é enviado ao arquivo na database responsável para inserir o dado no banco de dados e realizar consultas. A pasta utils fica disponível para inserções externas ou classes que auxiliam no projeto.

### Bandeiras de Cartões aceitas

- American Express
- Diner's Club
- Discover
- JCB
- Maestro
- MasterCard
- UnionPay
- Visa

#### Alguns exemplos de cartões para testes
```
American Express: 378282246310005
Diner's Club: 38520000023237
Discover: 6011454931724887
JCB: 3566002020360505
Maestro: 6763946698976220
MasterCard: 5206034443216817
UnionPay: 6234253249408910
Visa: 4012888888881881
```

### Testes

Para executar os testes vá até a pasta:
```
api/v1
```
e execute o seguinte comando:
```
npm test
```
nesse momento os testes serão executados.
