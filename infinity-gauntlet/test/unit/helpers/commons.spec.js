import { expect } from 'chai'
import forEach from 'mocha-each'
import { deepHideKey } from 'framework/core/helpers/commons'

describe('Unit => Helpers: hideSensitiveValue', () => {
  context('when has sensitive information', () => {
    forEach([
      [
        'should hide information with object',
        {
          username: 'doomguy',
          password: 'hell123',
          token: '123456789',
          old_password: '123456789'
        },
        {
          username: 'doomguy',
          password: '***',
          token: '***',
          old_password: '***'
        }
      ],
      [
        'should hide information with deep object',
        {
          data: {
            username: 'doomguy',
            password: 'hell123',
            token: '123456789',
            old_password: '123456789'
          }
        },
        {
          data: {
            username: 'doomguy',
            password: '***',
            token: '***',
            old_password: '***'
          }
        }
      ]
    ]).it('%s', (scenario, arrange, assert) => {
      const hideKey = ['token', 'password', 'old_password']
      expect(deepHideKey(arrange, hideKey)).to.deep.equal(assert)
    })
  })
  context('when not has sensitive information', () => {
    forEach([
      [
        'should not throw when trying to hide sensitive information of the null object',
        null,
        [],
        null
      ],
      [
        'should not hide information with empty hide key',
        {
          username: 'doomguy',
          password: 'hell123',
          old_password: '123456789'
        },
        [],
        {
          username: 'doomguy',
          password: 'hell123',
          old_password: '123456789'
        }
      ],
      [
        'should not hide information with not match hide keys',
        {
          username: 'doomguy',
          password: 'hell123',
          old_password: '123456789'
        },
        ['token'],
        {
          username: 'doomguy',
          password: 'hell123',
          old_password: '123456789'
        }
      ]
    ]).it('%s', (scenario, arrange, hideKey, assert) => {
      expect(deepHideKey(arrange, hideKey)).to.deep.equal(assert)
    })
  })
})
