'use strict'

const commander = require('commander')
const Verify = require('./Verify')



async function main() {
    commander
        .version('v1')
        .option('-c, --check [value]', 'File will be checked')
        .parse(process.argv)
    

    if(commander.check){

        new Verify(commander.check)

    }

}

main()