# pricing-engine

A configurable engine that calculates fees, costs, splits, etc.

# Getting Started

This project is based on a [Technical Specification](https://docs.google.com/document/d/1TzijtRqkp6RUAMDczm5nTzGDuspBLJZnJa7U9sEK96g/)

## Commands

To start the database in the background:

```
$ docker-compose up -d postgres
```

To start the development server:

```
$ docker-compose up app
```

To migrate the local database:

```
$ docker-compose run --entrypoint "npm run knex -- migrate:up" app
```

> `npm run knex` is a wrapper around [Knex's own migration CLI](http://knexjs.org/#Installation-migrations). Refer to the docs for more info.
> Knex's seed generation doesn't prepend the filename with the timestamp for order. Use the following command to generate Seeds:
> `npm run knex -- seed:make $(date "+%Y%m%d%H%M%S")_seed_name`

To run end-to-end tests:

```
$ npm run test:e2e
```
