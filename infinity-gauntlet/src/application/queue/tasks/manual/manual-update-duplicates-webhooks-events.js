import Promise from 'bluebird'
import createLogger from 'framework/core/adapters/logger'
import request from 'request-promise'
import { join } from 'path'
import { createWriteStream, createReadStream } from 'fs'
import readline from 'readline'
import events from 'events'
import { splitEvery } from 'ramda'
import Mongoose from 'mongoose'
import WebHookEvent from 'application/webhook/models/event'

const Logger = createLogger({ name: 'MANUAL_UPDATE_DUPLICATES_WEBHOOK_EVENTS' })

export default class UpdateDuplicatesWebhooksEvents {
  constructor() {
    this.EVENTS_DATA = []
  }

  static type() {
    return 'manual'
  }

  static async handler(args) {
    const [csvURI] = args
    const instance = new UpdateDuplicatesWebhooksEvents()
    await instance.downloadFile(csvURI)
    await instance.parseFileLine()
    await instance.executeByBatch()
  }

  get BASE_PATH() {
    return '/tmp'
  }

  get FILE_NAME() {
    return 'webhookevents.csv'
  }

  get FILE_PATH() {
    return join(this.BASE_PATH, this.FILE_NAME)
  }

  async downloadFile(uri) {
    Logger.info({ uri }, 'download-file')
    const fileStream = createWriteStream(this.FILE_PATH)
    return new Promise((resolve, reject) => {
      request({
        uri,
        gzip: true
      })
        .pipe(fileStream)
        .on('finish', () => {
          Logger.info(
            {
              FILE_PATH: this.FILE_PATH,
              length: `${fileStream.bytesWritten} bytes`
            },
            'download-file'
          )
          resolve()
        })
        .on('error', error => {
          Logger.error({ error, FILE_PATH: this.FILE_PATH }, 'download-file')
          reject(error)
        })
    })
  }

  async parseFileLine() {
    const stream = readline.createInterface({
      input: createReadStream(this.FILE_PATH)
    })

    stream.on('line', line => {
      const [eventId] = line.split(',')
      if (Mongoose.Types.ObjectId.isValid(eventId)) {
        this.EVENTS_DATA.push(Mongoose.Types.ObjectId(eventId))
      }
    })

    await events.once(stream, 'close')
    Logger.info(
      {
        FILE_PATH: this.FILE_PATH,
        lines: this.EVENTS_DATA.length
      },
      'file-line-parsed'
    )
  }

  async executeByBatch(limit = 1000) {
    const groups = splitEvery(limit, this.EVENTS_DATA)
    delete this.EVENTS_DATA
    Logger.info({ groups: groups.length }, 'execute-batch')

    await Promise.allSettled(
      groups.map(async group => this.updateInDatabase(group))
    )
  }

  async updateInDatabase(eventIds) {
    const result = await WebHookEvent.updateMany(
      {
        _id: {
          $in: eventIds
        }
      },
      {
        $set: { deleted: true }
      }
    )

    Logger.info({ result }, 'update-in-database')
  }
}
