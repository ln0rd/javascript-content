import moment from 'moment'
import { expect } from 'chai'
import { generateUuidV4 } from 'application/core/helpers/uuid'
import { buildReceivableUnitsFromAggregation } from 'modules/anticipation/build-receivable-units'

describe('Anticipation => buildReceivableUnitsFromAggregation', () => {
  context('with a list with two different URs for same merchant', () => {
    const documentNumber = '136285727'
    const walletId = generateUuidV4()

    const payableData = [
      {
        payment_date: '2021-10-01',
        card_brand: 'mastercard',
        payment_method: 'credit_card',
        amount: 10000,
        fee: 300,
        cost: 0,
        net_amount: 9700,
        installment: 1,
        total_installments: 1,
        anticipation_fee: 0,
        provider: 'hash',
        transaction_id: 12345678,
        company_id: 'companyA',
        anticipatable: true,
        anticipated: false
      },
      {
        payment_date: '2021-11-01',
        card_brand: 'mastercard',
        payment_method: 'credit_card',
        amount: 33300,
        fee: 100,
        cost: 0,
        net_amount: 33200,
        installment: 2,
        total_installments: 2,
        anticipation_fee: 0,
        provider: 'hash',
        transaction_id: 1111111,
        company_id: 'companyA',
        anticipatable: true,
        anticipated: false
      }
    ]

    const result = buildReceivableUnitsFromAggregation(payableData, {
      documentNumber,
      walletId
    })

    it('should have two receivable units with correct card brand, method and value', () => {
      const hasUnit1 = result.some(
        unit =>
          unit.cardBrand === 'mastercard' &&
          unit.paymentMethod === 'credit_card' &&
          unit.netAmountCents === 9700
      )

      const hasUnit2 = result.some(
        unit =>
          unit.cardBrand === 'mastercard' &&
          unit.paymentMethod === 'credit_card' &&
          unit.netAmountCents === 33200
      )

      expect(hasUnit1).to.eq(true)
      expect(hasUnit2).to.eq(true)
    })
  })

  context(
    'with a list withURs for same date, same merchant, same method but different brands',
    () => {
      const documentNumber = '136285727'
      const walletId = generateUuidV4()

      const payableData = [
        {
          payment_date: '2021-10-01',
          card_brand: 'mastercard',
          payment_method: 'credit_card',
          amount: 10000,
          fee: 300,
          cost: 0,
          net_amount: 9700,
          installment: 1,
          total_installments: 1,
          anticipation_fee: 0,
          provider: 'hash',
          transaction_id: 12345678,
          company_id: 'companyA',
          anticipatable: true,
          anticipated: false
        },
        {
          payment_date: '2021-10-01',
          card_brand: 'visa',
          payment_method: 'credit_card',
          amount: 10000,
          fee: 300,
          cost: 0,
          net_amount: 9700,
          installment: 1,
          total_installments: 1,
          anticipation_fee: 0,
          provider: 'hash',
          transaction_id: 123123123,
          company_id: 'companyA',
          anticipatable: true,
          anticipated: false
        }
      ]

      const result = buildReceivableUnitsFromAggregation(payableData, {
        documentNumber,
        walletId
      })

      it('should have one `mastercard` and one `visa` receivable unit each', () => {
        const hasUnit1 = result.some(
          unit =>
            unit.cardBrand === 'mastercard' &&
            unit.paymentMethod === 'credit_card' &&
            unit.netAmountCents === 9700
        )

        const hasUnit2 = result.some(
          unit =>
            unit.cardBrand === 'visa' &&
            unit.paymentMethod === 'credit_card' &&
            unit.netAmountCents === 9700
        )

        expect(hasUnit1).to.eq(true)
        expect(hasUnit2).to.eq(true)
      })
    }
  )

  context('with a list with multiple payables in the same UR', () => {
    const documentNumber = '136285727'
    const walletId = generateUuidV4()

    const payableData = [
      // MC payables
      {
        _id: 1,
        payment_date: '2021-10-01',
        card_brand: 'mastercard',
        payment_method: 'credit_card',
        amount: 100,
        fee: 1,
        cost: 0,
        net_amount: 99,
        installment: 1,
        total_installments: 2,
        anticipation_fee: 0,
        provider: 'hash',
        transaction_id: 12345678,
        company_id: 'companyA',
        anticipatable: true,
        anticipated: false
      },
      {
        _id: 2,
        payment_date: '2021-10-01',
        card_brand: 'mastercard',
        payment_method: 'credit_card',
        amount: 100,
        fee: 1,
        cost: 0,
        net_amount: 99,
        installment: 2,
        total_installments: 2,
        anticipation_fee: 0,
        provider: 'hash',
        transaction_id: 12345678,
        company_id: 'companyA',
        anticipatable: true,
        anticipated: false
      },
      // Visa Payables
      {
        _id: 3,
        payment_date: '2021-10-01',
        card_brand: 'visa',
        payment_method: 'credit_card',
        amount: 205,
        fee: 5,
        cost: 0,
        net_amount: 200,
        installment: 1,
        total_installments: 3,
        anticipation_fee: 0,
        provider: 'hash',
        transaction_id: 123123123,
        company_id: 'companyA',
        anticipatable: true,
        anticipated: false
      },
      {
        _id: 4,
        payment_date: '2021-10-01',
        card_brand: 'visa',
        payment_method: 'credit_card',
        amount: 205,
        fee: 5,
        cost: 0,
        net_amount: 200,
        installment: 2,
        total_installments: 3,
        anticipation_fee: 0,
        provider: 'hash',
        transaction_id: 123123123,
        company_id: 'companyA',
        anticipatable: true,
        anticipated: false
      },
      {
        _id: 5,
        payment_date: '2021-10-01',
        card_brand: 'visa',
        payment_method: 'credit_card',
        amount: 205,
        fee: 5,
        cost: 0,
        net_amount: 200,
        installment: 2,
        total_installments: 3,
        anticipation_fee: 0,
        provider: 'hash',
        transaction_id: 123123123,
        company_id: 'companyA',
        anticipatable: true,
        anticipated: false
      }
    ]

    const result = buildReceivableUnitsFromAggregation(payableData, {
      documentNumber,
      walletId
    })

    it('should have only one ReceivableUnit for each case', () => {
      const mastercardURs = result.filter(
        unit => unit.cardBrand === 'mastercard'
      )

      const visaURs = result.filter(unit => unit.cardBrand === 'visa')

      expect(visaURs).to.have.lengthOf(1)
      expect(mastercardURs).to.have.lengthOf(1)
    })

    it('should have summed the net amounts of multiple payables in the URs', () => {
      const masterCardPayables = payableData.filter(
        p => p.card_brand === 'mastercard'
      )
      const mastercardUnit = result.find(u => u.cardBrand === 'mastercard')
      const netAmountMaster = masterCardPayables.reduce(
        (total, payable) => total + payable.net_amount,
        0
      )

      const visaPayables = payableData.filter(p => p.card_brand === 'visa')
      const visaUnit = result.find(u => u.cardBrand === 'visa')
      const netAmountVisa = visaPayables.reduce(
        (total, payable) => total + payable.net_amount,
        0
      )

      expect(mastercardUnit.netAmountCents).to.be.eql(netAmountMaster)
      expect(visaUnit.netAmountCents).to.be.eql(netAmountVisa)
    })
  })

  context('with a list with multiple URs with multiple payables each', () => {
    const documentNumber = '136285727'
    const walletId = generateUuidV4()

    const payableData = [
      // 1st MC UR
      {
        _id: 1,
        payment_date: '2021-10-01',
        card_brand: 'mastercard',
        payment_method: 'credit_card',
        amount: 100,
        fee: 1,
        cost: 0,
        net_amount: 99,
        installment: 1,
        total_installments: 2,
        anticipation_fee: 0,
        provider: 'hash',
        transaction_id: 12345678,
        company_id: 'companyA',
        anticipatable: true,
        anticipated: false
      },
      {
        _id: 2,
        payment_date: '2021-10-01',
        card_brand: 'mastercard',
        payment_method: 'credit_card',
        amount: 100,
        fee: 1,
        cost: 0,
        net_amount: 99,
        installment: 2,
        total_installments: 2,
        anticipation_fee: 0,
        provider: 'hash',
        transaction_id: 12345678,
        company_id: 'companyA',
        anticipatable: true,
        anticipated: false
      },
      // 2nd MC UR
      {
        _id: 3,
        payment_date: '2021-10-24',
        card_brand: 'mastercard',
        payment_method: 'credit_card',
        amount: 100,
        fee: 2,
        cost: 0,
        net_amount: 98,
        installment: 1,
        total_installments: 2,
        anticipation_fee: 0,
        provider: 'hash',
        transaction_id: 12345678,
        company_id: 'companyA',
        anticipatable: true,
        anticipated: false
      },
      {
        _id: 4,
        payment_date: '2021-10-24',
        card_brand: 'mastercard',
        payment_method: 'credit_card',
        amount: 100,
        fee: 2,
        cost: 0,
        net_amount: 98,
        installment: 2,
        total_installments: 2,
        anticipation_fee: 0,
        provider: 'hash',
        transaction_id: 12345678,
        company_id: 'companyA',
        anticipatable: true,
        anticipated: false
      },
      // 1st visa UR
      {
        _id: 5,
        payment_date: '2021-10-01',
        card_brand: 'visa',
        payment_method: 'credit_card',
        amount: 205,
        fee: 5,
        cost: 0,
        net_amount: 200,
        installment: 1,
        total_installments: 3,
        anticipation_fee: 0,
        provider: 'hash',
        transaction_id: 123123123,
        company_id: 'companyA',
        anticipatable: true,
        anticipated: false
      },
      {
        _id: 6,
        payment_date: '2021-10-01',
        card_brand: 'visa',
        payment_method: 'credit_card',
        amount: 205,
        fee: 5,
        cost: 0,
        net_amount: 200,
        installment: 2,
        total_installments: 3,
        anticipation_fee: 0,
        provider: 'hash',
        transaction_id: 123123123,
        company_id: 'companyA',
        anticipatable: true,
        anticipated: false
      },
      // 2nd visa UR
      {
        _id: 7,
        payment_date: '2021-10-12',
        card_brand: 'visa',
        payment_method: 'credit_card',
        amount: 205,
        fee: 5,
        cost: 0,
        net_amount: 200,
        installment: 2,
        total_installments: 3,
        anticipation_fee: 0,
        provider: 'hash',
        transaction_id: 123123123,
        company_id: 'companyA',
        anticipatable: true,
        anticipated: false
      },
      {
        _id: 8,
        payment_date: '2021-10-12',
        card_brand: 'visa',
        payment_method: 'credit_card',
        amount: 205,
        fee: 5,
        cost: 0,
        net_amount: 200,
        installment: 2,
        total_installments: 3,
        anticipation_fee: 0,
        provider: 'hash',
        transaction_id: 123123123,
        company_id: 'companyA',
        anticipatable: true,
        anticipated: false
      }
    ]

    const result = buildReceivableUnitsFromAggregation(payableData, {
      documentNumber,
      walletId
    })

    it('should have only one ReceivableUnit for each case', () => {
      const mastercardUR1 = result.filter(
        unit =>
          unit.cardBrand === 'mastercard' &&
          unit.originalPaymentDate === '2021-10-01'
      )

      const mastercardUR2 = result.filter(
        unit =>
          unit.cardBrand === 'mastercard' &&
          unit.originalPaymentDate === '2021-10-24'
      )

      const visaUR1 = result.filter(
        unit =>
          unit.cardBrand === 'visa' && unit.originalPaymentDate === '2021-10-01'
      )
      const visaUR2 = result.filter(
        unit =>
          unit.cardBrand === 'visa' && unit.originalPaymentDate === '2021-10-12'
      )

      expect(mastercardUR1).to.have.lengthOf(1)
      expect(mastercardUR2).to.have.lengthOf(1)
      expect(visaUR1).to.have.lengthOf(1)
      expect(visaUR2).to.have.lengthOf(1)
    })
    ;[
      ['mastercard', '2021-10-01'],
      ['mastercard', '2021-10-24'],
      ['visa', '2021-10-01'],
      ['visa', '2021-10-12']
    ].forEach(([brand, date]) => {
      it(`should have a ${brand} UR to be paid at ${date} with the amount of multiple payables accumulated`, () => {
        const receivableUnit = result.find(
          unit => unit.cardBrand === brand && unit.originalPaymentDate === date
        )

        const payables = payableData.filter(
          p => p.card_brand === brand && p.payment_date === date
        )

        const netAmountFromPayables = payables.reduce(
          (total, payable) => total + payable.net_amount,
          0
        )

        expect(receivableUnit.netAmountCents).to.be.eql(netAmountFromPayables)
      })
    })
  })

  context(
    'when some of the payables in the UR were generated in the same day as request',
    () => {
      const documentNumber = '136285727'
      const walletId = generateUuidV4()

      const payableData = [
        {
          payment_date: '2021-10-01',
          card_brand: 'mastercard',
          payment_method: 'credit_card',
          amount: 10000,
          fee: 300,
          cost: 0,
          net_amount: 9700,
          installment: 1,
          total_installments: 1,
          anticipation_fee: 0,
          provider: 'hash',
          transaction_id: 12345678,
          company_id: 'companyA',
          anticipatable: true,
          anticipated: false,
          created_at: moment()
            .subtract(1, 'day')
            .toDate()
        },
        {
          payment_date: '2021-10-01',
          card_brand: 'mastercard',
          payment_method: 'credit_card',
          amount: 600,
          fee: 300,
          cost: 0,
          net_amount: 300,
          installment: 1,
          total_installments: 1,
          anticipation_fee: 0,
          provider: 'hash',
          transaction_id: 12345678,
          company_id: 'companyA',
          anticipatable: true,
          anticipated: false,
          created_at: moment().toDate()
        },
        {
          payment_date: '2021-11-01',
          card_brand: 'mastercard',
          payment_method: 'credit_card',
          amount: 33300,
          fee: 100,
          cost: 0,
          net_amount: 33200,
          installment: 2,
          total_installments: 2,
          anticipation_fee: 0,
          provider: 'hash',
          transaction_id: 1111111,
          company_id: 'companyA',
          anticipatable: true,
          anticipated: false,
          created_at: moment()
            .subtract(1, 'day')
            .toDate()
        }
      ]

      const result = buildReceivableUnitsFromAggregation(payableData, {
        documentNumber,
        walletId
      })

      it('should have two receivable units with correct card brand, method and value', () => {
        const hasUnit1 = result.some(
          unit =>
            unit.cardBrand === 'mastercard' &&
            unit.paymentMethod === 'credit_card' &&
            unit.netAmountCents === 10000
        )

        const hasUnit2 = result.some(
          unit =>
            unit.cardBrand === 'mastercard' &&
            unit.paymentMethod === 'credit_card' &&
            unit.netAmountCents === 33200
        )

        expect(hasUnit1).to.eq(true)
        expect(hasUnit2).to.eq(true)
      })

      it('one of the units must have notRegisteredCents since one of the payables is anticipated in the same day it was created', () => {
        const UR = result[0]

        expect(UR.netAmountCents).to.eq(10000)
        expect(UR.notRegisteredCents).to.eq(300)
      })
    }
  )

  context(
    'when none of the payables in the UR were generated in the same day as request',
    () => {
      const documentNumber = '136285727'
      const walletId = generateUuidV4()

      const payableData = [
        {
          payment_date: '2021-10-01',
          card_brand: 'mastercard',
          payment_method: 'credit_card',
          amount: 10000,
          fee: 300,
          cost: 0,
          net_amount: 9700,
          installment: 1,
          total_installments: 1,
          anticipation_fee: 0,
          provider: 'hash',
          transaction_id: 12345678,
          company_id: 'companyA',
          anticipatable: true,
          anticipated: false,
          created_at: moment()
            .subtract(10, 'day')
            .toDate()
        },
        {
          payment_date: '2021-10-01',
          card_brand: 'mastercard',
          payment_method: 'credit_card',
          amount: 600,
          fee: 300,
          cost: 0,
          net_amount: 300,
          installment: 1,
          total_installments: 1,
          anticipation_fee: 0,
          provider: 'hash',
          transaction_id: 12345678,
          company_id: 'companyA',
          anticipatable: true,
          anticipated: false,
          created_at: moment()
            .subtract(1, 'day')
            .toDate()
        },
        {
          payment_date: '2021-11-01',
          card_brand: 'mastercard',
          payment_method: 'credit_card',
          amount: 33300,
          fee: 100,
          cost: 0,
          net_amount: 33200,
          installment: 2,
          total_installments: 2,
          anticipation_fee: 0,
          provider: 'hash',
          transaction_id: 1111111,
          company_id: 'companyA',
          anticipatable: true,
          anticipated: false,
          created_at: moment()
            .subtract(1, 'day')
            .toDate()
        }
      ]

      const result = buildReceivableUnitsFromAggregation(payableData, {
        documentNumber,
        walletId
      })

      it('should have two receivable units with correct card brand, method and value', () => {
        const hasUnit1 = result.some(
          unit =>
            unit.cardBrand === 'mastercard' &&
            unit.paymentMethod === 'credit_card' &&
            unit.netAmountCents === 10000
        )

        const hasUnit2 = result.some(
          unit =>
            unit.cardBrand === 'mastercard' &&
            unit.paymentMethod === 'credit_card' &&
            unit.netAmountCents === 33200
        )

        expect(hasUnit1).to.eq(true)
        expect(hasUnit2).to.eq(true)
      })

      it('units must have notRegisteredCents equal to zero', () => {
        const UR = result[0]

        expect(UR.netAmountCents).to.eq(10000)
        expect(UR.notRegisteredCents).to.eq(0)
      })
    }
  )
})
