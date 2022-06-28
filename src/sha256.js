const crypto = require('crypto')


function sha256(left, right) {
  return crypto
    .createHash('sha256')
    .update(left.substring(0, 64).concat(right.substring(0, 64)))
    .digest('hex')
}


module.exports = sha256
