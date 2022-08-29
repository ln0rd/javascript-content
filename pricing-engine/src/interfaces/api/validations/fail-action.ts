import { Request, ResponseToolkit } from '@hapi/hapi'

export const failAction = (
  request: Request,
  h: ResponseToolkit,
  err?: Error
) => {
  throw err
}
