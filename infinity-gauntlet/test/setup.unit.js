import dotenv from 'dotenv'
import mongoose from 'mongoose'
import autoIncrement from 'mongoose-auto-increment-fix'
import prepare from 'mocha-prepare'
import I18nAdapter from 'framework/core/adapters/i18n'
import ValidatorAdapter from 'framework/core/adapters/validator'

dotenv.config()

prepare(async done => {
  autoIncrement.initialize(mongoose.connection)
  await I18nAdapter()
  await ValidatorAdapter()
  done()
})
