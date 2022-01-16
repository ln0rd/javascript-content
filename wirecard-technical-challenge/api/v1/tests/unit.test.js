const assert = require('assert')
const Services = require('../services/service')
const Database = require('../database/mongodb')
const database = new Database()
const services = new Services()



describe('Testes Unitários', function () {
    it('Deve retornar uma string com 48 caracteres', function () {
        const result = services.generatorBoletoCodebar()
        const expected = 48
        assert.deepEqual(result.length, expected )
    })

    it('Deve returnar false, dizendo que há conteudo vázio', function () {
        var mock_validateEmptyData_false = {
            1: '',
            2: 'conteudo',
            3: 'conteudo'
        }
        const result = services.validateEmptyData(mock_validateEmptyData_false)
        const expected = false
        assert.deepEqual(result, expected)
    })

    it('Deve returnar true, dizendo que não há conteudo vázio', function () {
        var mock_validateEmptyData_true = {
            1: 'conteudo',
            2: 'conteudo',
            3: 'conteudo'
        }
        const result = services.validateEmptyData(mock_validateEmptyData_true)
        const expected = true
        assert.deepEqual(result, expected)
    })

    it('Deve identificar e retornar o nome da bandeira do cartão', function () {
        const result = services.identifyIssuerCard(4012888888881881)
        const expected = 'visa'
        assert.deepEqual(result, expected)
    })

    it('Deve retornar false dizendo que o cartão é inválido', function () {
        const result = services.validateCard(1012888888881881)
        const expected = false
        assert.deepEqual(result, expected)
    })

    it('Deve retornar true dizendo que o cartão é válido', function () {
        const result = services.validateCard(4012888888881881)
        const expected = true
        assert.deepEqual(result, expected)
    })

    it('Deve retornar os dados do pagamento', async function () {
        const result = await services.status(false, true)
        const expected = {
            Payment_Information: {
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
        assert.deepEqual(result, expected)
    })

    it('Deve retornar o nome e email do comprador', async function () {
        const result = await services.identifyBuyer(false, true)
        const expected = {
            name: 'Leonardo Lemes Bufalo',
            email: 'leonardolsbufalo@gmail.com'
        }
        assert.deepEqual(result, expected)
    })

    it('Deve retornar se concluiu o cadastro do comprador', async function () {
        const result = await services.registerBuyer(false, true)
        const expected = {
            IsOk: true,
            message: 'Comprador cadastro com sucesso'
        }
        assert.deepEqual(result, expected)
    })

    it('Deve retornar se concluiu o cadastro do Pagamento de cartão', async function () {
        const result = await services.doCardPayment(false, true)
        const expected = {
            IsOk: true,
            message: 'Seu pagamento foi registrado com sucesso, e já está disponivel para consulta'
        }
        assert.deepEqual(result, expected)
    })

    it('Deve retornar se concluiu o cadastro do Pagamento de Boleto', async function () {
        const result = await services.doBoletoPayment(false, true)
        const expected = {
            IsOk: true,
            codebar: '341917900101043510047910201500085776895833333330'
        }
        assert.deepEqual(result, expected)
    })

})
