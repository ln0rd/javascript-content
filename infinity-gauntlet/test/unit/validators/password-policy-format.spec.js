import PasswordPolicy from 'application/core/validators/password-policy-format'
import { assert } from 'chai'

describe('Unit => Validators: Password Policy', () => {
  it('should return true when password meets requirements', () => {
    assert.deepEqual(
      ['Lala123@', 'h4ck3R&1', 'aaaaaA1*+'].map(password =>
        PasswordPolicy.handler(password)
      ),
      [true, true, true]
    )
  })

  it('should return false when password does not meet requirements', () => {
    assert.deepEqual(
      ['lalalala', '8470069d617e4f019343f59b63f5ce71', '1234', '123456'].map(
        password => PasswordPolicy.handler(password)
      ),
      [false, false, false, false]
    )
  })
})
