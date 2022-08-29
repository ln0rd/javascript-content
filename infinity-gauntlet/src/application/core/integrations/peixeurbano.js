import request from 'axios'
// import iconv from 'iconv-lite'
import Promise from 'bluebird'
import Company from 'application/core/models/company'
import createLogger from 'framework/core/adapters/logger'
import IntegrationGenericError from 'application/core/errors/integration-generic-error'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import { translate } from 'framework/core/adapters/i18n'
import R from 'ramda'

const Logger = createLogger({ name: 'PEIXEURBANO_INTEGRATION' })

export function processIntegration(locale, variables, credential, data) {
  return Promise.resolve()
    .then(getCompany)
    .tap(checkCompany)
    .then(createRequest)
    .spread(sendRequest)
    .then(respond)
    .catch(errorHandler)

  function getCompany() {
    return Company.findOne({ _id: credential.company_id })
      .lean()
      .exec()
  }

  function checkCompany(company) {
    if (!company) {
      throw new ModelNotFoundError(locale, translate('models.company', locale))
    }
  }

  function createRequest(company) {
    const Opts = {
      baseURL: variables.baseUrl,
      method: 'get',
      responseType: 'text',
      params: {
        appSecret: variables.secretKey,
        couponCode: data.code,
        pin: credential.key
      }
    }

    const IntegrationType = data.method || 'getcoupon'

    if (IntegrationType === 'getcoupon') {
      Opts.url = '/Get'
    }

    if (IntegrationType === 'redeemcoupon') {
      Opts.url = '/RedeemWithPin'
      Opts.method = 'post'
    }

    return [Opts, company]
  }

  function sendRequest(options, company) {
    const Response = {
      integration_body: JSON.stringify(options.params),
      request_body: JSON.stringify(data)
    }

    return request(options)
      .then(response => {
        Logger.debug('Response from peixeurbano:')
        Logger.debug(response.data)

        // const Content = iconv.decode(response.data, 'ISO-8859-1')
        // const Parsed = JSON.parse(Content)
        const Parsed = response.data

        let jsonResponse = {}

        if (data.method === 'getcoupon') {
          jsonResponse = {
            code: Parsed.Code,
            message: Parsed.Message,
            coupon_id: Parsed.Result[0].CouponId,
            coupon_status: Parsed.Result[0].CouponStatus,
            discount_name: Parsed.Result[0].DiscountName,
            price_split_title: Parsed.Result[0].PriceSplitTitle,
            price_split_description: Parsed.Result[0].PriceSplitDescription,
            discount_original_value: Parsed.Result[0].DiscountOriginalValue,
            contract_id: Parsed.Result[0].ContractId,
            coupon_value: Parsed.Result[0].CouponValue,
            purchase_id: Parsed.Result[0].PurchaseId,
            purchase_date: Parsed.Result[0].PurchaseDate,
            expiration_date: Parsed.Result[0].ExpirationDate,
            unified_purchase_id: Parsed.Result[0].UnifiedPurchaseId,
            company_id: Parsed.Result[0].CompanyId,
            buyer_user_account_id: Parsed.Result[0].BuyerUserAccountId
          }

          const cnpjMatch =
            Parsed.Result[0].CompanyCNPJ &&
            (Parsed.Result[0].CompanyCNPJ.substring(0, 4) === credential.key ||
              Parsed.Result[0].CompanyCNPJ === company.document_number)

          const peixeIdMatch =
            `${Parsed.Result[0].CompanyId}` ===
            R.path(['company_metadata', 'peixe_company_id'], company)

          if (!(cnpjMatch || peixeIdMatch)) {
            jsonResponse.coupon_status = 69
          }
        } else if (Parsed.Code === -1) {
          if (
            Parsed.Result === 'CouponNotFound' ||
            Parsed.Result === 'InvalidPin'
          ) {
            jsonResponse = {
              code: Parsed.Code,
              message: Parsed.Message,
              result: Parsed.Result,
              redeem_user: '',
              redeem_date: '',
              deal_name: '',
              buying_option_title: '',
              redeemer_key: ''
            }
          } else {
            jsonResponse = {
              code: Parsed.Code,
              message: Parsed.Message,
              result: Parsed.Result.Result,
              redeem_user: Parsed.Result.ResultInfo.RedeemUser,
              redeem_date: Parsed.Result.ResultInfo.RedeemDate,
              deal_name: Parsed.Result.ResultInfo.DealName,
              buying_option_title: Parsed.Result.ResultInfo.BuyingOptionTitle,
              redeemer_key: Parsed.Result.ResultInfo.RedeemerKey
            }
          }
        } else {
          jsonResponse = {
            code: Parsed.Code,
            // message: Parsed.Message,
            result: Parsed.Result.Result,
            redeem_user: Parsed.Result.cupon.RecipientName,
            // redeem_date: Parsed.Result.ResultInfo.RedeemDate,
            deal_name: Parsed.Result.Discount.ShortTitle,
            buying_option_title: Parsed.Result.cupon.PurchaseOption
            // redeemer_key: Parsed.Result.ResultInfo.RedeemerKey,
          }
        }

        Response.integration_response = JSON.stringify(jsonResponse)

        if (jsonResponse.code === -1) {
          Response.status = 'failed'
        } else {
          Response.status = 'success'
        }

        return Response
      })
      .catch(err => {
        Response.status = 'failed'

        if (err.response) {
          Response.integration_response = JSON.stringify(err.response.data)
        } else if (err.request) {
          // The request was made but no response was received
          Response.integration_response = `The request was made but no response was received`
        } else {
          Response.integration_response = err.message
        }

        return Response
      })
  }

  function respond(response) {
    return response
  }

  function errorHandler(err) {
    if (err.public) {
      throw err
    }

    Logger.error('A generic error has occurred on peixeurbano integration.')
    Logger.error(err)

    throw new IntegrationGenericError(locale, err, 'peixeurbano')
  }
}
