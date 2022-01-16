'use strict'

const fs = require("fs")
const Table = require("le-table");



class Verify {

    constructor(FILE_NAME){

        let list = []
        let jsonContent = this.getData(FILE_NAME)
        this.count(jsonContent, list)
        this.showTable(jsonContent, list)

    }


    getData(FILE_NAME) {

        var contents = fs.readFileSync("./../files/" + FILE_NAME);
        var jsonContent = JSON.parse(contents);
        return jsonContent

    }

    showTable(jsonContent, list) {

        let data = [
            ["MPA", "FILE", "ENTRYS"],
            [jsonContent.moipAccountId , jsonContent.id , { text: list.join('\n'), data: { hAlign: "left" } }]
        ];

        var myTable = new Table();
        for (let i = 0; i < data.length; ++i) {
            myTable.addRow([i].concat(data[i]), {
                hAlign: i > 2 ? "left": "right"
            });
        }
        console.log(myTable.stringify());

    }

    count(jsonContent, list) {

        let resources = jsonContent.settledEntries.resources
        var exist = false

        for (const keys in resources) {
            for (const propReference in resources[keys]) {
                if(propReference === 'references'){
                    for (const itemsRef in resources[keys][propReference]) {
                        if( resources[keys][propReference][itemsRef].type === 'PAYMENT' ){
                            exist = true
                        }
                    }

                    if ( exist !== true ){
                        this.setEntrysList(resources[keys].externalId, list)
                    }

                    exist = false

                }

            }

        }

    }

    setEntrysList(entry, list){
        list.push(entry)

    }

}

module.exports = Verify
