import { expect } from 'chai'

import AnticipationFees from 'application/core/domain/anticipation-fees'

describe('Unit => Domain: Anticipation Fees', () => {
  context('perAdditionalInstallmentAnticipationFee', () => {
    context('on equally divided installment values', () => {
      const data = [
        // fee, amount, totalInstallments, installment, expectedFee
        [2.0, 1000, 10, 1, 180],
        [2.0, 1000, 10, 2, 180],
        [2.0, 1000, 10, 3, 180],
        [2.0, 1000, 10, 4, 180],
        [2.0, 1000, 10, 5, 180],
        [2.0, 1000, 10, 6, 180],
        [2.0, 1000, 10, 7, 180],
        [2.0, 1000, 10, 8, 180],
        [2.0, 1000, 10, 9, 180],
        [2.0, 1000, 10, 10, 180]
      ]

      it('should calculate fees for every installment, with the formula (fee /100) * (installments - 1)', () => {
        runTestsForDataTable(data)
      })
    })

    context('on the max number of installments', () => {
      const data = [
        // fee, amount, totalInstallments, installment, expectedFee
        [2.0, 1000, 24, 1, 460],
        [2.0, 1000, 24, 2, 460],
        [2.0, 1000, 24, 3, 460],
        [2.0, 1000, 24, 4, 460],
        [2.0, 1000, 24, 5, 460],
        [2.0, 1000, 24, 6, 460],
        [2.0, 1000, 24, 7, 460],
        [2.0, 1000, 24, 8, 460],
        [2.0, 1000, 24, 9, 460],
        [2.0, 1000, 24, 10, 460],
        [2.0, 1000, 24, 11, 460],
        [2.0, 1000, 24, 12, 460],
        [2.0, 1000, 24, 13, 460],
        [2.0, 1000, 24, 14, 460],
        [2.0, 1000, 24, 15, 460],
        [2.0, 1000, 24, 16, 460],
        [2.0, 1000, 24, 17, 460],
        [2.0, 1000, 24, 18, 460],
        [2.0, 1000, 24, 19, 460],
        [2.0, 1000, 24, 20, 460],
        [2.0, 1000, 24, 21, 460],
        [2.0, 1000, 24, 22, 460],
        [2.0, 1000, 24, 23, 460],
        [2.0, 1000, 24, 24, 460]
      ]

      it('should calculate fees for every installment, with the formula (fee /100) * (installments - 1)', () => {
        runTestsForDataTable(data)
      })
    })

    context('on a different first installment value', () => {
      const data = [
        // fee, amount, totalInstallments, installment, expectedFee
        [2.0, 692566, 3, 1, 27703],
        [2.0, 692568, 3, 2, 27703],
        [2.0, 692568, 3, 3, 27703]
      ]

      it('should calculate fees for every installment, with the formula (fee /100) * (installments - 1)', () => {
        runTestsForDataTable(data)
      })
    })

    context('on a 0% anticipation fee', () => {
      const data = [
        // fee, amount, totalInstallments, installment, expectedFee
        [0, 692566, 3, 1, 0],
        [0, 692568, 3, 2, 0],
        [0, 692568, 3, 3, 0]
      ]

      it('should return 0 cents anticipation fee for every installment', () => {
        runTestsForDataTable(data)
      })
    })

    context('on a high % anticipation fee', () => {
      const data = [
        // fee, amount, totalInstallments, installment, expectedFee
        [30, 10000, 3, 1, 6000],
        [30, 10000, 3, 2, 6000],
        [30, 10000, 3, 3, 6000]
      ]

      it('should calculate fees for every installment, with the formula (fee /100) * (installments - 1)', () => {
        runTestsForDataTable(data)
      })
    })

    context('on a single installment transaction', () => {
      const data = [
        // fee, amount, totalInstallments, installment, expectedFee
        [30, 10000, 1, 1, 0]
      ]

      it('should exempt the installment of fees', () => {
        return runTestsForDataTable(data)
      })
    })

    context('on transaction with R$ 1.000.000,00 installment values', () => {
      const data = [
        // fee, amount, totalInstallments, installment, expectedFee
        [2.0, 100000000, 10, 1, 18000000],
        [2.0, 100000000, 10, 2, 18000000],
        [2.0, 100000000, 10, 3, 18000000],
        [2.0, 100000000, 10, 4, 18000000],
        [2.0, 100000000, 10, 5, 18000000],
        [2.0, 100000000, 10, 6, 18000000],
        [2.0, 100000000, 10, 7, 18000000],
        [2.0, 100000000, 10, 8, 18000000],
        [2.0, 100000000, 10, 9, 18000000],
        [2.0, 100000000, 10, 10, 18000000]
      ]

      it('should calculate fees for every installment, with the formula (fee /100) * (installments - 1)', () => {
        runTestsForDataTable(data)
      })
    })
  })
})

function runTestsForDataTable(data) {
  return data.forEach(
    ([fee, amount, totalInstallments, installment, expectedFee]) => {
      const calculatedFee = AnticipationFees.perAdditionalInstallmentAnticipationFee(
        fee,
        amount,
        totalInstallments,
        installment
      )

      expect(calculatedFee).to.eql(expectedFee)
    }
  )
}
