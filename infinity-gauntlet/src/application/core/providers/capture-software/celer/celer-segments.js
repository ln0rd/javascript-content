// This is a mapping between mcc and celer segmentInsideCode
export default function celerSegmentCode(mcc) {
  // https://www.dm.usda.gov/procurement/card/card_x/mcc.pdf
  // MCC 5211 => 'Lumber and Building Materials Stores'
  // MCC 7399 => 'Business Services, Not Elsewhere Classified'
  // Defaults to MCC 5211 => 'Lumber and Building Materials Stores'
  switch (mcc) {
    case '5211':
      return 991
    case '7399':
      return 448
    default:
      return 991
  }
}
