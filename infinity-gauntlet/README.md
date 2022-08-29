```bash
                   __  .__   __.  _______  __  .__   __.  __  .___________.____    ____
                  |  | |  \ |  | |   ____||  | |  \ |  | |  | |           |\   \  /   /
                  |  | |   \|  | |  |__   |  | |   \|  | |  | `---|  |----` \   \/   /
                  |  | |  . `  | |   __|  |  | |  . `  | |  |     |  |       \_    _/
                  |  | |  |\   | |  |     |  | |  |\   | |  |     |  |         |  |
                  |__| |__| \__| |__|     |__| |__| \__| |__|     |__|         |__|

           _______      ___      __    __  .__   __. .___________. __       _______ .___________.
          /  _____|    /   \    |  |  |  | |  \ |  | |           ||  |     |   ____||           |
         |  |  __     /  ^  \   |  |  |  | |   \|  | `---|  |----`|  |     |  |__   `---|  |----`
         |  | |_ |   /  /_\  \  |  |  |  | |  . `  |     |  |     |  |     |   __|      |  |
         |  |__| |  /  _____  \ |  `--'  | |  |\   |     |  |     |  `----.|  |____     |  |
          \______| /__/     \__\ \______/  |__| \__|     |__|     |_______||_______|    |__|
```

[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![Maintenance](https://img.shields.io/maintenance/yes/2018.svg)]()
[![CircleCI](https://circleci.com/gh/hashlab/infinity-gauntlet.svg?style=svg&circle-token=5021e912fab4be10faa7014f2cb56d6c87ee2bf0)](https://circleci.com/gh/hashlab/infinity-gauntlet)

> The powerful system that powers the HashLab company

## Dependencies

- [Docker for Mac](https://www.docker.com/docker-mac)
- [Node.js@10.24.1](https://nodejs.org/en/)
- [Yarn](https://yarnpkg.com/en/)

## Getting Started

1º Install development dependencies
```bash
$ npm i -g eslint prettier eslint-config-prettier eslint-plugin-prettier eslint-plugin-promise eslint-plugin-import yarn
```

2º Clone infinity-gauntlet repo
```bash
$ git clone git@github.com:hashlab/infinity-gauntlet.git
```

3º Enter in infinity-gauntlet directory
```bash
$ cd infinity-gauntlet
```

4º Define the GITHUB_TOKEN environment variable in your .bashrc or .zshrc
```bash
$ echo 'export GITHUB_TOKEN="YOUR_TOKEN"' >> ~/.zshrc
```

This is used to install GitHub npm packages,
more information [here](https://help.github.com/en/packages/using-github-packages-with-your-projects-ecosystem/configuring-npm-for-use-with-github-packages)
Just create a personal access token as described [here](https://help.github.com/en/github/authenticating-to-github/creating-a-personal-access-token-for-the-command-line)
and make sure to select the `read:packages` scope.

5º Run the setup script
```bash
$ make setup
```

Run the application
```bash
$ make start
```

Run the tests
```bash
$ make test
```

Run only one test
```bash
$ make test spec=integration/endpoints/status
```

Run node with automatically load environment variables from a .env
```bash
$ node -r dotenv/config build/bootstrap.js "api"
```

Run api locally with debugger
```bash
$ make setup-api-debug-local
$ make run-api-debug-local
```

## Deploying

After merging an approved PR to master, go to https://gitlab.com/hashlaborg/ig-core/infinity-gauntlet/-/pipelines

On `Pipelines` page, click `Run pipeline` button.

<img width="1320" alt="Captura de Tela 2021-04-26 às 14 58 54" src="https://user-images.githubusercontent.com/1719344/116129210-38a13800-a6a0-11eb-86aa-c340cdf7924c.png">

It will send you to the following page, just click again on `Run pipeline`

<img width="1303" alt="Captura de Tela 2021-04-26 às 14 59 09" src="https://user-images.githubusercontent.com/1719344/116129353-638b8c00-a6a0-11eb-8e25-f73f9d60eab6.png">

Wait for the build and test jobs to succeed, then click to deploy the components your change affects (e.g. web:ig-api)

<img width="672" alt="Captura de Tela 2021-04-26 às 14 26 09" src="https://user-images.githubusercontent.com/1719344/116129534-97ff4800-a6a0-11eb-95d1-3d32447f40bd.png">

Wait for the job(s) to succeed.

## Applications

The Infinity Gauntlet is composed by Applications.

* [API](src/application/api)
* [Core](src/application/core)
* [Mailer](src/application/mailer)
* [Queue](src/application/queue)
* [WebHook](src/application/webhook)

Types of queue applications:

- [Runner](src/application/queue/tasks/manual)
- [Scheduler](src/application/queue/tasks/periodic)
- [Worker](src/application/queue/tasks/triggered)
- [Dry Runner](scr/application/queue/tasks/manual)

This can be configured by `APPLICATION_TYPE` environment variable see
`docker-compose.yaml` for example.
Each application type can have different tasks which is the exact name of
javascript files on it's application tasks folders.
The docker compose use an example task as place holder if you want to test
a different one change the `TASK` environment variable. For instance if you
want to test the register dispute task just change from `triggered-example`
to `register-dispute` of service `worker` in `docker-compose.yaml`. The other
way is to follow production and have all 99 tasks entries
[like](https://github.com/hashlab/infinity-gauntlet/blob/master/.gitlab-ci/workers-cd.yml).

## Conventions of commit messages

Addding files on repo

```bash
git commit -m "Add filename"
```

Updating files on repo

```bash
git commit -m "Update filename, filename2, filename3"
```

Removing files on repo

```bash
git commit -m "Remove filename"
```

Renaming files on repo

```bash
git commit -m "Rename filename"
```

Fixing errors and issues on repo

```bash
git commit -m "Fixed #issuenumber Message about this fix"
```

Adding features on repo

```bash
git commit -m "Add feature: nameoffeature Message about this feature"
```

Updating features on repo

```bash
git commit -m "Update feature: nameoffeature Message about this update"
```

Removing features on repo

```bash
git commit -m "Remove feature: nameoffeature Message about this"
```
