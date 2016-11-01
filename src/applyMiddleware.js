'use strict'

const isPromise = require('is-promise')
const compose = require('./composeAsync')

module.exports = function applyMiddleware (...middlewares) {
  return (createCore) => (...args) => {
    let applyMiddlewares = core => {
      let dispatch = core.dispatch
      let chain = []

      let coreAPI = Object.assign({}, core, {
        dispatch: (action) => dispatch(action)
      })

      chain = middlewares.map(middleware => middleware(coreAPI))
      dispatch = compose(...chain)(core.dispatch)

      return Object.assign({}, core, { dispatch })
    }

    let curCore = createCore(...args)

    return isPromise(curCore)
      ? curCore.then(applyMiddlewares)
      : applyMiddlewares(curCore)
  }
}
