setup:
	@script/setup
.PHONY: setup

lint:
	@script/lint
.PHONY: lint

enable-rabbit-admin:
	@docker-compose exec rabbit rabbitmq-plugins enable rabbitmq_management
.PHONY: enable-rabbit-ui

build:
	@docker-compose build --build-arg GITHUB_TOKEN=${GITHUB_TOKEN}
.PHONY: build

build-api:
	@docker-compose build --build-arg GITHUB_TOKEN=${GITHUB_TOKEN} --force-rm api
.PHONY: build-api

build-scheduler:
	@docker-compose build --build-arg GITHUB_TOKEN=${GITHUB_TOKEN} --force-rm scheduler
.PHONY: build-scheduler

build-webhook:
	@docker-compose build --build-arg GITHUB_TOKEN=${GITHUB_TOKEN} --force-rm webhook
.PHONY: build-webhook

build-worker:
	@docker-compose build --build-arg GITHUB_TOKEN=${GITHUB_TOKEN} --force-rm worker
.PHONY: build-worker

build-test:
	@docker-compose build --build-arg GITHUB_TOKEN=${GITHUB_TOKEN} --force-rm test
.PHONY: build-test

start:
	@docker-compose up
.PHONY: start

start-api:
	@docker-compose run -T -p 4000:4000 --name infinity-gauntlet_api_1 --rm api | ./node_modules/bunyan/bin/bunyan --color --output long
.PHONY: start-api

start-scheduler:
	@docker-compose run -T -e TASK=$(task) -e TASK_ENABLED=$(enabled) --name infinity-gauntlet_scheduler_1 --rm scheduler | ./node_modules/bunyan/bin/bunyan --color --output long
.PHONY: start-scheduler

start-webhook:
	@docker-compose run -T --name infinity-gauntlet_webhook_1 --rm webhook | ./node_modules/bunyan/bin/bunyan --color --output long
.PHONY: start-webhook

start-worker:
	@docker-compose run -T -e TASK=$(task) -e TASK_ENABLED=$(enabled) --name infinity-gauntlet_worker_1 --rm worker | ./node_modules/bunyan/bin/bunyan --color --output long
.PHONY: start-worker

run:
	@docker-compose rm -f -s runner && docker-compose build --build-arg GITHUB_TOKEN=${GITHUB_TOKEN} --force-rm runner > /dev/null && docker-compose run -T -e TASK=$(task) -e TASK_ENABLED=$(enabled) -e TASK_PARAMS=$(params) --rm runner | ./node_modules/bunyan/bin/bunyan --color --output long
.PHONY: run

execute:
	@TASK=$(task) TASK_ENABLED=$(enabled) TASK_PARAMS=$(params) script/start
.PHONY: execute

dry-run:
	@docker-compose rm -f -s dry-runner && docker-compose build --build-arg GITHUB_TOKEN=${GITHUB_TOKEN} --force-rm dry-runner > /dev/null && docker-compose run -T -e TASK=$(task) -e TASK_TYPE=$(type) -e TASK_ENABLED=$(enabled) -e TASK_PARAMS=$(params) --rm dry-runner | ./node_modules/bunyan/bin/bunyan --color --output long

test:
	@docker-compose rm -f -s api && docker-compose run -T -e TEST_ONLY=$(spec) --rm test
.PHONY: test

console-api:
	@docker-compose exec api /bin/sh
.PHONY: console-api

console-scheduler:
	@docker-compose exec scheduler /bin/sh
.PHONY: console-scheduler

console-webhook:
	@docker-compose exec webhook /bin/sh
.PHONY: console-webhook

console-worker:
	@docker-compose exec worker /bin/sh
.PHONY: console-worker

console-test:
	@docker-compose exec test /bin/sh
.PHONY: console-test

teardown:
	@docker-compose down --volumes --remove-orphans --rmi local
.PHONY: teardown

setup-api-debug-local:
	@npm install -g esm nodemon dotenv
	@rm -rf build
	@ln -s ./src ./build
	@yarn install --ignore-engines
	@make build
	@docker-compose -f docker-compose.api.debug.yml up -d
.PHONY: setup-local-debug

run-api-debug-local:
	nodemon --ignore 'build' --inspect -r dotenv/config -r esm build/bootstrap.js "api"
.PHONY: run-local-debug

