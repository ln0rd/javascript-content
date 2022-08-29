import Promise from 'bluebird'
import config from 'application/core/config'
import PaginationError from 'application/core/errors/pagination-error'

export function paginate(
  locale,
  model,
  query,
  sort,
  page,
  perPage,
  responder,
  select,
  queryMethod = 'find'
) {
  return Promise.resolve()
    .then(find)
    .then(countResults)
    .spread(respond)

  function find() {
    page = !isNaN(page) ? Number(page) : config.pagination.default_page
    perPage = !isNaN(perPage)
      ? Number(perPage)
      : config.pagination.default_per_page

    const Skip = (page - 1) * perPage
    let queryChain

    if (perPage > config.pagination.max_limit) {
      throw new PaginationError(locale, config.pagination.max_limit)
    }

    switch (queryMethod) {
      case 'aggregate':
        return model
          .aggregate([
            ...query,
            { $sort: sort },
            { $skip: Skip },
            { $limit: perPage }
          ])
          .allowDiskUse(true)
          .read('secondary')
          .exec()
      case 'find':
        queryChain = model.find(query)
        break
      default:
        throw new Error('Unsupported query chain')
    }

    queryChain = queryChain
      .sort(sort)
      .skip(Skip)
      .limit(perPage)
      .lean()

    if (select) {
      queryChain = queryChain.select(select)
    }

    return queryChain.read('secondary').exec()
  }

  async function countResults(results) {
    if (responder) {
      results = responder(results)
    }
    if (queryMethod === 'aggregate') {
      const aggregateList = await model
        .aggregate([...query, { $group: { _id: null, count: { $sum: 1 } } }])
        .allowDiskUse(true)
        .read('secondary')
        .exec()
      if (!aggregateList || aggregateList.length <= 0) {
        return [results, 0]
      }
      const [{ count }] = aggregateList
      return [results, count]
    }

    return [results, model.countDocuments(query)]
  }

  function respond(items, length) {
    return {
      results: items,
      total: length,
      page: page,
      pages: Math.ceil(length / perPage),
      perPage: perPage
    }
  }
}

export function paginatedResults(statusCode, res, response) {
  res.header('X-Page', response.page)
  res.header('X-Total-Pages', response.pages)
  res.header('X-Total-Items', response.total)
  res.header('X-Count', response.perPage)

  return res.json(statusCode, response.results)
}
