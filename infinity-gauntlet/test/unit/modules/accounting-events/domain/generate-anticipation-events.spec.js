import moment from 'moment'
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'

import AccountingEvent from 'application/core/models/accounting-event'
import generatePayable from 'test/fixtures/generatePayable'
import {
  generateEvents,
  getAnticipationAmounts
} from 'modules/accounting-events/domain/generate-anticipation-events'
import faker from 'faker'

chai.use(chaiAsPromised)
const { expect } = chai

const fixMoment = moment('2019-08-01')

describe('Accounting Events => #getAnticipationAmounts', () => {
  describe('when transaction is in 1 installment', () => {
    const isoId = faker.random.alphaNumeric(24)
    const merchantId = faker.random.alphaNumeric(24)

    const merchantPayable = generatePayable({
      amount: 100,
      company_id: merchantId,
      anticipation_fee: 10,
      fee: 15,
      mdr_fee: 5,
      anticipation_cost: 0,
      anticipation_amount: 0
    })
    const isoPayable = generatePayable({
      amount: 50,
      company_id: isoId,
      anticipation_fee: 0,
      anticipation_cost: 5,
      anticipation_amount: 5
    })
    it('should calculate merchant anticipation amounts', () => {
      const payables = [merchantPayable, merchantPayable]
      const {
        merchantGrossAmount,
        merchantAnticipationFee,
        isoNetAmount,
        isoGrossAmount,
        isoAnticipationCost
      } = getAnticipationAmounts(payables, isoId, merchantId)
      expect(merchantGrossAmount).to.be.eq(200)
      expect(merchantAnticipationFee).to.be.eq(20)
      expect(isoNetAmount).to.be.eq(0)
      expect(isoGrossAmount).to.be.eq(0)
      expect(isoAnticipationCost).to.be.eq(0)
    })

    it('should calculate iso anticipation amounts', () => {
      const payables = [isoPayable, isoPayable]
      const {
        merchantGrossAmount,
        merchantAnticipationFee,
        isoNetAmount,
        isoGrossAmount,
        isoAnticipationCost
      } = getAnticipationAmounts(payables, isoId, isoId)
      expect(merchantGrossAmount).to.be.eq(0)
      expect(merchantAnticipationFee).to.be.eq(0)
      expect(isoNetAmount).to.be.eq(0)
      expect(isoGrossAmount).to.be.eq(100)
      expect(isoAnticipationCost).to.be.eq(10)
    })
  })
  describe('when transaction is in 2 installments', () => {
    const isoId = faker.random.alphaNumeric(24)
    const merchantId = faker.random.alphaNumeric(24)

    const merchantPayable = generatePayable({
      amount: 100,
      company_id: merchantId,
      anticipation_fee: 10,
      fee: 15,
      mdr_fee: 5,
      anticipation_cost: 0,
      anticipation_amount: 0
    })
    const isoPayable = generatePayable({
      amount: 50,
      company_id: isoId,
      anticipation_fee: 0,
      anticipation_cost: 5,
      anticipation_amount: 5
    })

    it('should calculate merchant anticipation amounts', () => {
      const payables = [merchantPayable, merchantPayable]
      const {
        merchantGrossAmount,
        merchantAnticipationFee,
        isoNetAmount,
        isoGrossAmount,
        isoAnticipationCost
      } = getAnticipationAmounts(payables, isoId, merchantId)
      expect(merchantGrossAmount).to.be.eq(200)
      expect(merchantAnticipationFee).to.be.eq(20)
      expect(isoNetAmount).to.be.eq(0)
      expect(isoGrossAmount).to.be.eq(0)
      expect(isoAnticipationCost).to.be.eq(0)
    })

    it('should calculate iso anticipation amounts', () => {
      const payables = [isoPayable, isoPayable]
      const {
        merchantGrossAmount,
        merchantAnticipationFee,
        isoNetAmount,
        isoGrossAmount,
        isoAnticipationCost
      } = getAnticipationAmounts(payables, isoId, isoId)
      expect(merchantGrossAmount).to.be.eq(0)
      expect(merchantAnticipationFee).to.be.eq(0)
      expect(isoNetAmount).to.be.eq(0)
      expect(isoGrossAmount).to.be.eq(100)
      expect(isoAnticipationCost).to.be.eq(10)
    })
  })
})

describe('Accounting Events => #generateEvents', () => {
  const isoId = faker.random.alphaNumeric(24)
  const merchantId = faker.random.alphaNumeric(24)
  const anticipationId = faker.random.alphaNumeric(24)
  const anticipationCreatedDate = fixMoment.toDate()

  context('Filter when all amounts is positive', () => {
    const anticipationAmounts = {
      merchantGrossAmount: 100,
      merchantAnticipationFee: 10,
      isoNetAmount: 3,
      isoGrossAmount: 50,
      isoAnticipationCost: 5
    }

    const events = generateEvents(
      isoId,
      merchantId,
      anticipationId,
      anticipationCreatedDate,
      anticipationAmounts
    )
    ;[
      ['ANTECIPACAO_MERCHANT', 100],
      ['REMUNERACAO_ANTECIPACAO_MERCHANT', 10],
      ['REPASSE_ISO_ANTECIPACAO', 3],
      ['ANTECIPACAO_ISO', 50],
      ['REMUNERACAO_ANTECIPACAO_ISO', 5]
    ].forEach(([eventName, amountCents]) => {
      context(`Validate ${eventName} accounting event`, () => {
        const accountingEvent = events.find(
          event => event.event_name === eventName
        )
        it('should be a valid accounting event', () => {
          expect(accountingEvent).to.be.instanceOf(AccountingEvent)
        })
        it('should return an amount that is positive', () => {
          expect(accountingEvent.amount_cents).to.be.greaterThan(0)
        })
        it('should return anticipation amount appropriate', () => {
          expect(accountingEvent.amount_cents).to.be.eq(amountCents)
        })
        it('should return an event pointing at the correct company', () => {
          expect(accountingEvent.merchant_id).to.eq(merchantId)
        })
        it('should return an event pointing to the right ISO', () => {
          expect(accountingEvent.iso_id).to.eq(isoId)
        })
      })
    })
  })
  context('Filter when some amounts is negative', () => {
    const events = generateEvents(
      isoId,
      merchantId,
      anticipationId,
      anticipationCreatedDate,
      {
        merchantGrossAmount: 100,
        merchantAnticipationFee: -10,
        isoNetAmount: 3,
        isoGrossAmount: -50,
        isoAnticipationCost: -5
      }
    )
    it('should return only events with positive amount', () => {
      expect(events).to.have.lengthOf(2)
    })
    ;[['ANTECIPACAO_MERCHANT', 100], ['REPASSE_ISO_ANTECIPACAO', 3]].forEach(
      ([eventName, amountCents]) => {
        context(`Validate ${eventName} accounting event`, () => {
          const accountingEvent = events.find(
            event => event.event_name === eventName
          )
          it('should be a valid accounting event', () => {
            expect(accountingEvent).to.be.instanceOf(AccountingEvent)
          })
          it('should return an amount that is positive', () => {
            expect(accountingEvent.amount_cents).to.be.greaterThan(0)
          })
          it('should return anticipation amount appropriate', () => {
            expect(accountingEvent.amount_cents).to.be.eq(amountCents)
          })
          it('should return an event pointing at the correct company', () => {
            expect(accountingEvent.merchant_id).to.eq(merchantId)
          })
          it('should return an event pointing to the right ISO', () => {
            expect(accountingEvent.iso_id).to.eq(isoId)
          })
        })
      }
    )
  })
})
