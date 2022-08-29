import R from 'ramda'
import moment from 'moment-timezone'
import Promise from 'bluebird'
import config from 'application/core/config'
import Anticipation, {
  PROCESSING,
  FAILED,
  CANCELED,
  CONFIRMED,
  ANTICIPATED,
  errorReasons
} from 'application/core/models/anticipation'
import Affiliation from 'application/core/models/affiliation'
import Payable from 'application/core/models/payable'
import { translate } from 'framework/core/adapters/i18n'
import { validate } from 'framework/core/adapters/validator'
import Company from 'application/core/models/company'
import CompanyService from 'application/core/services/company'
import sendWebHook from 'application/webhook/helpers/deliverer'
import {
  isBusinessDay,
  getNextBusinessDayNotToday
} from 'application/core/helpers/date'
import ValidationError from 'framework/core/errors/validation-error'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import {
  AnticipationError,
  AnticipationNotEnoughFundsError,
  AnticipationInvalidDateError,
  AnticipationBusinessHoursError,
  AnticipationPendingAlreadyExistsError
} from 'application/core/errors/spot-anticipation-errors'
import { anticipationResponder } from 'application/core/responders/anticipation'
import createLogger from 'framework/core/adapters/logger'
import NotImplementedError from 'framework/core/errors/not-implemented-error'
import frameworkConfig from 'framework/core/config'
import SpotAnticipationRevert from 'application/queue/tasks/triggered/spot-anticipation-revert'
import { publishMessage } from 'framework/core/adapters/queue'
import { anticipationPayablesResponder } from 'application/core/responders/webhook/anticipation-payables'

const Big = require('big.js')
const minPayableNetAmount = Number(config.anticipation.spot.minPayableNetAmount)
const baseValidPayablesQuery = {
  anticipatable: true,
  anticipated: false,
  status: 'waiting_funds',
  provider: 'hash', // CODE SMELL: when time comes, choosing the provider should be enabled
  affected_by_cip: { $ne: true }
}

export default class AnticipationService {
  static anticipateChildren(
    locale,
    params,
    parentId,
    companyId,
    simulation,
    testRun
  ) {
    return Promise.bind(this)
      .then(getChildCompany)
      .tap(checkChildCompany)
      .then(anticipate)

    function getChildCompany() {
      return CompanyService.getCompany(locale, companyId)
    }

    function checkChildCompany(childCompany) {
      if (!childCompany || childCompany.parent_id !== parentId) {
        throw new ModelNotFoundError(
          locale,
          translate('models.company', locale)
        )
      }
    }

    function anticipate(company) {
      return this.anticipate(locale, params, company, simulation, testRun)
    }
  }

  static anticipate(locale, params, companyId, simulation, testRun) {
    const isChild = R.has('id', companyId)
    const Logger = createLogger({
      name: `SPOT_ANTICIPATION_${simulation ? 'SIMULATION' : 'REQUEST'}`
    })
    const validPayablesQuery = Object.assign(
      {
        // TEMPORARY: 2021-06-08 Problems in CIP integration for same-day anticipations
        created_at: {
          $lt: moment()
            .tz(config.timezone)
            .startOf('day')
            .toDate()
        }
      },
      baseValidPayablesQuery
    )

    return Promise.resolve()
      .tap(checkParams)
      .tap(checkBusinessHours)
      .then(checkAnticipationDate)
      .tap(checkBusinessDate)
      .then(getCompany)
      .tap(checkPendingAnticipation)
      .then(checkFeeRule)
      .then(runAnticipation)
      .then(respond)

    function checkParams() {
      const Errors = validate('anticipation', params)

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }

      if (!(simulation || isChild)) {
        params = R.pick(
          [
            'anticipate_to',
            'payables_priority',
            'anticipate_all',
            'requested_amount'
          ],
          params
        )
      }

      params.anticipate_to = moment(params.anticipate_to).format('YYYY-MM-DD')
    }

    async function checkPendingAnticipation(company) {
      const anticipation = await Anticipation.findOne(
        {
          status: CONFIRMED,
          // using the same sanity check as other parts of the code
          anticipating_company: `${company.id}`
        },
        { _id: 1 }
      )

      if (anticipation) {
        const error = new AnticipationPendingAlreadyExistsError(locale)

        const context = {
          existingAnticipation: anticipation._id,
          companyId: company.id
        }

        Logger.error(context, 'pending-anticipation-found')

        error.context = context

        throw error
      }

      Logger.info({}, 'no-pending-anticipation-found')
    }

    async function checkBusinessHours() {
      const now = moment().tz(config.timezone)

      const hours = now.hours()

      const after9 = hours >= 9
      // TEMP: Should be before 21h after 31-08-21
      // due to CIP temporary changes
      const before20 = hours < 20

      const duringBusinessHours = after9 && before20
      const todayIsBusinessDay = await isBusinessDay(now)

      if (!duringBusinessHours || !todayIsBusinessDay) {
        throw new AnticipationBusinessHoursError(locale)
      }
    }

    function checkAnticipationDate() {
      let today = testRun
        ? '2019-04-01'
        : moment()
            .tz(config.timezone)
            .format('YYYY-MM-DD')

      if (
        !(
          moment(params.anticipate_to).isValid() &&
          moment(today).isBefore(params.anticipate_to, 'day')
        )
      ) {
        throw new AnticipationInvalidDateError(locale)
      }
      return isBusinessDay(params.anticipate_to)
    }

    function checkBusinessDate(isBusinessDay) {
      if (!isBusinessDay) {
        throw new AnticipationInvalidDateError(locale, 'business')
      }
    }

    function getCompany() {
      if (isChild) {
        return companyId
      } else {
        return CompanyService.getCompany(locale, companyId)
      }
    }

    function checkFeeRule(company) {
      let anticipationFee = 3
      let anticipationType = 'per_month'

      if (!company) {
        throw new ModelNotFoundError(
          locale,
          translate('models.company', locale)
        )
      }

      validPayablesQuery.company_id = `${company.id}` || company

      if (R.has('anticipation_fee', params)) {
        anticipationFee = params.anticipation_fee
      } else if (
        R.path(['fee_rule', 'anticipation_fee'], company) !== undefined
      ) {
        anticipationFee = company.fee_rule.anticipation_fee
      }

      if (R.has('anticipation_type', params)) {
        anticipationType = params.anticipation_type
      } else if (
        R.path(['fee_rule', 'anticipation_type'], company) !== undefined
      ) {
        anticipationType = company.fee_rule.anticipation_type
      }

      company.fee_rule = {
        anticipation_fee: anticipationFee,
        anticipation_type: anticipationType
      }

      return company
    }

    function runAnticipation(company) {
      const anticipationFee = company.fee_rule.anticipation_fee
      const anticipationType = company.fee_rule.anticipation_type
      const anticipateTo = moment(params.anticipate_to)

      const anticipationSimulationData = {
        requested_by_parent: isChild,
        anticipation_fee: anticipationFee,
        anticipation_type: anticipationType,
        anticipating_company: company.id,
        parent_company: company.parent_id,
        requested_amount: params.requested_amount,
        payables_priority: params.payables_priority,
        anticipate_to: params.anticipate_to,
        anticipate_all: params.anticipate_all || false,
        payables_count: 0,
        status_history: [],
        detailed_summary: {},
        net_amount: 0,
        anticipation_fee_amount: 0,
        anticipatable_amount: 0,
        type: 'spot'
      }

      if (params.requested_amount <= config.anticipation.spot.amountThreshold) {
        return Promise.resolve()
          .then(getPayables)
          .tap(checkPayables)
          .then(calculateAnticipation)
          .then(anticipate)
      } else {
        throw new NotImplementedError(locale)
      }

      function getPayables() {
        const payablesQuery = Object.assign(
          {
            payment_date: {
              $gt: params.anticipate_to
            }
          },
          validPayablesQuery
        )

        return Payable.aggregate([
          {
            $match: payablesQuery
          },
          {
            $project: {
              installment: 1,
              total_installments: 1,
              payment_date: 1,
              amount: 1,
              cost: 1,
              fee: 1,
              cip_escrowed_amount: {
                $ifNull: ['$cip_escrowed_amount', 0]
              }
            }
          },
          {
            $addFields: {
              net_amount: {
                $subtract: [
                  '$amount',
                  {
                    $add: ['$cost', '$fee', '$cip_escrowed_amount']
                  }
                ]
              }
            }
          },
          {
            $match: {
              net_amount: {
                $gt: minPayableNetAmount
              }
            }
          },
          {
            $group: {
              _id: '$payment_date',
              total_amount: {
                $sum: '$amount'
              },
              total_cost: {
                $sum: '$cost'
              },
              total_fee: {
                $sum: '$fee'
              },
              total_net_amount: {
                $sum: '$net_amount'
              },
              count: {
                $sum: 1
              }
            }
          },
          {
            $sort: {
              _id: params.payables_priority === 'start' ? 1 : -1
            }
          }
        ]).allowDiskUse(true)
      }

      function checkPayables(payablesAggregate) {
        let totalAvailableAmount = payablesAggregate.reduce(
          (totalAvailableAmount, payable) =>
            (totalAvailableAmount += payable.total_net_amount),
          0,
          payablesAggregate
        )

        if (
          payablesAggregate.length === 0 ||
          totalAvailableAmount < params.requested_amount ||
          (totalAvailableAmount === params.requested_amount &&
            anticipationFee > 0)
        ) {
          throw new AnticipationNotEnoughFundsError(locale)
        }
      }

      function calculateAnticipation(payablesAggregate) {
        let anticipationSimulationNetAmount = 0

        if (anticipationType === 'per_installment') {
          return Promise.resolve()
            .then(getSpecificPayables)
            .then(detailedCalculation)
            .then(updateSimulation)
        } else {
          return Promise.resolve()
            .then(coarseCalculation)
            .then(updateSimulation)
        }

        function coarseCalculation() {
          let lastPayableAggregateDate

          let partialSum = 0
          let anticipationValues

          payablesAggregate.some(payable => {
            anticipationValues = calculateAnticipationFeeAmount(
              payable.total_net_amount,
              moment(payable._id),
              anticipateTo,
              anticipationFee,
              anticipationType
            )

            partialSum += anticipationValues.netAmount

            if (
              partialSum <= params.requested_amount ||
              params.anticipate_all
            ) {
              anticipationSimulationData.detailed_summary[
                anticipationValues.date
              ] = {
                date: anticipationValues.date,
                duration: anticipationValues.duration,
                anticipation_fee_amount:
                  anticipationValues.anticipationFeeAmount,
                anticipatable_amount: anticipationValues.payableAmount,
                net_amount: anticipationValues.netAmount,
                payables_count: payable.count
              }

              anticipationSimulationNetAmount = partialSum
              return partialSum === params.requested_amount
            } else {
              lastPayableAggregateDate = payable._id
              return true
            }
          })

          if (anticipationSimulationNetAmount === params.requested_amount) {
            return anticipationSimulationData
          }

          if (!params.anticipate_all) {
            return Promise.resolve(lastPayableAggregateDate)
              .then(getSpecificPayables)
              .then(detailedCalculation)
          }
        }

        function getSpecificPayables(lastPayableAggregate) {
          if (!lastPayableAggregate && anticipationType !== 'per_installment') {
            throw new AnticipationNotEnoughFundsError(locale)
          }

          const query = Object.assign({}, validPayablesQuery)
          const sort = {}

          if (lastPayableAggregate && anticipationType === 'per_month') {
            query.payment_date = lastPayableAggregate
            sort.net_amount = 1
          } else if (anticipationType === 'per_installment') {
            sort.payment_date = params.payables_priority === 'start' ? 1 : -1
            sort.net_amount = 1
            query.payment_date = {
              $gt: params.anticipate_to
            }
          }

          return Payable.aggregate([
            {
              $match: query
            },
            {
              $project: {
                installment: 1,
                total_installments: 1,
                payment_date: 1,
                amount: 1,
                cost: 1,
                fee: 1
              }
            },
            {
              $addFields: {
                net_amount: {
                  $subtract: [
                    '$amount',
                    {
                      $add: ['$cost', '$fee']
                    }
                  ]
                }
              }
            },
            {
              $match: {
                net_amount: {
                  $gt: minPayableNetAmount
                }
              }
            },
            { $sort: sort }
          ]).allowDiskUse(true)
        }

        function detailedCalculation(payables) {
          let anticipationValues
          let currentSummary

          payables.some(payable => {
            anticipationValues = calculateAnticipationFeeAmount(
              payable.net_amount,
              moment(payable.payment_date),
              anticipateTo,
              anticipationFee,
              anticipationType,
              payable.total_installments || 1
            )

            currentSummary =
              anticipationSimulationData.detailed_summary[
                anticipationValues.date
              ]

            if (!currentSummary) {
              currentSummary = {
                date: anticipationValues.date,
                duration: anticipationValues.duration,
                anticipation_fee_amount: 0,
                anticipatable_amount: 0,
                net_amount: 0,
                payables_count: 0
              }
            }

            currentSummary.anticipatable_amount +=
              anticipationValues.payableAmount
            currentSummary.payables_count += 1

            currentSummary.anticipation_fee_amount +=
              anticipationValues.anticipationFeeAmount

            currentSummary.net_amount +=
              currentSummary.anticipatable_amount -
              currentSummary.anticipation_fee_amount

            anticipationSimulationData.detailed_summary[
              anticipationValues.date
            ] = currentSummary

            anticipationSimulationNetAmount += anticipationValues.netAmount

            return anticipationSimulationNetAmount >= params.requested_amount
          })
        }

        function updateSimulation() {
          anticipationSimulationData.detailed_summary = R.mapObjIndexed(
            summary => {
              anticipationSimulationData.payables_count +=
                summary.payables_count
              anticipationSimulationData.anticipatable_amount +=
                summary.anticipatable_amount
              anticipationSimulationData.anticipation_fee_amount +=
                summary.anticipation_fee_amount

              summary.net_amount =
                summary.anticipatable_amount - summary.anticipation_fee_amount

              return summary
            },
            anticipationSimulationData.detailed_summary
          )

          anticipationSimulationData.net_amount =
            anticipationSimulationData.anticipatable_amount -
            anticipationSimulationData.anticipation_fee_amount

          return anticipationSimulationData
        }
      }

      function anticipate(anticipationData) {
        if (anticipationData.net_amount < (params.requested_amount || 0)) {
          throw new AnticipationNotEnoughFundsError(locale)
        }

        if (simulation) {
          return anticipationData
        } else {
          return Promise.resolve()
            .then(saveAnticipationRequest)
            .then(returnToUser)
        }

        async function saveAnticipationRequest() {
          Logger.info(
            'Received valid spot anticipation request',
            R.pick(
              [
                'requested_amount',
                'anticipation_fee',
                'anticipation_type',
                'payables_priority',
                'anticipate_to',
                'anticipate_all',
                'payables_count',
                'anticipating_company'
              ],
              anticipationData
            )
          )
          anticipationSimulationData.status_history.push(CONFIRMED)
          anticipationSimulationData.status = CONFIRMED
          anticipationSimulationData.detailed_summary = R.values(
            anticipationSimulationData.detailed_summary
          )

          const anticipation = await Anticipation.create(
            anticipationSimulationData
          )
          await sendAnticipationWebhook(anticipation, {
            eventName: 'anticipation_created',
            oldStatus: null
          })
          return anticipation
        }

        function returnToUser(anticipationRequest) {
          return anticipationRequest
        }
      }
    }

    function respond(response) {
      return anticipationResponder(response, simulation)
    }
  }

  static getChildrenAnticipations(locale, params, parentId, companyId) {
    return Promise.bind(this)
      .then(getCompany)
      .tap(checkCompany)
      .then(getAnticipations)

    function getCompany() {
      return Company.findOne({ _id: companyId, parent_id: parentId })
        .lean()
        .exec()
    }

    function checkCompany(company) {
      if (!company) {
        throw new ModelNotFoundError(
          locale,
          translate('models.company', locale)
        )
      }
    }

    function getAnticipations() {
      return this.getAnticipations(locale, params, companyId)
    }
  }

  static getAnticipations(locale, params, companyId) {
    return Promise.resolve()
      .then(getAnticipations)
      .then(respond)

    function getAnticipations() {
      const query = R.pick(
        ['requested_amount', 'status', 'anticipate_all'],
        params
      )

      if (R.has('anticipate_to', params)) {
        query.anticipate_to = params.anticipate_to
      } else if (R.has('end_date', params) || R.has('start_date', params)) {
        query.anticipate_to = {}

        if (R.has('end_date', params)) {
          query.anticipate_to.$lte = params.end_date
        }

        if (R.has('start_date', params)) {
          query.anticipate_to.$gte = params.start_date
        }
      }

      if (R.has('anticipation_id', params)) {
        query._id = params.anticipation_id
      }

      query.anticipating_company = companyId

      return Anticipation.find(query)
        .lean()
        .exec()
    }

    function respond(response) {
      return anticipationResponder(response)
    }
  }

  static cancelChildrenAnticipation(
    locale,
    anticipationId,
    parentId,
    companyId
  ) {
    return Promise.bind(this)
      .then(getCompany)
      .tap(checkCompany)
      .then(cancelAnticipation)

    function getCompany() {
      return Company.findOne({ _id: companyId, parent_id: parentId })
        .lean()
        .exec()
    }

    function checkCompany(company) {
      if (!company) {
        throw new ModelNotFoundError(
          locale,
          translate('models.company', locale)
        )
      }
    }

    function cancelAnticipation() {
      return this.cancelAnticipation(locale, anticipationId, companyId)
    }
  }

  static cancelAnticipation(locale, anticipationId, companyId) {
    return Promise.resolve()
      .then(cancelAnticipation)
      .tap(checkAnticipation)
      .then(respond)

    function cancelAnticipation() {
      const query = {
        anticipating_company: companyId,
        status: CONFIRMED,
        _id: anticipationId
      }

      return Anticipation.findOneAndUpdate(
        query,
        {
          $set: {
            status: CANCELED,
            canceled_at: moment().toISOString()
          },
          $push: { status_history: CANCELED }
        },
        { new: true }
      )
        .lean()
        .exec()
    }

    function checkAnticipation(anticipation) {
      if (!anticipation) {
        throw new ModelNotFoundError(
          locale,
          translate('models.spot_anticipation', locale)
        )
      }
    }

    function respond(response) {
      return anticipationResponder(response)
    }
  }

  static getSummary(locale, params, companyId) {
    const Logger = createLogger({
      name: `SPOT_ANTICIPATION_GET_SUMMARY`
    })
    const validPayablesQuery = Object.assign({}, baseValidPayablesQuery)
    const payablesQuery = Object.assign(
      {
        company_id: companyId,

        // TEMPORARY: 2021-06-08 Problems in CIP Integration for same-day anticipations
        created_at: {
          $lt: moment()
            .tz(config.timezone)
            .startOf('day')
            .toDate()
        }
      },
      validPayablesQuery
    )
    let anticipationConfig

    return Promise.resolve()
      .tap(checkParams)
      .then(checkAnticipationDate)
      .tap(checkBusinessDate)
      .then(getCompany)
      .then(checkFeeRule)
      .then(getNearestPayable)
      .then(checkPayable)
      .then(getSummary)
      .then(respond)

    function checkParams() {
      const Errors = validate('anticipation-simulation-summary', params)

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function checkAnticipationDate() {
      let today = moment()
        .tz(config.timezone)
        .format('YYYY-MM-DD')

      if (!moment(today).isBefore(params.anticipate_to, 'day')) {
        throw new AnticipationInvalidDateError(locale)
      }
      return isBusinessDay(params.anticipate_to)
    }

    function checkBusinessDate(isBusinessDay) {
      if (!isBusinessDay) {
        throw new AnticipationInvalidDateError(locale, 'business')
      }
    }

    function getCompany() {
      return CompanyService.getCompany(locale, companyId)
    }

    function checkFeeRule(company) {
      let anticipationFee = 3
      let anticipationType = 'per_month'

      if (!company) {
        throw new ModelNotFoundError(
          locale,
          translate('models.company', locale)
        )
      }

      validPayablesQuery.company_id = `${company.id}` || company

      if (R.has('anticipation_fee', params)) {
        anticipationFee = params.anticipation_fee
      } else if (
        R.path(['fee_rule', 'anticipation_fee'], company) !== undefined
      ) {
        anticipationFee = company.fee_rule.anticipation_fee
      }

      if (R.has('anticipation_type', params)) {
        anticipationType = params.anticipation_type
      } else if (
        R.path(['fee_rule', 'anticipation_type'], company) !== undefined
      ) {
        anticipationType = company.fee_rule.anticipation_type
      }

      company.fee_rule = {
        anticipation_fee: anticipationFee,
        anticipation_type: anticipationType
      }

      anticipationConfig = company.fee_rule

      if (anticipationType === 'per_installment') {
        throw new NotImplementedError(locale)
      }

      return company
    }

    function getNearestPayable() {
      payablesQuery.payment_date = {
        $gt: moment(params.anticipate_to).format('YYYY-MM-DD')
      }

      return Payable.aggregate([
        {
          $match: payablesQuery
        },
        {
          $project: {
            installment: 1,
            total_installments: 1,
            payment_date: 1,
            amount: 1,
            cost: 1,
            anticipation_fee: 1,
            anticipation_cost: 1,
            fee: 1
          }
        },
        {
          $addFields: {
            net_amount: {
              $subtract: [
                '$amount',
                {
                  $add: ['$cost', '$fee']
                }
              ]
            }
          }
        },
        {
          $match: {
            net_amount: {
              $gt: 0
            }
          }
        },
        {
          $sort: {
            payment_date: params.payables_priority === 'start' ? 1 : -1
          }
        },
        {
          $limit: 1
        }
      ])
    }

    function checkPayable(nearestPayable) {
      if (nearestPayable.length === 0) {
        Logger.warn(
          {
            nearestPayable
          },
          'anticipation-not-enough-funds-error'
        )
        throw new AnticipationNotEnoughFundsError(locale)
      }

      return nearestPayable[0]
    }

    function getSummary(nearestPayable) {
      return Promise.all([getMinimum(), getMaximum()])

      function getMinimum() {
        return Promise.resolve()
          .then(getPayable)
          .then(calculateAnticipation)

        function getPayable() {
          const query = Object.assign({}, payablesQuery)
          query.payment_date = nearestPayable.payment_date

          return Payable.aggregate([
            {
              $match: query
            },
            {
              $project: {
                installment: 1,
                total_installments: 1,
                payment_date: 1,
                amount: 1,
                cost: 1,
                anticipation_fee: 1,
                anticipation_cost: 1,
                fee: 1
              }
            },
            {
              $addFields: {
                net_amount: {
                  $subtract: [
                    '$amount',
                    {
                      $add: ['$cost', '$fee']
                    }
                  ]
                }
              }
            },
            {
              $match: {
                net_amount: {
                  $gt: minPayableNetAmount
                }
              }
            },
            {
              $sort: {
                net_amount: 1
              }
            },
            {
              $limit: 1
            }
          ])
        }

        function calculateAnticipation(minPayable) {
          if (minPayable.length === 0) {
            return 0
          } else {
            const payable = minPayable[0]

            let anticipationValues = calculateAnticipationFeeAmount(
              payable.net_amount,
              moment(payable.payment_date),
              moment(params.anticipate_to),
              anticipationConfig.anticipation_fee,
              anticipationConfig.anticipation_type,
              payable.total_installments
            )

            return anticipationValues.netAmount
          }
        }
      }

      function getMaximum() {
        return Promise.resolve()
          .then(getPayables)
          .then(calculate)

        function getPayables() {
          return Payable.aggregate([
            {
              $match: payablesQuery
            },
            {
              $project: {
                installment: 1,
                total_installments: 1,
                payment_date: 1,
                amount: 1,
                cost: 1,
                anticipation_fee: 1,
                anticipation_cost: 1,
                fee: 1
              }
            },
            {
              $addFields: {
                net_amount: {
                  $subtract: [
                    '$amount',
                    {
                      $add: ['$cost', '$fee']
                    }
                  ]
                }
              }
            },
            {
              $match: {
                net_amount: {
                  $gt: minPayableNetAmount
                }
              }
            },
            {
              $group: {
                _id: '$payment_date',
                net_amount: {
                  $sum: '$net_amount'
                }
              }
            }
          ])
        }

        function calculate(payables) {
          let anticipationSum = 0

          if (payables.length > 0) {
            let anticipationValues

            payables.forEach(payable => {
              anticipationValues = calculateAnticipationFeeAmount(
                payable.net_amount,
                moment(payable._id),
                moment(params.anticipate_to),
                anticipationConfig.anticipation_fee,
                anticipationConfig.anticipation_type
              )
              anticipationSum += anticipationValues.netAmount
            })
          }

          return anticipationSum
        }
      }
    }

    function respond(summary) {
      const min = summary[0]
      const max = summary[1]

      return {
        anticipate_to: moment(params.anticipate_to).format('YYYY-MM-DD'),
        payables_priority: params.payables_priority,
        anticipation_fee: anticipationConfig.anticipation_fee,
        anticipation_type: anticipationConfig.anticipation_type,
        minimum_amount: min,
        maximum_amount: max
      }
    }
  }

  static processAnticipation(anticipationId) {
    const locale = frameworkConfig.core.i18n.defaultLocale
    const Logger = createLogger({
      name: `PROCESS_SPOT_ANTICIPATION`
    })
    const costs = {}

    return Promise.resolve()
      .then(getAndLockAnticipationRequest)
      .tap(checkAnticipationRequest)
      .then(getCosts)
      .then(processAnticipationRequest)
      .then(finishAnticipation)
      .then(triggerNotifications)

    function getAndLockAnticipationRequest() {
      return Anticipation.findOneAndUpdate(
        {
          _id: anticipationId,
          status: CONFIRMED
        },
        {
          $set: {
            status: PROCESSING
          },
          $push: {
            status_history: PROCESSING
          }
        },
        { new: true }
      )
        .lean()
        .exec()
    }

    function checkAnticipationRequest(anticipationRequest) {
      if (!anticipationRequest) {
        throw new ModelNotFoundError(
          locale,
          translate('models.spot_anticipation', locale)
        )
      }
    }

    function getCosts(anticipationRequest) {
      return Promise.resolve()
        .then(getAffiliations)
        .then(parseCosts)

      function getAffiliations() {
        return Affiliation.find({
          company_id: anticipationRequest.anticipating_company
        })
          .lean()
          .exec()
      }

      function parseCosts(affiliations) {
        affiliations.forEach(affiliation => {
          costs[affiliation.provider] = R.path(
            ['costs', 'anticipation_cost'],
            affiliation
          )
        })

        return anticipationRequest
      }
    }

    function processAnticipationRequest(anticipationRequest) {
      return Promise.resolve(anticipationRequest)
        .then(getPayablesByAnticipation)
        .then(processPayables)
        .spread(finishProcessing)
        .catch(errorHandler)

      async function processPayables(payables) {
        let requestedAmountDifference = anticipationRequest.requested_amount

        const payablesToAnticipate = []
        const payablesCosts = {}
        let parentAffiliation

        let totalAnticipationFeeAmount = 0
        let totalAntecipatableAmount = 0
        let netAmount = 0

        payables.some(payable => {
          let anticipationValues = calculateAnticipationFeeAmount(
            payable.net_amount,
            moment(payable.payment_date),
            anticipationRequest.anticipate_to,
            anticipationRequest.anticipation_fee,
            anticipationRequest.anticipation_type,
            payable.total_installments || 1,
            costs[payable.provider] || 2
          )

          if (requestedAmountDifference > 0) {
            totalAntecipatableAmount += payable.net_amount

            requestedAmountDifference -= anticipationValues.netAmount
            netAmount += anticipationValues.netAmount
            totalAnticipationFeeAmount +=
              anticipationValues.anticipationFeeAmount

            let backupData = {
              cost: payable.cost,
              anticipation_cost: payable.anticipation_cost,
              fee: payable.fee,
              payment_date: payable.payment_date,
              anticipatable: payable.anticipatable,
              anticipated: payable.anticipated,
              anticipation_fee: payable.anticipation_fee,
              amount: payable.amount,
              anticipation_amount: payable.anticipation_amount
            }

            let updatedData = {
              id: payable._id,
              netAmount: anticipationValues.netAmount,
              anticipationFeeAmount: anticipationValues.anticipationFeeAmount,
              updatedData: {
                original_payment_date: payable.payment_date,
                anticipated: true,
                anticipatable: false,
                payment_date: anticipationRequest.anticipate_to,
                anticipation: anticipationRequest._id,
                updated_at: moment().toDate(),
                data_backup: backupData
              }
            }

            payablesToAnticipate.push(updatedData)
            payablesCosts[payable._id] =
              anticipationValues.anticipationCostAmount
            return false
          } else {
            return true
          }
        })

        // If there's not enough funds to anticipate the total amount requested,
        // nothing should be anticipated, unless if within a 2000 cents tolerance
        // range
        // Updated 2021-09-20: 100 to 500 cents tolerance
        // Updated 2021-10-29: 500 to 1000 cents tolerance
        // Updated 2021-12-23: 500 to 2000 cents tolerance
        if (requestedAmountDifference > 2000) {
          Logger.warn(
            {
              netAmount: netAmount,
              requestedAmount: anticipationRequest.requested_amount,
              anticipationId: anticipationId
            },
            'anticipation-not-enough-funds-error'
          )
          throw new AnticipationNotEnoughFundsError(locale)
        }

        if (anticipationRequest.parent_company) {
          parentAffiliation = await getParentAffiliation()
        }

        return Promise.map(
          payablesToAnticipate,
          payableData => {
            return Promise.resolve(payableData)
              .then(anticipatePayable)
              .tap(checkPayable)
              .then(createParentPayable)
              .tap(checkPayable)
          },
          { concurrency: 1000 }
        ).return([
          anticipationRequest,
          payables,
          totalAntecipatableAmount,
          totalAnticipationFeeAmount,
          netAmount
        ])

        async function getParentAffiliation() {
          return getAffiliation().then(checkParentAffiliation)

          function getAffiliation() {
            return Affiliation.find({
              company_id: anticipationRequest.parent_company,
              provider: 'hash' // CODE SMELL: when time comes, choosing the provider should be supported
            })
              .select('_id')
              .lean()
              .exec()
          }

          function checkParentAffiliation(affiliations) {
            if (affiliations.length === 0) {
              throw new ModelNotFoundError(
                locale,
                translate('models.affiliation', locale)
              )
            } else {
              if (affiliations.length > 1) {
                // CODE SMELL: we need to able to decide properly which affiliation to choose
                //             and be sure that this situation is even possible. But in any case,
                //             this will do for now.
                Logger.info(
                  {
                    affiliation_ids: affiliations.map(
                      affiliation => `${affiliation._id}`
                    )
                  },
                  'spot-anticipation-multiple-parent-affiliations'
                )
              }

              return affiliations[0]
            }
          }
        }

        function anticipatePayable(payableData) {
          const incrementData = {}

          if (!anticipationRequest.parent_company) {
            const calculatedAnticipationCost = payablesCosts[payableData.id]

            incrementData.anticipation_cost = calculatedAnticipationCost
            incrementData.cost = calculatedAnticipationCost
          } else {
            incrementData.anticipation_fee = payableData.anticipationFeeAmount
            incrementData.fee = payableData.anticipationFeeAmount
          }

          return Payable.findOneAndUpdate(
            {
              _id: payableData.id
            },
            {
              $set: payableData.updatedData,
              $inc: incrementData
            },
            { new: true }
          )
            .lean()
            .exec()
        }

        function createParentPayable(merchantPayable) {
          if (!anticipationRequest.parent_company) {
            return true
          }

          let cost = payablesCosts[merchantPayable._id]

          let newPayableData = R.pick(
            [
              'provider',
              'mcc',
              'origin_affiliation_id',
              'transaction_id',
              'provider_transaction_id',
              'transaction_nsu',
              'transaction_amount',
              'status',
              'capture_method',
              'split_rule_id',
              'total_installments',
              'installment',
              'payment_method',
              'transaction_captured_at',
              'card_brand',
              'type',
              'transaction_canceled',
              'origin_company_id'
            ],
            merchantPayable
          )

          newPayableData = Object.assign(newPayableData, {
            affiliation_id: parentAffiliation._id,
            anticipation: anticipationRequest._id,
            anticipated: false,
            anticipatable: true,
            company_id: anticipationRequest.parent_company,
            iso_id: anticipationRequest.parent_company,
            owner_company_id: anticipationRequest.parent_company,
            payment_date: anticipationRequest.anticipate_to,
            original_payment_date: merchantPayable.payment_date,
            fee: 0,
            anticipation_fee: 0,
            cost: cost,
            anticipation_cost: cost,
            amount: merchantPayable.anticipation_fee,
            anticipation_amount: merchantPayable.anticipation_fee,
            updated_at: moment().toDate()
          })

          return Payable.create(newPayableData)
        }

        function checkPayable(payable) {
          if (!payable) {
            throw new ModelNotFoundError(
              locale,
              translate('models.payable', locale)
            )
          }
        }
      }

      function finishProcessing(
        anticipation,
        payables,
        totalAntecipatableAmount,
        totalAnticipationFeeAmount,
        netAmount
      ) {
        return {
          payablesCount: payables.length,
          totalAntecipatableAmount: totalAntecipatableAmount,
          totalAnticipationFeeAmount: totalAnticipationFeeAmount,
          netAmount: netAmount,
          payables,
          estimatedData: {
            anticipatable_amount: anticipation.anticipatable_amount,
            anticipation_fee_amount: anticipation.anticipation_fee_amount,
            net_amount: anticipation.net_amount
          }
        }
      }

      function errorHandler(err) {
        anticipationRequest.status_history.push(FAILED)
        anticipationRequest.status = FAILED
        anticipationRequest.error_reason =
          err.name === 'AnticipationNotEnoughFundsError'
            ? errorReasons.notEnoughFunds
            : errorReasons.anticipationError

        /* eslint-disable promise/no-promise-in-callback*/
        return Promise.resolve()
          .then(updateAnticipation)
          .then(sendFailedWebhook)
          .then(triggerNotifications)
          .then(handleError)
          .finally(triggerRevert)

        function updateAnticipation() {
          return Anticipation.findOneAndUpdate(
            { _id: anticipationRequest._id },
            anticipationRequest,
            { new: true }
          )
            .lean()
            .exec()
        }

        function handleError() {
          Logger.error({
            err,
            operation: 'spot_anticipation',
            company_id: anticipationRequest.anticipating_company,
            parent_company_id: anticipationRequest.parent_company_id,
            requested_amount: anticipationRequest.requested_amount,
            anticipate_to: anticipationRequest.anticipate_to,
            anticipate_all: anticipationRequest.anticipate_all,
            payables_priority: anticipationRequest.payables_priority,
            anticipation_id: anticipationRequest._id
          })

          throw new AnticipationError(locale)
        }

        function triggerRevert() {
          // In this case, the anticipation process didn't even start
          // so there's no reason to trigger a revert
          if (err.name === 'AnticipationNotEnoughFundsError') {
            return
          }

          return SpotAnticipationRevert.handler(anticipationRequest._id)
        }
      }
    }

    function finishAnticipation(updatedAnticipationInfo) {
      return Promise.resolve()
        .then(updateAnticipation)
        .tap(logSuccess)

      async function updateAnticipation() {
        try {
          const anticipation = await Anticipation.findOneAndUpdate(
            {
              _id: anticipationId,
              status: PROCESSING
            },
            {
              $set: {
                status: ANTICIPATED,
                payables_count: updatedAnticipationInfo.payablesCount,
                net_amount: updatedAnticipationInfo.netAmount,
                anticipation_fee_amount:
                  updatedAnticipationInfo.totalAnticipationFeeAmount,
                anticipatable_amount:
                  updatedAnticipationInfo.totalAntecipatableAmount,
                estimated_data: updatedAnticipationInfo.estimatedData
              },
              $push: {
                status_history: ANTICIPATED
              }
            },
            { new: true }
          )
            .lean()
            .exec()

          await sendAnticipationWebhook(anticipation, {
            eventName: 'anticipation_anticipated',
            oldStatus: PROCESSING,
            newStatus: ANTICIPATED,
            payables: updatedAnticipationInfo.payables
          })

          try {
            await sendToAccountingQueue(anticipationId)
          } catch (err) {
            Logger.error({ err, anticipationId }, 'error-send-accounting-queue')
          }

          return anticipation
        } catch (err) {
          throw err
        }
      }

      function logSuccess(anticipation) {
        Logger.info(`Successfully processed spot anticipation!`, {
          anticipation_id: anticipation._id
        })
      }
    }

    async function triggerNotifications(anticipation) {
      return publishMessage(
        'NotifyAnticipationStatus',
        Buffer.from(
          JSON.stringify({
            anticipationId: anticipation._id
          })
        )
      )
    }
  }

  static getChildrenSummary(locale, params, companyId, childrenId) {
    return Promise.bind(this)
      .then(getChildCompany)
      .tap(checkChildCompany)
      .then(getChildSummary)

    function getChildCompany() {
      return CompanyService.getCompany(locale, childrenId)
    }

    function checkChildCompany(childCompany) {
      if (!childCompany || childCompany.parent_id !== companyId) {
        throw new ModelNotFoundError(
          locale,
          translate('models.company', locale)
        )
      }
    }

    function getChildSummary() {
      return this.getSummary(locale, params, childrenId)
    }
  }

  static async getNextAvailableDate(today = moment().tz(config.timezone)) {
    const nextBusinessDay = await getNextBusinessDayNotToday(today)
    return { available_date: moment(nextBusinessDay).format('YYYY-MM-DD') }
  }
}

export function calculateAnticipationFeeAmount(
  amount,
  paymentDate,
  anticipateTo,
  anticipationFee,
  anticipationType,
  installment,
  cost
) {
  const duration = paymentDate.diff(anticipateTo, 'days')
  const bigFee = new Big(anticipationFee)
  const bigAmount = new Big(amount)
  const roundingMode = {
    up: 3,
    down: 0
  }

  let anticipationFeeAmount = bigAmount
    .times(
      bigFee
        .times(anticipationType === 'per_month' ? duration : installment)
        .div(anticipationType === 'per_month' ? 30 * 100 : 100)
    )
    .round(0, roundingMode.up)

  const result = {
    netAmount: Number(bigAmount.minus(anticipationFeeAmount)),
    anticipationFeeAmount: Number(anticipationFeeAmount),
    payableAmount: amount,
    date: paymentDate.format('YYYY-MM-DD')
  }

  if (anticipationType === 'per_month') {
    result.duration = duration
  }

  if (cost) {
    let bigCost = new Big(cost)

    result.anticipationCostAmount = Number(
      bigAmount
        .times(bigCost.times(duration).div(30 * 100))
        .round(0, roundingMode.up)
    )
  }

  return result
}

export function getPayablesByAnticipation(anticipationRequest) {
  const validPayablesQuery = Object.assign({}, baseValidPayablesQuery)
  const minPayableNetAmount = Number(
    config.anticipation.spot.minPayableNetAmount
  )
  const sort = {}

  if (anticipationRequest.anticipation_type === 'per_month') {
    sort.net_amount = 1
  } else {
    sort.payment_date =
      anticipationRequest.payables_priority === 'start' ? 1 : -1
    sort.net_amount = 1
  }

  const payablesQuery = Object.assign(
    {
      // TEMPORARY: 2021-06-08 Problems in CIP integration for same-day anticipations
      created_at: {
        $lt: moment()
          .tz(config.timezone)
          .startOf('day')
          .toDate()
      },
      payment_date: {
        $gte: anticipationRequest.detailed_summary[0].date,
        $lte:
          anticipationRequest.detailed_summary[
            anticipationRequest.detailed_summary.length - 1
          ].date
      },
      company_id: anticipationRequest.anticipating_company.toString()
    },
    validPayablesQuery
  )

  if (anticipationRequest.payables_priority === 'end') {
    const gte = payablesQuery.payment_date['$lte']
    payablesQuery.payment_date['$lte'] = payablesQuery.payment_date['$gte']
    payablesQuery.payment_date['$gte'] = gte
  }

  return Payable.aggregate([
    {
      $match: payablesQuery
    },
    {
      $project: {
        _id: 1,
        installment: 1,
        total_installments: 1,
        payment_date: 1,
        amount: 1,
        anticipation_amount: 1,
        cost: 1,
        anticipation_cost: 1,
        fee: 1,
        anticipation_fee: 1,
        provider: 1,
        transaction_amount: 1,
        transaction_id: 1,
        company_id: 1,
        anticipatable: 1,
        anticipated: 1,
        affected_by_cip: 1,
        card_brand: 1,
        payment_method: 1,
        created_at: 1,
        cip_escrowed_amount: {
          $ifNull: ['$cip_escrowed_amount', 0]
        }
      }
    },
    {
      $addFields: {
        net_amount: {
          $subtract: [
            '$amount',
            {
              $add: ['$cost', '$fee', '$cip_escrowed_amount']
            }
          ]
        }
      }
    },
    {
      $match: {
        net_amount: {
          $gt: minPayableNetAmount
        }
      }
    },
    { $sort: sort }
  ]).allowDiskUse(true)
}

async function sendFailedWebhook(anticipation) {
  try {
    const statusHistory = anticipation.status_history
    const oldStatus =
      statusHistory.length <= 1 ? statusHistory.slice(-2, -1) : null

    await sendAnticipationWebhook(anticipation, {
      eventName: 'anticipation_failed',
      oldStatus
    })
  } catch (err) {
    const Logger = createLogger({ name: 'SPOT_ANTICIPATION_REQUEST' })
    Logger.error(
      { err, anticipation_id: anticipation._id.toString() },
      'error-sending-anticipation-failed-webhook'
    )
  }

  return anticipation
}

export function sendAnticipationWebhook(
  anticipation,
  { eventName, oldStatus, payables }
) {
  try {
    const responder =
      eventName === 'anticipation_anticipated'
        ? anticipationPayablesResponder(anticipation, payables)
        : anticipationResponder(anticipation, false)
    return sendWebHook(
      anticipation.parent_company.toString(),
      eventName,
      'anticipation',
      anticipation._id.toString(),
      oldStatus,
      anticipation.status,
      responder
    )
  } catch (err) {
    const Logger = createLogger({ name: 'PROCESS_SPOT_ANTICIPATION' })
    Logger.error(
      { err, anticipation_id: anticipation._id.toString(), eventName },
      'error-sending-anticipation-webhook'
    )
  }
}

async function sendToAccountingQueue(anticipationId) {
  const Logger = createLogger({ name: 'PROCESS_SPOT_ANTICIPATION' })
  const body = { anticipationId }

  Logger.info({ body }, 'sending-to-accounting-events-queue')
  try {
    await publishMessage(
      'AccountingEventsNewAnticipation',
      Buffer.from(JSON.stringify(body))
    )

    Logger.info({ body }, 'sent-to-accounting-events-queue')
  } catch (err) {
    Logger.warn({ err, body }, 'failed-to-enqueue-for-accounting-events')
  }
}
