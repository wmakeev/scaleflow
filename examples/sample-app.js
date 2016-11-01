const {
  applyMiddleware, applyPlugin, createCore, composeAsync: compose
} = require('../src')

const myActionTypes = {
  LOG: 'LOG'
}

const logAction = (...args) => ({
  type: myActionTypes.LOG,
  payload: args
})

const loggerPlugin = core => {
  return Object.assign({}, core, {
    log: (...args) => core.dispatch(logAction(...args))
  })
}

const loggerMiddleware = core => {
  let prefix = core.options.name || 'LOG'
  return next => action => {
    if (action.type === myActionTypes.LOG) {
      console.log(`${prefix}:`, ...action.payload)
    }
    return next(action)
  }
}

let myCore = createCore(
  { name: 'MyCore' },
  compose(
    applyPlugin(loggerPlugin),
    applyMiddleware(loggerMiddleware)))

myCore.log('Hello world!') // MyCore: Hello world!
