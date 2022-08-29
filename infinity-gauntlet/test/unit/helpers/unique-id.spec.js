import { expect } from 'chai'
import uniqueId from 'application/core/helpers/unique-id'

describe('Unit => Helpers: Unique Id', function() {
  let uniqueString = ''

  before(function() {
    uniqueString = uniqueId()
  })

  it('should have length of 50', function() {
    expect(uniqueString).to.have.lengthOf(50)
  })

  it('should generate a unique string every time', function() {
    expect(uniqueString).to.not.be.eql(uniqueId())
  })
})
