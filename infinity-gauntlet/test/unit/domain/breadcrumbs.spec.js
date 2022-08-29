import { expect } from 'chai'
import { createId } from 'application/core/domain/breadcrumbs'

describe('Unit => Domain: Breadcrumbs', () => {
  context('createId', () => {
    it('should create an id using multiple properties', () => {
      const uid = '1234'
      const modelId = 'wer'

      expect(createId({ uid, modelId })).to.equal('uid(1234):modelId(wer)')
    })
  })
})
