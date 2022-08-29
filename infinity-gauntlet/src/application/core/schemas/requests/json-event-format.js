// Based on JSON event format for ClodEvents - version 1.0
// https://github.com/cloudevents/spec/blob/v1.0/json-format.md#3-envelope
// https://cloudevents.io/
export default {
  name: 'json_event_format',
  schema: {
    type: 'object',
    properties: {
      data_base64: {
        type: 'string',
        contentEncoding: 'base64'
      },
      datacontenttype: {
        type: 'string',
        enum: ['application/json']
      },
      id: {
        type: 'string'
      },
      messageid: {
        type: 'string'
      },
      secrettoken: {
        type: 'string'
      },
      source: {
        type: 'string'
      },
      specversion: {
        type: 'string'
      },
      subscriptionid: {
        type: 'string'
      },
      time: {
        type: 'string'
      },
      topicid: {
        type: 'string'
      },
      type: {
        type: 'string'
      }
    },
    required: ['secrettoken', 'data_base64']
  }
}
