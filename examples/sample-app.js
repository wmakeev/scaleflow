const { Core } = require('../src')

const myActionTypes = {
  LOG: 'LOG'
}

const logAction = (...args) => ({
  type: myActionTypes.LOG,
  payload: args
})

const loggerInitializer = (options, { instance: core }) => {
  return Object.assign(core, {
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

let MyCore = Core
  .init(loggerInitializer)
  .middleware(loggerMiddleware)

let myCore = MyCore({ name: 'MyCore' })

myCore.log('Hello world!') // MyCore: Hello world!
