import { generatePayable, generateTransaction } from 'test/fixtures/index'
import sinon from 'sinon'
import 'sinon-mongoose'
import TransactionRepository from 'modules/financial-calendar/infrastructure/repositories/transaction'
import PayableRepository from 'modules/financial-calendar/infrastructure/repositories/payables'

import DisputeHandlingService from 'modules/financial-calendar/application/services/dispute-handling'
import ChargebackHandlingService from 'modules/financial-calendar/application/services/chargeback-handling'

import AccountingEvent from 'application/core/models/accounting-event'

import * as GenerateChargebackEventModule from 'modules/accounting-events/domain/generate-chargeback-event'

describe('Unit => Financial Calendar - Service - Dispute Handling', () => {
  context('#handle', () => {
    context("on a dispute for a 'paid ' transaction", () => {
      const transaction = generateTransaction('hash', 'visa', 'paid', 110000)

      const dataTable = [
        {
          company_id: 'ISO',
          amount: 1059,
          mdr_cost: 1210,
          cost: 1210,
          mdr_fee: 0,
          anticipation_fee: 0,
          fee: 0,
          installment: 1
        },
        {
          company_id: 'ISO',
          amount: 1059,
          mdr_cost: 1210,
          cost: 1210,
          mdr_fee: 0,
          anticipation_fee: 0,
          fee: 0,
          installment: 2
        },
        {
          company_id: '5ec28701a1067000069db60e',
          amount: 55000,
          mdr_cost: 0,
          cost: 0,
          mdr_fee: 2153,
          anticipation_fee: 0,
          fee: 2153,
          installment: 1
        },
        {
          company_id: '5ec28701a1067000069db60e',
          amount: 55000,
          mdr_cost: 0,
          cost: 0,
          mdr_fee: 1059,
          anticipation_fee: 0,
          fee: 1059,
          installment: 2
        },
        {
          company_id: '5cf146469477524978a1e7cc',
          amount: 16500,
          mdr_cost: 1050,
          cost: 1050,
          mdr_fee: 0,
          anticipation_fee: 0,
          fee: 0,
          installment: 1
        },
        {
          company_id: '5cf146469477524978a1e7cc',
          amount: 16500,
          mdr_cost: 1050,
          cost: 1050,
          mdr_fee: 0,
          anticipation_fee: 0,
          fee: 0,
          installment: 2
        }
      ]

      const payables = dataTable.map(data => generatePayable(data))

      let chargebackHandlingServiceMock
      beforeEach(() => {
        sinon
          .stub(PayableRepository.prototype, 'findByTransactionId')
          .resolves(payables)
        sinon
          .stub(TransactionRepository.prototype, 'findOne')
          .resolves(transaction)

        sinon.mock(AccountingEvent)

        sinon
          .stub(GenerateChargebackEventModule, 'generateChargebackEvent')
          .resolves()

        chargebackHandlingServiceMock = sinon.mock(
          ChargebackHandlingService.prototype
        )
      })

      afterEach(() => {
        sinon.restore()
      })

      it('should call ChargebackHandlingService to handle the new chargeback', async () => {
        chargebackHandlingServiceMock.expects('handleNewChargeback').once()

        await new DisputeHandlingService().handle({
          transaction_id: transaction._id
        })

        chargebackHandlingServiceMock.verify()
      })

      it('should pass the payables original verbatim to the ChargebackHandlingService', async () => {
        chargebackHandlingServiceMock
          .expects('handleNewChargeback')
          .once()
          .withArgs({
            payables,
            transaction
          })

        await new DisputeHandlingService().handle({
          transaction_id: transaction._id
        })

        chargebackHandlingServiceMock.verify()
      })
    })
    context("on a dispute for 'refunded' transaction", () => {
      const transaction = generateTransaction(
        'hash',
        'visa',
        'refunded',
        110000
      )

      const dataTable = [
        {
          type: 'credit',
          company_id: 'ISO',
          amount: 1059,
          mdr_cost: 1210,
          cost: 1210,
          mdr_fee: 0,
          anticipation_fee: 0,
          fee: 0,
          installment: 1
        },
        {
          type: 'refund',
          company_id: 'ISO',
          amount: -1059,
          mdr_cost: -1210,
          cost: -1210,
          mdr_fee: 0,
          anticipation_fee: 0,
          fee: 0,
          installment: 1
        },
        {
          type: 'credit',
          company_id: '5ec28701a1067000069db60e',
          amount: 55000,
          mdr_cost: 0,
          cost: 0,
          mdr_fee: 2153,
          anticipation_fee: 0,
          fee: 2153,
          installment: 1
        },
        {
          type: 'refund',
          company_id: '5ec28701a1067000069db60e',
          amount: -55000,
          mdr_cost: 0,
          cost: 0,
          mdr_fee: -1059,
          anticipation_fee: 0,
          fee: -1059,
          installment: 1
        },
        {
          type: 'credit',
          company_id: '5cf146469477524978a1e7cc',
          amount: 16500,
          mdr_cost: 1050,
          cost: 1050,
          mdr_fee: 0,
          anticipation_fee: 0,
          fee: 0,
          installment: 1
        },
        {
          type: 'refund',
          company_id: '5cf146469477524978a1e7cc',
          amount: -16500,
          mdr_cost: -1050,
          cost: -1050,
          mdr_fee: 0,
          anticipation_fee: 0,
          fee: 0,
          installment: 1
        }
      ]

      const payables = dataTable.map(data => generatePayable(data))

      let chargebackHandlingServiceMock
      beforeEach(() => {
        sinon
          .stub(PayableRepository.prototype, 'findByTransactionId')
          .resolves(payables)
        sinon
          .stub(TransactionRepository.prototype, 'findOne')
          .resolves(transaction)
        chargebackHandlingServiceMock = sinon.mock(
          ChargebackHandlingService.prototype
        )
      })

      afterEach(() => {
        sinon.restore()
      })

      it('should not call ChargebackHandlingService', async () => {
        chargebackHandlingServiceMock.expects('handleNewChargeback').never()

        await new DisputeHandlingService().handle({
          transaction_id: transaction._id
        })

        chargebackHandlingServiceMock.verify()
      })
    })
    context("on a dispute for 'chargedback' transaction", () => {
      const transaction = generateTransaction(
        'hash',
        'visa',
        'chargedback',
        110000
      )

      const dataTable = [
        {
          type: 'credit',
          company_id: 'ISO',
          amount: 1059,
          mdr_cost: 1210,
          cost: 1210,
          mdr_fee: 0,
          anticipation_fee: 0,
          fee: 0,
          installment: 1
        },
        {
          type: 'chargeback_debit',
          company_id: 'ISO',
          amount: -1059,
          mdr_cost: -1210,
          cost: -1210,
          mdr_fee: 0,
          anticipation_fee: 0,
          fee: 0,
          installment: 1
        },
        {
          type: 'credit',
          company_id: '5ec28701a1067000069db60e',
          amount: 55000,
          mdr_cost: 0,
          cost: 0,
          mdr_fee: 2153,
          anticipation_fee: 0,
          fee: 2153,
          installment: 1
        },
        {
          type: 'chargeback_debit',
          company_id: '5ec28701a1067000069db60e',
          amount: -55000,
          mdr_cost: 0,
          cost: 0,
          mdr_fee: -1059,
          anticipation_fee: 0,
          fee: -1059,
          installment: 1
        },
        {
          type: 'credit',
          company_id: '5cf146469477524978a1e7cc',
          amount: 16500,
          mdr_cost: 1050,
          cost: 1050,
          mdr_fee: 0,
          anticipation_fee: 0,
          fee: 0,
          installment: 1
        },
        {
          type: 'chargeback_debit',
          company_id: '5cf146469477524978a1e7cc',
          amount: -16500,
          mdr_cost: -1050,
          cost: -1050,
          mdr_fee: 0,
          anticipation_fee: 0,
          fee: 0,
          installment: 1
        }
      ]

      const payables = dataTable.map(data => generatePayable(data))

      let chargebackHandlingServiceMock
      beforeEach(() => {
        sinon
          .stub(PayableRepository.prototype, 'findByTransactionId')
          .resolves(payables)
        sinon
          .stub(TransactionRepository.prototype, 'findOne')
          .resolves(transaction)
        chargebackHandlingServiceMock = sinon.mock(
          ChargebackHandlingService.prototype
        )
      })

      afterEach(() => {
        sinon.restore()
      })

      it('should not call ChargebackHandlingService', async () => {
        chargebackHandlingServiceMock.expects('handleNewChargeback').never()

        await new DisputeHandlingService().handle({
          transaction_id: transaction._id
        })

        chargebackHandlingServiceMock.verify()
      })
    })
  })
})
