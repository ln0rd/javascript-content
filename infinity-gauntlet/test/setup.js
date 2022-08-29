import Promise from 'bluebird'
import prepare from 'mocha-prepare'
import initializer from 'framework/core/initializer'

prepare(
  done => {
    return Promise.resolve()
      .then(init)
      .then(callDone)

    function init() {
      return initializer()
    }

    function callDone() {
      return done()
    }
  },
  done => {
    return done()
  }
)
