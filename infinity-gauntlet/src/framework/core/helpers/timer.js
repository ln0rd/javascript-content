import moment from 'moment'

export function startProcessTimer() {
  return process.hrtime()
}

export function endProcessTimer(hrtime) {
  const Time = process.hrtime(hrtime)

  return moment()
    .seconds(Math.ceil((Time[0] + Time[1] / 1e9).toFixed(3)))
    .fromNow(true)
}

const NS_PER_SEC = 1e9
const MS_PER_NS = 1e6

/**
 * Get duration in milliseconds from two process.hrtime()
 * @function hrTimeDurationInMs
 * @param {Array} startTime - [seconds, nanoseconds]
 * @param {Array} endTime - [seconds, nanoseconds]
 * @returns {Number|null} durationInMs
 */
export function hrTimeDurationInMs(startTime, endTime) {
  if (!Array.isArray(startTime) || !Array.isArray(endTime)) {
    return null
  }

  var secondDiff = endTime[0] - startTime[0]
  var nanoSecondDiff = endTime[1] - startTime[1]
  var diffInNanoSecond = secondDiff * NS_PER_SEC + nanoSecondDiff

  return Math.round(diffInNanoSecond / MS_PER_NS)
}
