import R from 'ramda'
import request from 'request-promise'
import moment from 'moment'
import xml2js from 'xml2js'
import Promise from 'bluebird'
import { translate } from 'framework/core/adapters/i18n'
import createLogger from 'framework/core/adapters/logger'
import { scheduleToDeliver } from 'framework/core/helpers/mailer'
import { completeWithZeros } from 'application/core/helpers/complete-with-zeros'
import IntegrationGenericError from 'application/core/errors/integration-generic-error'

const Logger = createLogger({ name: 'SAPLEOMADEIRAS_INTEGRATION' })

function noWhiteSpace(strings, ...placeholders) {
  const withSpace = strings.reduce(
    (result, string, i) => result + placeholders[i - 1] + string
  )
  const withoutSpace = withSpace.replace(/$\n^\s*/gm, '')
  return withoutSpace
}

/**
 * Return the liquidation business date
 * @param {Date} date
 * @returns {string}
 */
export const getLiquidationDateFormatted = date =>
  moment(date)
    .add(1, 'days')
    .format('DDMMYYYY')

/**
 * Default data to SAP integration
 * The fields map and format and sizes is documented here product-development/issues/222
 * @param {Object} credential
 * @param {Object} data
 */
export async function integrationDefaultData(credential, data) {
  const createdAtDate = new Date(data.transaction.created_at)

  const documentNumberNode = data.document_type === 'cpf' ? 'STCD2' : 'STCD1'
  const createdAt = moment(createdAtDate).format('DDMMYYYY')
  const liquidationDate = await getLiquidationDateFormatted(createdAtDate)
  const totalAmount = completeWithZeros(
    parseFloat(data.transaction.total_amount / 100).toFixed(2),
    16
  )
  const leoAmount = completeWithZeros(
    parseFloat(data.transaction.leo_amount / 100).toFixed(2),
    16
  )
  const installments = completeWithZeros(data.transaction.installments, 2)
  const brand = data.transaction.brand.toUpperCase()

  return {
    [documentNumberNode]: data.document_number,
    BUPLA: credential.key,
    BLDAT: createdAt,
    ZFBDT: liquidationDate,
    WRBTR: leoAmount,
    VALORTOTTRANS: totalAmount,
    NUNPARC: installments,
    ESTORNO: data.is_refund ? 'S' : '',
    XREF2: brand,
    XBLNR: completeWithZeros(data.transaction.id, 10),
    XREF3: completeWithZeros(data.transaction.id, 20),
    XREF1: completeWithZeros(data.transaction.id, 12),
    ID_UNICO: data.transaction.provider_transaction_id
  }
}

/**
 * Specific data when provider is Stone
 * The fields map and format and sizes is documented here product-development/issues/222
 * @param {Object} data
 */
export async function integrationStoneData() {
  // This is so that we can deploy and start testing triggered events.
  if (process.env.LEOSAP_HASH_INTEGRATION === false) {
    return {}
  }

  return {
    VERSAO: '1'
  }
}

/**
 * Specific data when provider is Hash
 * The fields map and format and sizes is documented here product-development/issues/222
 * @param {Object} data
 */
export async function integrationHashData(data, cardBrandCodes) {
  const firstInstallment = completeWithZeros(
    parseFloat(data.transaction.firstInstallment / 100).toFixed(2),
    16
  )
  const taxes = completeWithZeros(
    parseFloat(data.transaction.taxes / 100).toFixed(2),
    16
  )
  const debitCred = data.transaction.paymentMethod === 'debit_card' ? '1' : '2'

  const brand = data.transaction.brand.toLowerCase()
  let bandeira = 999 // if the brand is unknown the leo asked to send 999

  if (cardBrandCodes[brand]) {
    bandeira = cardBrandCodes[brand]
  } else {
    Logger.warn(
      {
        brand,
        transactionId: data.transaction.id
      },
      'leo-madeiras-sap-brand-unknown'
    )
  }

  return {
    VERSAO: '2',
    BANDEIRA: bandeira,
    NSU: completeWithZeros(data.transaction.id, 15),
    VALORTAXA: taxes,
    VALORPRIMEIRAPARCELA: firstInstallment,
    CODAUTORIZA: '',
    DEBIT_CRED: debitCred
  }
}

/**
 * Generate XML to send to LEO SAP
 * @param {Object} credential
 * @param {Object} data
 */
export async function integrationXMLBody(credential, data, cardBrandCodes) {
  const { provider } = data.transaction
  const [defaultValues, providerValues] = await Promise.all([
    integrationDefaultData(credential, data),
    provider === 'hash'
      ? integrationHashData(data, cardBrandCodes)
      : integrationStoneData(data)
  ])

  const integrationData = Object.assign({}, defaultValues, providerValues)

  const xmlNodes = Object.keys(integrationData)
    .map(node => `<${node}>${integrationData[node]}</${node}>`)
    .join('')

  const body = noWhiteSpace`
  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:sap-com:document:sap:rfc:functions">
    <soapenv:Header/>
    <soapenv:Body>
      <urn:ZSPLIT_HASHLAB>
        <I_XML>
          <item>
            ${xmlNodes}
          </item>
        </I_XML>
      </urn:ZSPLIT_HASHLAB>
    </soapenv:Body>
  </soapenv:Envelope>
  `

  return body
}

export async function sendRequest({ url, user, password }, body, data) {
  const integrationRequestResponse = {
    integration_body: body,
    request_body: data
  }

  const response = await request.post({
    url,
    auth: {
      user,
      password
    },
    headers: {
      'Content-Type': 'text/xml'
    },
    body
  })

  integrationRequestResponse.integration_response = response

  // eslint-disable-next-line promise/avoid-new
  const parsedData = await new Promise((resolve, reject) => {
    xml2js.parseString(response, (err, parsed) => {
      if (err) {
        return reject(err)
      }
      return resolve(parsed)
    })
  })

  const ResBody = R.pathOr(
    null,
    ['SOAP-ENV:Envelope', 'SOAP-ENV:Body', 0, 'urn:ZSPLIT_HASHLAB.Response', 0],
    parsedData
  )

  integrationRequestResponse.status = 'failed'

  if (ResBody) {
    const ResSuccess = ResBody.E_SUCESSO[0]
    if (ResSuccess) {
      integrationRequestResponse.status = 'success'
    }
  }

  return integrationRequestResponse
}

function sendEmailFailed(locale, transactionId, response) {
  return scheduleToDeliver(
    'base',
    'leomadeiras-integration',
    'errosap@hash.com.br',
    ['monitoramento.split@leomadeiras.com.br'],
    translate('mailer.leomadeiras_integration.subject', locale, transactionId),
    locale,
    { response: response }
  )
}

export async function processIntegration(locale, variables, credential, data) {
  const xmlBody = await integrationXMLBody(
    credential,
    data,
    variables.card_brand_codes
  )

  try {
    Logger.info({ body: xmlBody, data }, 'sap-request-outbound')

    const response = await sendRequest(variables, xmlBody, data)

    Logger.info({ response, data }, 'sap-response-received')

    if (response.status === 'failed') {
      Logger.error(
        { response, data },
        'leo-madeiras-sap-response-status-failed'
      )

      sendEmailFailed(locale, data.transaction.id, response).catch(err =>
        Logger.error({ err, data }, 'leo-madeiras-sap-send-email-failed')
      )
    }

    return response
  } catch (err) {
    err.config = variables
    err.config.baseUrl = variables.url
    if (err.public) {
      throw err
    }

    Logger.error({ err, data }, 'generic-sapleo-madeiras-error')

    throw new IntegrationGenericError(locale, err, 'sapleomadeiras')
  }
}
