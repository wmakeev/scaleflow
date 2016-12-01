const Core = require('..')

const loggerInitializer = (options, { instance }) => {
  return Object.assign(instance, {
    log: (...args) => instance.dispatch({
      type: 'LOG',
      payload: [`${options.name || 'LOG'}:`].concat(args)
    })
  })
}

const loggerMiddleware = core => next => action => {
  if (action.type === 'LOG') {
    console.log(...action.payload)
  }
  return next(action)
}

let MyCore = Core
  .init(loggerInitializer)
  .middleware(loggerMiddleware)

let myCore = MyCore({ name: 'MyCore' })

myCore.log('Hello world!') // MyCore: Hello world!
