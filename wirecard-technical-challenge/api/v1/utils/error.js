class ErrorHandling {

    constructor(type, message){

        return {
            Error: {
                IsOk: false,
                type: type,
                message: message
            }
        }

    }

}

module.exports = ErrorHandling
