import Company from 'application/core/models/company'
import ForbiddenError from 'framework/core/errors/forbidden-error'

const idLeo = '5cf141b986642840656717f0'
const idNeon = '6022e1709af07f00063e12fc'
const idMobbi = '59dcd1f57033b90004b32339'

export async function byISO(req, res, next) {
  const companyId = req.get('company').id

  // Caso o ISO esteja fazendo alguma operação no merchant
  if (companyId === idLeo || companyId === idNeon || companyId === idMobbi) {
    return next()
  }

  // Senão, validar a company caso seja um merchant
  const company = await Company.findOne({
    _id: companyId,
    parent_id: {
      $in: [idLeo, idNeon, idMobbi]
    }
  })
    .select('_id')
    .lean()
    .exec()

  if (company) {
    return next()
  }

  return next(new ForbiddenError(req.get('locale')))
}
