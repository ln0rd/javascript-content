class Mocks {

    MockStatus() {
        return {
            id_client: '1',
            name_buyer: 'Leonardo Lemes Bufalo',
            email_buyer: 'leonardolsbufalo@gmail.com',
            cpf_buyer: '12345678901',
            amount_payment: '100.00',
            type_payment: 'boleto',
            card_information: {
                card_name: 'Leonardo L Bufalo',
                card_expiration: '30/10',
                card_number: '4012888888881881',
                card_issuer: 'visa',
                card_cvv: '104'
            },
            boleto_information: {
                boleto_codebar: ''
            },
            payment_status: 0
        }
    }

    MockidentifyBuyer(){
        return {
            name: 'Leonardo Lemes Bufalo',
            email: 'leonardolsbufalo@gmail.com'
        }
    }

    MockregisterBuyer(){
        return {
            IsOk: true,
            message: 'Comprador cadastro com sucesso'
        }
    }

    MockdoCardPayment(){
        return {
            IsOk: true,
            message: 'Seu pagamento foi registrado com sucesso, e já está disponivel para consulta'
        }
    }

    MockdoBoletoPayment(){
        return {
            IsOk: true,
            codebar: '341917900101043510047910201500085776895833333330'
        }
    }

}

module.exports = Mocks
