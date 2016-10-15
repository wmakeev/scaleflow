let {
  applyMiddleware, applyPlugin, createCore, compose, ActionTypes
} = require('../src')

let myActionTypes = {
  LOG: 'LOG'
}

let loggerPlugin = core => {
  let log = (...args) => core.dispatch({
    type: myActionTypes.LOG,
    payload: args
  })

  return Object.assign({}, core, { log })
}

let loggerMiddleware = core => {
  let prefix = 'LOG:'
  return next => action => {
    if (action.type === ActionTypes.INIT) {
      prefix = action.payload.options.prefix
    } else if (action.type === myActionTypes.LOG) {
      console.log.apply(console, action.payload)
    }
    return next(action)
  }
}

let myCore = createCore(
  { name: 'MyCore' },
  compose(
    applyPlugin(loggerPlugin),
    applyMiddleware(loggerMiddleware)))

myCore.log('Hello world!')
