'use strict'

const isPromise = require('is-promise')

module.exports = function composeAsync (...funcs) {
  if (funcs.length === 0) {
    return arg => arg
  }

  if (funcs.length === 1) {
    return funcs[0]
  }

  const last = funcs[funcs.length - 1]
  const rest = funcs.slice(0, -1)
  return (...args) => rest.reduceRight((composed, f) => {
    return isPromise(composed)
      ? composed.then(c => f(c))
      : f(composed)
  }, last(...args))
}
