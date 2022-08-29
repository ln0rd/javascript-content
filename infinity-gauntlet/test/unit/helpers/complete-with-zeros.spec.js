import forEach from 'mocha-each'
import { expect } from 'chai'

import { completeWithZeros } from 'application/core/helpers/complete-with-zeros'

describe('Unit => Helpers: completeWithZeros', () => {
  forEach([[1, 2, '01'], [1, 1, '1'], ['10', 4, '0010']]).it(
    'should %d have a length %d completed with zeros, equals %s',
    (value, size, result) => {
      expect(completeWithZeros(value, size)).to.be.equal(result)
    }
  )
})
