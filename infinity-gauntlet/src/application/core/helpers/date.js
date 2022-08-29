import moment from 'moment-timezone'
import config from 'application/core/config'
import bm from 'business-moment'

bm.configure({
  source: 'static'
})

export function getNextBusinessDay(date) {
  return Promise.resolve()
    .then(getDay)
    .then(calculateDate)
    .then(respond)

  function getDay() {
    return bm.isBusinessDay('brazil', date)
  }

  function calculateDate(isBusinessDay) {
    if (isBusinessDay) {
      return date
    }

    return bm.nextBusinessDay('brazil', date)
  }

  function respond(businessDate) {
    return moment(businessDate).tz(config.timezone)
  }
}

export function getNextBusinessDayNotToday(date) {
  return bm.nextBusinessDay('brazil', date)
}

export function isBusinessDay(date) {
  return bm.isBusinessDay('brazil', date)
}

export function getLastBusinessDay(date) {
  const day = moment(date).subtract(1, 'd')

  return iterate(day)

  async function iterate(day) {
    const thisIsDayBusinessDay = await isBusinessDay(day)
    if (thisIsDayBusinessDay) {
      return day.toDate()
    }
    return iterate(day.subtract(1, 'd'))
  }
}

export const normalizeDateWithTimezone = (date, type) => {
  const time = {
    start: {
      hour: '00',
      minute: '00',
      second: '00'
    },
    end: {
      hour: '23',
      minute: '59',
      second: '59'
    }
  }[`${type}`]

  const format = 'YYYY-MM-DDTHH:mm:ss'

  let momentDate = moment(date)

  if (momentDate._f === 'YYYY-MM-DD') {
    momentDate = moment(`${momentDate._i}T${time.hour}`)
  }

  if (momentDate._f === 'YYYY-MM-DDTHH') {
    momentDate = moment(`${momentDate._i}:${time.minute}`)
  }

  if (momentDate._f === 'YYYY-MM-DDTHH:mm') {
    momentDate = moment(`${momentDate._i}:${time.second}`)
  }

  return `${momentDate.format(format)}-03:00`
}
