import { expect } from 'chai'
import { flattenObj } from 'application/core/helpers/utils'

describe('Unit => Helpers: Utils', () => {
  describe('flattenObj', () => {
    ;[
      [{ key: 'value' }, { key: 'value' }],
      [{ key: { subkey: 'value' } }, { 'key.subkey': 'value' }],
      [
        { key: { subkey: { subsubkey: 'value' } } },
        { 'key.subkey.subsubkey': 'value' }
      ],
      [
        { key: { subkey: { subsubkey: { subsubsubkey: 'value' } } } },
        { 'key.subkey.subsubkey.subsubsubkey': 'value' }
      ],
      [
        {
          key: { subkey: 'kbvalue' },
          anotherKey: 'akvalue',
          anotherOtherKey: { subAnotherOtherKey: 'aoksaokvalue' },
          keyToArray: { subArrayValue: ['1234', '4567'] },
          keyToBool: { subBoolValue: false }
        },
        {
          'key.subkey': 'kbvalue',
          anotherKey: 'akvalue',
          'anotherOtherKey.subAnotherOtherKey': 'aoksaokvalue',
          'keyToArray.subArrayValue': ['1234', '4567'],
          'keyToBool.subBoolValue': false
        }
      ]
    ].forEach(([obj, flatObj], idx) => {
      it(`flattenObj case ${idx} return correct flat object`, () => {
        expect(flattenObj(obj)).to.deep.equal(flatObj)
      })
    })
  })
})
