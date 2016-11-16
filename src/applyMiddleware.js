'use strict'

const isPromise = require('is-promise')
const compose = require('lodash.flowright')

module.exports = function applyMiddleware (...middlewares) {
  return (options, { instance }) => {
    let applyMiddlewares = core => {
      let dispatch
      let chain = []

      chain = middlewares.map(middleware => middleware(core))
      dispatch = compose(...chain)(core.dispatch)

      return Object.assign(core, { dispatch })
    }

    return isPromise(instance)
      ? instance.then(applyMiddlewares)
      : applyMiddlewares(instance)
  }
}
