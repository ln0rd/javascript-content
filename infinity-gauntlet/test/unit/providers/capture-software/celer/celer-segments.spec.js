import { expect } from 'chai'
import celerSegmentCode from 'application/core/providers/capture-software/celer/celer-segments'

describe('Unit => Providers => Capture Software => Celer', () => {
  context('celerSegmentCode', () => {
    const tests = [
      { mcc: '5211', expectedSegmentCode: 991 },
      { mcc: '7399', expectedSegmentCode: 448 },
      { mcc: 'default', expectedSegmentCode: 991 },
      { mcc: undefined, expectedSegmentCode: 991 },
      { mcc: null, expectedSegmentCode: 991 }
    ]

    tests.forEach(({ mcc, expectedSegmentCode }) => {
      it(`should be ${expectedSegmentCode} when the mcc is ${mcc}`, () => {
        const segmentCode = celerSegmentCode(mcc)
        expect(segmentCode).to.equal(expectedSegmentCode)
      })
    })
  })
})
