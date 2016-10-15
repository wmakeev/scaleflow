'use strict'

const isPromise = require('is-promise')
const compose = require('./composeAsync')

module.exports = function applyMiddleware (...middlewares) {
  return (createCore) => (...args) => {
    let applyMiddlewares = core => {
      let dispatch = core.dispatch
      let chain = []

      let middlewareAPI = {
        dispatch: (action) => dispatch(action)
      }
      chain = middlewares.map(middleware => middleware(middlewareAPI))
      dispatch = compose(...chain)(core.dispatch)

      return Object.assign({}, core, { dispatch })
    }

    let curCore = createCore(...args)

    if (isPromise(curCore)) {
      return curCore.then(applyMiddlewares)
    } else {
      return applyMiddlewares(curCore)
    }
  }
}
