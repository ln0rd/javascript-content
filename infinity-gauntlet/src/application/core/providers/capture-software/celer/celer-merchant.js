import R from 'ramda'
import createLogger from 'framework/core/adapters/logger'
import celerSegmentCode from './celer-segments'

const Logger = createLogger({
  name: 'CELER_MERCHANT_SERVICE'
})

export default class CelerMerchantService {
  constructor({ client }) {
    this.client = client
  }

  findCelerMerchant(cnpj) {
    return this.client.findMerchantByDocument({ identificationId: cnpj })
  }

  normalizeCelerString(data) {
    return data.normalize('NFD').replace(/[^0-9a-zA-Z\s]/g, '')
  }

  async createMerchant(company) {
    const neighborhoodInsideCode = await this.defineNeighborhoodCode(
      company.address
    )

    const creationPayload = {
      typeDocument: company.document_type.toUpperCase(),
      identification: company.document_number,
      codeMerchant: company.id_str,
      name: this.normalizeCelerString(company.name),
      tradingName: this.normalizeCelerString(company.full_name),
      segmentInsideCode: celerSegmentCode(company.mcc),
      address: {
        street: this.normalizeCelerString(company.address.street.substr(0, 15)),
        number: '1',
        complement: 'COMPL',
        cep: company.address.zipcode,
        referencePoint: '',
        neighborhoodInsideCode
      }
    }

    Logger.info({ payload: creationPayload }, 'creating-celer-merchant')

    return this.client.createMerchant(creationPayload)
  }

  async defineDepartmentId(company) {
    const result = await this.findCelerMerchant(company.document_number)

    let merchant = R.head(result.response.findMerchant)

    if (!merchant) {
      Logger.info('no-celer-merchant-found')

      const creationResult = await this.createMerchant(company)

      merchant = creationResult.response
    }

    return merchant.departmentInsidecode || merchant.departmentId
  }

  async defineNeighborhoodCode({ neighborhood, city, state, zipcode: cep }) {
    const address = {
      neighborhood,
      city,
      state,
      cep,
      country: 'BR'
    }

    Logger.info({ payload: address }, 'finding-celer-neighborhood')

    const result = await this.client.getNeighborhoodCode(address)

    return result.response.addressPostOfficesInsideCode
  }
}
