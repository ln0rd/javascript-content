export function verifySerialNumber(serialNumber, hardwareModel) {
  switch (serialNumber) {
    case (serialNumber.match(/14[0-9]{8}/) || {}).input:
      return ['d195', 'd175'].includes(hardwareModel)
    case (serialNumber.match(/12[0-9]{8}/) || {}).input:
      return hardwareModel === 'd190'
    case (serialNumber.match(/08[0-9]{8}/) || {}).input:
      return hardwareModel === 'a920'
    case (serialNumber.match(/6[a-zA-Z]{1}[0-9]{6}/) || {}).input:
      return hardwareModel === 's920'
    case (serialNumber.match(/7D[0-9]{6}/) || {}).input:
      return hardwareModel === 'd150'
    case (serialNumber.match(/80000[0-9]{11}/) || {}).input:
      return hardwareModel === 'mobipin10'
    case (serialNumber.match(/1[7-8]{1}[0-9]{22}/) || {}).input:
      return hardwareModel === 'move5000'
    default:
      return false
  }
}
