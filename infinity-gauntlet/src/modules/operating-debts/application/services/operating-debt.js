/* eslint-disable no-await-in-loop */
import mongoose from 'mongoose'
import {
  SETTLEMENT_DEBT,
  DEBT_TRANSFER
} from 'application/core/models/operating-debt'
import SettlementRepository from 'modules/operating-debts/infrastructure/repositories/settlement'
import OperatingDebtRepository from 'modules/operating-debts/infrastructure/repositories/operating-debt'
import { calculateByPaymentArrangement } from 'modules/operating-debts/domain/payment-operating-debt'
const { Types } = mongoose
const { ObjectId } = Types
import moment from 'moment-timezone'

export default class OperatingDebtService {
  constructor(log) {
    this.log = log
    this.settlementRepository = new SettlementRepository()
    this.operatingDebtRepository = new OperatingDebtRepository()
  }

  /**
   * Find negative settlement then create operating debt for it
   * @param {String} date
   * @returns {Promise<void>}
   */
  async processNegativeSettlements(date) {
    let negativeSettlements
    try {
      negativeSettlements = await this.settlementRepository.getProcessingNegativeSettlements(
        date
      )
    } catch (err) {
      this.log.error({ err, date }, 'failed-to-get-settlements')
      return
    }

    for (const settlement of negativeSettlements) {
      try {
        await this.createSettlementOperatingDebt(settlement)
      } catch (err) {
        this.log.error({ err, date }, 'failed-processing-negative-settlement')
      }
    }
  }

  /**
   * Create Operating debt for a settlement and then register debt in settlement
   * @param settlement
   * @returns {Promise<void>}
   */
  async createSettlementOperatingDebt(settlement) {
    const {
      _id: settlementId,
      company_id: companyId,
      amount: settlementAmount
    } = settlement
    try {
      const debt = await this.operatingDebtRepository.registerNewDebt({
        debtType: SETTLEMENT_DEBT,
        amount: Math.abs(settlementAmount),
        companyId,
        model: 'settlement',
        modelId: settlementId
      })

      this.log.info(
        {
          debtId: debt._id,
          debt_amount: debt.amount,
          settlementId,
          companyId,
          settlementAmount
        },
        'new-debt-created'
      )

      await this.settlementRepository.registerOperatingDebt(
        settlementId,
        debt._id,
        debt.debt_amount,
        settlementAmount
      )

      this.log.info(
        { debtId: debt._id, settlementId, companyId },
        'settlement-updated-with-new-debt'
      )
    } catch (err) {
      this.log.error(
        { err, settlementId, companyId },
        'error-processing-new-debt'
      )

      throw err
    }
  }

  /**
   * Pay debts if exists for a settlement
   * @param settlement
   * @returns {Promise<void>}
   */
  async payOperatingDebtWithSettlement(settlement) {
    const companyId = settlement.company_id
    const settlementId = settlement._id

    try {
      const operatingDebts = await this.operatingDebtRepository.getOutstandingDebtsByCompanyId(
        companyId
      )
      if (operatingDebts.length <= 0) {
        return
      }
      await Promise.all(
        operatingDebts.map(debt => this.payDebt(debt, settlement))
      )
    } catch (err) {
      this.log.error(
        { err, companyId, settlementId },
        'error-paying-operating-debt-with-settlement'
      )
    }
  }

  /**
   * Calculate operating debts amount with settlements payment arrangement and then
   * update operating debts collection and settlement fields
   * @param debt
   * @param settlement
   * @returns {Promise<void>}
   */
  async payDebt(debt, settlement) {
    const brands = settlement.brands
    const netDebtAmount = debt.debt_amount - debt.paid_amount

    const result = calculateByPaymentArrangement(brands, netDebtAmount)

    const usedAmount = netDebtAmount - result.restAmount
    const paidAmount = debt.paid_amount + usedAmount
    const newSettledAmount = settlement.settled_amount + usedAmount

    if (paidAmount > debt.debt_amount) {
      this.log.warn({ debt, settlement, result }, 'paid-greater-than-debt')
    }
    if (newSettledAmount > settlement.amount) {
      this.log.warn({ debt, settlement, result }, 'settled-greater-than-amount')
    }

    try {
      await this.operatingDebtRepository.updateSettlementPaymentHistory(
        settlement._id,
        debt._id,
        paidAmount,
        usedAmount,
        paidAmount >= debt.debt_amount,
        result.paymentsByBrand
      )
      await this.settlementRepository.updateOperatingDebtsPaymentHistory(
        settlement._id,
        debt._id,
        usedAmount,
        newSettledAmount,
        result.newBrands,
        newSettledAmount >= settlement.amount,
        result.paymentsByBrand
      )
    } catch (err) {
      this.log.error(
        {
          debt,
          settlement,
          result
        },
        'error-paying-debts-with-settlements'
      )
    }
  }

  /**
   *
   * @param {String} operatingDebtId
   * @param {String} companyId
   * @returns {Promise<void>}
   */
  async makeDebtTransfer(operatingDebtId, companyId) {
    this.log.info({ operatingDebtId, companyId }, 'creating-debt-transfer')
    const debtObjId = ObjectId(operatingDebtId)

    const operatingDebt = await this.operatingDebtRepository.findOne({
      _id: debtObjId
    })

    if (!operatingDebt) {
      this.log.error(
        { operatingDebtId, companyId },
        'operating-debit-not-found'
      )
      throw Error(`Operating Debt not found: ${operatingDebtId}`)
    }
    const debtAmount = operatingDebt.debt_amount
    const paidAmount = operatingDebt.paid_amount
    const outstandingAmount = debtAmount - paidAmount

    const newDebtPayload = {
      debtType: DEBT_TRANSFER,
      amount: Math.abs(outstandingAmount),
      companyId,
      model: 'operating_debts',
      modelId: operatingDebtId
    }

    const newOperatingDebt = await this.operatingDebtRepository.registerNewDebt(
      newDebtPayload
    )
    this.log.info(
      { newOperatingDebt },
      'operating-debt-transfer-register-sucessfully'
    )

    const result = await this.operatingDebtRepository.updateByIds([debtObjId], {
      $set: {
        paid_amount: debtAmount,
        status: 'paid',
        updated_at: moment().toDate()
      },
      $addToSet: {
        payment_history: {
          used_amount: outstandingAmount,
          model: 'operating_debts',
          model_id: newOperatingDebt._id.toString(),
          description: 'debt transfer',
          payment_date: moment().format('YYYY-MM-DD'),
          payments_by_brand: []
        }
      }
    })
    this.log.info({ result }, 'operating-debt-transfer-updated-sucessfully')
  }
}
