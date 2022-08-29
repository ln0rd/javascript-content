import ValidationPayoutAlreadyExists from 'application/core/errors/validation-payout-already-exists'
import Affiliation from 'application/core/models/affiliation'
import Company from 'application/core/models/company'
import Payout, { reasons as PayoutReason } from 'application/core/models/payout'
import Provider from 'application/core/models/provider'
import Promise from 'bluebird'
import cuid from 'cuid'
import { translate } from 'framework/core/adapters/i18n'
import createLogger from 'framework/core/adapters/logger'
import frameworkConfig from 'framework/core/config'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import PixMerchantService from 'application/core/services/pix-merchant'
import BankService from 'application/core/services/bank'
import moment from 'moment'
const taskName = 'MANUAL_VALIDATION_PAYOUT_TASK'
const Logger = createLogger({ name: taskName })
const findCompanyAndVerifyValidationPayoutFlag = async companyId => {
  const company = await Company.findOne({
    _id: companyId,
    'company_metadata.validation_payout_disabled': { $ne: true }
  })
    .select('bank_account')
    .lean()
    .exec()
  if (!company) {
    Logger.info(
      { companyId },
      'company-not-found-or-validation-payout-disabled'
    )
    throw new ModelNotFoundError(
      frameworkConfig.core.i18n.defaultLocale,
      translate('models.company', frameworkConfig.core.i18n.defaultLocale)
    )
  }
  return company
}
function getDocumentTypeByDocumentNumber(documentNumber) {
  if (documentNumber.length === 11) return 'cpf'
  if (documentNumber.length === 14) return 'cnpj'
  return ''
}
export default class ManualValidationPayout {
  static type() {
    return 'manual'
  }
  static async handler(args) {
    const cnpjPixType = 1
    const cpfPixType = 2
    const savingAccountPixType = 1
    const checkingAccountPixType = 4
    const uid = cuid()
    const companyId = args[0]
    const amount = 1
    Logger.info({ args }, 'manual-validation-payout-started')
    const companyPayoutValidationFlag = await findCompanyAndVerifyValidationPayoutFlag(
      companyId
    )
    if (!companyPayoutValidationFlag.bank_account) {
      Logger.warn({ companyId }, 'company-bank-account-not-found')
      return
    }
    return Promise.resolve()
      .then(findExistingPendingPayout)
      .then(createValidationPayout)
      .then(() => {
        Logger.info({ companyId, amount }, 'manualValidationPayoutSuccess')
        return null
      })
      .catch(err => {
        if (err instanceof ValidationPayoutAlreadyExists) {
          return
        }
        Logger.error({ err, companyId, amount }, 'manualValidationPayoutFailed')
        throw err
      })
    function findExistingPendingPayout() {
      return Payout.find({
        reason: 'bank_account_validation',
        status: 'pending',
        company_id: companyId
      })
        .lean()
        .exec()
    }
    function createValidationPayout(payouts) {
      if (payouts && payouts.length > 0) {
        Logger.info({ companyId, amount }, 'manualValidationPayoutExists')
        return Promise.reject(
          new ValidationPayoutAlreadyExists(
            frameworkConfig.core.i18n.defaultLocale
          )
        )
      } else {
        return Promise.resolve()
          .then(findProviders)
          .each(executePayouts)
      }
    }
    function findProviders() {
      return Provider.find({
        provider_type: 'subacquirer',
        enabled: true
      })
    }
    function executePayouts(provider) {
      return Promise.all([Promise.resolve(amount)]).spread(
        findAffiliationAndExecutePayout
      )
      function findAffiliationAndExecutePayout(amount) {
        return Promise.resolve()
          .then(findAffiliation)
          .then(executePayout)
        function findAffiliation() {
          return Affiliation.findOne({
            provider: provider.name,
            company_id: companyId,
            enabled: true
          })
            .lean()
            .exec()
        }
        async function executePayout() {
          const company = await Company.findById(companyId).select(
            'full_name document_number document_type bank_account transfer_configurations document_type company_metadata name created_at parent_id'
          )
          const strCode = company.bank_account.bank_code
          let ispbBankCode = company.bank_account.bank_code
          const banks = await BankService.getBanks()
          company.bank_account.bank_code = company.bank_account.bank_code.padStart(
            3,
            '0'
          )
          company.bank_account.agencia = company.bank_account.agencia.substring(
            0,
            4
          )
          const bank = banks.find(bank => bank.code === ispbBankCode)
          if (!bank) {
            const locale = frameworkConfig.core.i18n.defaultLocale
            throw new ModelNotFoundError(
              locale,
              translate('models.bank', locale)
            )
          }
          const branchCode = bank.ispbBranchCode.find(
            i => i.branch === company.bank_account.agencia
          )
          ispbBankCode = branchCode ? branchCode.code : bank.ispbCode
          const documentType = company.bank_account.document_type
            ? company.bank_account.document_type
            : getDocumentTypeByDocumentNumber(
                company.bank_account.document_number
              )
          const now = moment()
          const payout = await Payout.create({
            provider: provider.name,
            automatic: true,
            description: 'PIX - ' + company.full_name.toUpperCase(),
            amount: amount,
            fee: 0,
            source_type: 'infinity-gauntlet',
            source_id: uid,
            method: 'pix',
            reason: PayoutReason.bankAccountValidation,
            date: moment().format('YYYY-MM-DD'),
            company_id: companyId,
            payout_provider: {
              uuid: provider._id,
              transfer_code: '',
              rail_id: '',
              rail_type: 'pix',
              create_raw_response: '',
              confirm_raw_request: '',
              result_raw_request: []
            },
            status: 'pending',
            status_message: '',
            destination: {
              bank_code: ispbBankCode,
              agencia: company.bank_account.agencia,
              conta: company.bank_account.conta,
              conta_dv: company.bank_account.conta_dv,
              type: company.bank_account.type,
              document_type: documentType,
              document_number: company.bank_account.document_number,
              legal_name: company.full_name
            },
            frozen_amount_id: '',
            created_at: now,
            updated_at: now,
            iso_id: company.parent_id,
            _company_partial: {
              name: company.name,
              document_number: company.document_number,
              full_name: company.full_name,
              document_type: company.document_type,
              created_at: company.created_at,
              company_metadata: company.company_metadata
            }
          })
          const resp = await PixMerchantService.createWithBankAccount(
            amount,
            {
              bankCode: strCode,
              ispbBankCode: ispbBankCode,
              branchCode: company.bank_account.agencia,
              accountNumber:
                company.bank_account.conta + company.bank_account.conta_dv,
              accountType:
                company.bank_account.type === 'conta_corrente'
                  ? checkingAccountPixType
                  : savingAccountPixType,
              holder: {
                legalName: company.full_name,
                documentNumber: company.bank_account.document_number,
                documentType: documentType === 'cnpj' ? cnpjPixType : cpfPixType
              }
            },
            payout._id,
            taskName
          ).catch(async function() {
            await Payout.findById(payout._id).update({
              $set: {
                status: 'failed',
                updated_at: moment()
              }
            })
          })
          await Payout.findById(payout._id).update({
            $set: {
              'payout_provider.transfer_code': resp.id,
              updated_at: moment()
            }
          })
        }
      }
    }
  }
}
