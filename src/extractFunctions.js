const isFunction = require('lodash.isfunction')

const concat = Array.prototype.concat
module.exports = function () {
  const fns = concat.apply([], arguments).filter(isFunction)
  return fns.length === 0 ? undefined : fns
}
