(function () {
    // Click Controller
    var boxPayment = document.querySelector('.box.payment')
    var boxBuyer = document.querySelector('.box.buyer')
    var boxStatus = document.querySelector('.box.status')
    var statusbox = document.querySelector('.statusResponse')
    var statustitle = document.querySelector('#textStatus')
    var statuscodebar = document.querySelector('#textCodebar')

    function listener(event, element, callback) {
        document.querySelector(element)
            .addEventListener(event, callback, false)

    }

    listener('click', '.box.payment .box_top .close', closePayment)
    listener('click', '.box.buyer .box_top .close', closeBuyer)
    listener('click', '.box.status .box_top .close', closeStatus)
    listener('click', '.btn_payment', openPayment)
    listener('click', '.btn_buyer', openBuyer)
    listener('click', '.btn_status', openStatus)
    listener('click', '.btn_choose.boleto', selectPayment)
    listener('click', '.btn_choose.credit_card', selectPayment)
    listener('click', '.content .statusResponse .close', closeResponse)

    function selectPayment(el) {
        var btnBoleto = document.querySelector('.btn_choose.boleto')
        var btnCard = document.querySelector('.btn_choose.credit_card')
        var contentCard = document.querySelector('.payment-complete-send')

        if(el.target.classList.contains('boleto')) {
            btnCard.classList.remove('-active')
            contentCard.classList.remove('-active')
            btnBoleto.classList.add('-active')
        }

        if (el.target.classList.contains('credit_card')) {
            btnBoleto.classList.remove('-active')
            contentCard.classList.add('-active')
            btnCard.classList.add('-active')
        }

    }

    function closeResponse() {
        event.stopPropagation()
        statusbox.classList.remove('-active')
        statustitle.innerHTML = ''
        statuscodebar.innerHTML = ''
    }

    function closePayment() {
        event.stopPropagation()
        boxPayment.classList.remove('-active')
    }

    function closeBuyer() {
        event.stopPropagation()
        boxBuyer.classList.remove('-active')
    }

    function closeStatus() {
        event.stopPropagation()
        boxStatus.classList.remove('-active')
    }

    function openPayment() {
        event.stopPropagation()
        closeBuyer()
        closeStatus()
        boxPayment.classList.add('-active')
    }

    function openBuyer() {
        event.stopPropagation()
        closePayment()
        closeStatus()
        boxBuyer.classList.add('-active')
    }

    function openStatus() {
        event.stopPropagation()
        closePayment()
        closeBuyer()
        boxStatus.classList.add('-active')
    }

})();
(function () {
    // Payment
    //getters
    var cpf = document.querySelector('#cpf')
    var amount = document.querySelector('#amount')
    var card_name = document.querySelector('#card_name')
    var card_number = document.querySelector('#card_number')
    var card_expiration = document.querySelector('#card_expiration')
    var card_cvv = document.querySelector('#card_cvv')
    var statustitle = document.querySelector('#textStatus')
    var statusbox = document.querySelector('.statusResponse')
    var statuscodebar = document.querySelector('#textCodebar')
    var typePay = null


    function listener(event, element, callback) {
        document.querySelector(element)
            .addEventListener(event, callback, false)

    }

    listener('click', '#confirmPayment', sendPayment)
    listener('click', '.btn_choose.boleto', typePayment)
    listener('click', '.btn_choose.credit_card', typePayment)


    function sendPayment() {

        if (typePay === null) {
            statusbox.classList.add('-active')
            statustitle.innerHTML = 'Precisa selecionar o tipo de pagamento'
            return
        }

        var ajax = new XMLHttpRequest()
        ajax.open('POST', 'http://localhost:8002/payment/register')
        ajax.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
        ajax.send(`id_client=32&cpf_buyer=${cpf.value}&amount_payment=${amount.value}&type_payment=${typePay}&card_name=${card_name.value}&card_number=${card_number.value}&card_expiration=${card_expiration.value}&card_cvv=${card_cvv.value}`)
        ajax.onreadystatechange = function () {
            if (ajax.readyState == 4) {
                var data = JSON.parse(ajax.response)
                statusbox.classList.add('-active')
                if (data.IsOk == true ) {
                    statustitle.innerHTML = data.message
                    if (data.codebar !== undefined) {
                        statustitle.innerHTML = 'Pagamento em Boleto realizado com sucesso!'
                        statuscodebar.innerHTML = data.codebar
                    }
                    return
                }
                if (data.Error.IsOk == false) {
                    statustitle.innerHTML = data.Error.message
                    return
                }

            }
        }
    }

    function typePayment(el) {
        typePay = el.target.getAttribute('data-value')
    }

})();



(function () {
    // register buyer
    var name_buyer = document.querySelector('#name_buyer')
    var cpf_buyer = document.querySelector('#cpf_buyer')
    var email_buyer = document.querySelector('#email_buyer')
    var statustitle = document.querySelector('#textStatus')
    var statusbox = document.querySelector('.statusResponse')
    var statuscodebar = document.querySelector('#textCodebar')



    function listener(event, element, callback) {
        document.querySelector(element)
            .addEventListener(event, callback, false)

    }

    listener('click', '#sendBuyer', registerBuyer)

    function registerBuyer() {
        var ajax = new XMLHttpRequest()
        ajax.open('POST', 'http://localhost:8002/buyer/register')
        // quando for post precisa passar o header
        ajax.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
        // ajax.send('username=keanu&age=54')
        ajax.send(`cpf_buyer=${cpf_buyer.value}&name_buyer=${name_buyer.value}&email_buyer=${email_buyer.value}`)
        ajax.onreadystatechange = function () {
            if (ajax.readyState == 4) {
                var data = JSON.parse(ajax.response)
                statusbox.classList.add('-active')
                if (data.IsOk == true) {
                    statustitle.innerHTML = data.message
                }
                if (data.IsOk == false) {
                    statustitle.innerHTML = 'Ops! Ocorreu um problema!'
                    statustitle.innerHTML = data.message
                }
                if (data.codebar !== undefined) {
                    statuscodebar.innerHTML = data.codebar
                }

            }
        }
    }
})();

(function () {

    var cpf = document.querySelector('#status_cpf')
    var box_result = document.querySelector('.box.status .info_status .box_result')
    var statustitle = document.querySelector('#textStatus')
    var statusbox = document.querySelector('.statusResponse')

    function listener(event, element, callback) {
        document.querySelector(element)
            .addEventListener(event, callback, false)
    }

    listener('click', '#verifyStatus', verifyStatus)

    function verifyStatus(){

        box_result.innerHTML = ''

        var ajax = new XMLHttpRequest()
        ajax.open('GET', `http://localhost:8002/payment/status/${cpf.value}`)
        ajax.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
        ajax.send()
        ajax.onreadystatechange = function () {
            if (ajax.readyState == 4) {
                var data = JSON.parse(ajax.response)

                if (data.Error) {
                    statusbox.classList.add('-active')
                    statustitle.innerHTML = data.Error.message
                    return
                }

                for ( var payment in data.Payment_Information ){

                    if (data.Payment_Information[payment].payment_status === 0) {
                        data.Payment_Information[payment].payment_status = "Aguardando"
                    }
                    if (data.Payment_Information[payment].payment_status === 1) {
                        data.Payment_Information[payment].payment_status = 'Aprovado'
                    }
                    if (data.Payment_Information[payment].payment_status === 2) {
                        data.Payment_Information[payment].payment_status = 'Negado'
                    }

                    if (data.Payment_Information[payment].type_payment === 'card') {
                        box_result.innerHTML +=
                            `<div class="item">
                            <div class="line">Id do cliente: ${data.Payment_Information[payment].id_client}</div>
                            <div class="line -white">Nome do Comprador: ${data.Payment_Information[payment].name_buyer}</div>
                            <div class="line">Email do Comprador: ${data.Payment_Information[payment].email_buyer}</div>
                            <div class="line -white">CPF do Comprador: ${data.Payment_Information[payment].cpf_buyer}</div>
                            <div class="line">Valor do Pagamento: ${data.Payment_Information[payment].amount_payment}</div>
                            <div class="line -white">Tipo de Pagamento: ${data.Payment_Information[payment].type_payment}</div>
                            <div class="line -white">Nome do Cartão: ${data.Payment_Information[payment].card_information.card_name}</div>
                            <div class="line">Expiração do Cartão: ${data.Payment_Information[payment].card_information.card_expiration}</div>
                            <div class="line -white">Numero do Cartão: ${data.Payment_Information[payment].card_information.card_number}</div>
                            <div class="line">Bandeira do Cartão: ${data.Payment_Information[payment].card_information.card_issuer}</div>
                            <div class="line -white">Código de Segurança: ${data.Payment_Information[payment].card_information.card_cvv}</div>
                            <div class="line">Status do Pagamento: ${data.Payment_Information[payment].payment_status}</div>
                            </div>`
                        }


                    if (data.Payment_Information[payment].type_payment === 'boleto') {
                        box_result.innerHTML +=
                            `<div class="item">
                            <div class="line">Id do cliente: ${data.Payment_Information[payment].id_client}</div>
                            <div class="line -white">Nome do Comprador: ${data.Payment_Information[payment].name_buyer}</div>
                            <div class="line">Email do Comprador: ${data.Payment_Information[payment].email_buyer}</div>
                            <div class="line -white">CPF do Comprador: ${data.Payment_Information[payment].cpf_buyer}</div>
                            <div class="line">Valor do Pagamento: ${data.Payment_Information[payment].amount_payment}</div>
                            <div class="line -white">Tipo de Pagamento: ${data.Payment_Information[payment].type_payment}</div>
                            <div class="line">Código do Boleto: ${data.Payment_Information[payment].boleto_information.boleto_codebar}</div>
                            <div class="line">Status do Pagamento: ${data.Payment_Information[payment].payment_status}</div>
                            </div>`
                        }



                    }
            }
        }
    }

})();
