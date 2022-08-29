import { expect } from 'chai'
import forEach from 'mocha-each'
import { normalizeDateWithTimezone } from 'application/core/helpers/date'

describe('Unit => Helpers: normalizeDateWithTimezone', () => {
  forEach([
    ['2020-01-02', 'start', '2020-01-02T00:00:00-03:00'],
    ['2020-01-02', 'end', '2020-01-02T23:59:59-03:00'],

    ['2020-01-02T01', 'start', '2020-01-02T01:00:00-03:00'],
    ['2020-01-02T10', 'end', '2020-01-02T10:59:59-03:00'],

    ['2020-01-02T01:00', 'start', '2020-01-02T01:00:00-03:00'],
    ['2020-01-02T10:19', 'end', '2020-01-02T10:19:59-03:00'],

    ['2020-01-02T01:00:12', 'start', '2020-01-02T01:00:12-03:00'],
    ['2020-01-02T10:19:13', 'end', '2020-01-02T10:19:13-03:00']
  ]).it('should %s like %s date became %s', (date, type, assert) => {
    expect(normalizeDateWithTimezone(date, type)).equal(assert)
  })
})
