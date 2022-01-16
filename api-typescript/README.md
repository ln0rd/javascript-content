## api_typescript

An API wrote in type_script with the purpose to learning more about typescript


## running
Geting up the database
```
docker run -d -p 27017:27017 -p 28017:28017 -e AUTH=no tutum/mongodb
```

or by docker-compose
```
docker-compose up
```

running the application

First
```
npm run compile
```

and
```
npm start
```