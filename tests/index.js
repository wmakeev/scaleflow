'use strict'

const test = require('blue-tape')
const sinon = require('sinon')
const co = require('co')
const isPromise = require('is-promise')

// const skip = () => {}

let { Core, applyMiddleware } = require('../src')

test('Scaleflow package api', t => {
  t.equal(typeof Core, 'function', 'scaleflow#Core is function')
  t.equal(typeof applyMiddleware, 'function', 'scaleflow#applyMiddleware is function')
  t.end()
})

test('Core api', t => {
  t.equal(typeof Core.compose, 'function', 'Core#compose is function')
  t.equal(typeof Core.init, 'function', 'Core#init is function')
  t.equal(typeof Core.middleware, 'function', 'Core#middleware is function')
  t.end()
})

test('Core simple instance', t => {
  let core = Core({ foo: 'bar' })

  t.plan(9)

  t.ok(core, 'core is ok')
  t.equal(typeof core.dispatch, 'function', 'core.dispatch is function')
  t.equal(typeof core.subscribe, 'function', 'core.subscribe is function')
  t.equal(typeof core.options, 'object', 'core.options is ok')
  t.equal(core.options.foo, 'bar', 'core.options is ok')

  let action1 = { type: 'foo1' }
  let action2 = { type: 'foo2' }

  let unsubscribe = core.subscribe(a => {
    t.equal(a, action1, 'subscription receive dispatched action')
  })
  t.ok(unsubscribe, 'core.subscribe returns unsubscribe function')

  t.equal(core.dispatch(action1), action1, 'core.dispatch returns passed action')

  unsubscribe()

  core.subscribe(a => {
    t.equal(a, action2, 'only subscribed subscriptions receives dispatched actions')
  })
  core.dispatch(action2)
})

test('Plugins', co.wrap(function * (t) {
  t.comment('apply sync plugins')

  let syncPlugin1 = (options, { instance }) => {
    return Object.assign(instance, { foo1: 'bar1' })
  }

  let SyncCore1 = Core.init(syncPlugin1)

  let syncPlugin2 = function (options, { instance }) {
    return Object.assign(this, { foo2: 'bar2' })
  }

  let SyncCore2 = SyncCore1.init(syncPlugin2)
  let syncCore2 = SyncCore2()

  t.ok(syncCore2, 'create core sync')
  t.equal(syncCore2.foo1, 'bar1', 'plugin1 applied to core')
  t.equal(syncCore2.foo2, 'bar2', 'plugin2 applied to core')

  t.comment('apply async and sync plugins')

  let asyncPlugin3 = (options, { instance }) => {
    return Promise.resolve(Object.assign(instance, {
      foo3: instance.foo1 + ' ' + instance.foo2
    }))
  }

  let AsyncCore1 = Core.init(syncPlugin1, asyncPlugin3, syncPlugin2)
  let asyncCoreResult1 = AsyncCore1()

  t.ok(isPromise(asyncCoreResult1), 'create async core')
  let asyncCore1 = yield asyncCoreResult1

  t.ok(asyncCore1, 'Core create core async')
  t.equal(asyncCore1.foo1, 'bar1', 'plugin1 applied to core')
  t.equal(asyncCore1.foo2, 'bar2', 'plugin2 applied to core')
  t.equal(asyncCore1.foo3, 'bar1 undefined', 'async plugins applied to core in serial')
}))

test('Force plugins mutate core', t => {
  let plugin1 = (_, { instance }) => (Object.assign(instance, { foo1: true }))

  let plugin2 = () => { return { foo2: true } }

  let plugin3 = () => {
    return new Promise(resolve => setTimeout(() => {
      resolve({ foo3: true })
    }), 10)
  }

  let Core1 = Core.init(plugin1, plugin2, plugin3)

  Core1().then((core1) => {
    t.ok(core1)
    t.ok(core1.foo1)
    t.notOk(core1.foo2)
    t.notOk(core1.foo2)
    t.end()
  })
})

test('Middleware', t => {
  let spy1 = sinon.spy()
  let middleware1 = core => next => action => {
    spy1(action)
    return next(action)
  }

  let spy2 = sinon.spy()
  let middleware2 = core => next => action => {
    spy2(action)
    if (action.type === 'first') {
      return core.dispatch({
        type: 'second'
      })
    } else {
      return next(action)
    }
  }

  let spy3 = sinon.spy()
  let middleware3 = core => next => action => {
    spy3(action)
    return next(action)
  }

  let TestCore = Core.middleware(middleware1, middleware2, middleware3)
  let testCore = TestCore()

  let subscribeSpy = sinon.spy()
  testCore.subscribe(subscribeSpy)

  let dispatchResult = testCore.dispatch({
    type: 'first'
  })

  t.equal(dispatchResult.type, 'second')

  t.equal(spy1.callCount, 2, 'middleware1 call count')
  t.equal(spy1.firstCall.args[0].type, 'first', 'firstCall')
  t.equal(spy1.secondCall.args[0].type, 'second', 'secondCall')

  t.equal(spy2.callCount, 2, 'middleware2 call count')

  t.ok(spy2.calledAfter(spy1), 'middleware2 called after middleware1')

  t.equal(spy2.firstCall.args[0].type, 'first', 'secondCall')
  t.equal(spy2.secondCall.args[0].type, 'second', 'thirdCall')

  t.equal(spy3.callCount, 1, 'middleware3 call count')
  t.equal(spy3.firstCall.args[0].type, 'second', 'firstCall')

  t.equal(subscribeSpy.callCount, 1, 'subscribe call count')
  t.equal(subscribeSpy.firstCall.args[0].type, 'second', 'firstCall')

  t.end()
})

test('Complex core', t => {
  const expectedPayload = [ 1, 2, 3, 9, 5, 7, 6, 8, 4 ]

  let middlewareHead = num => core => next => action => {
    if (action.type === 'foo') {
      action.payload.push(num)
    }
    return next(action)
  }

  let middlewareTail = num => core => next => action => {
    // next first
    action = next(action)
    if (action.type === 'foo') {
      action.payload.push(num)
    }
    return action
  }

  let initializer = num => (_, { instance: core }) => {
    return Object.assign(core, {
      [`init${num}`] () {
        let action = core.dispatch({
          type: 'foo',
          payload: []
        })
        t.deepEqual(action, {
          type: 'foo',
          payload: expectedPayload
        }, `result action in plugin#${num} should be equivalent`)
      }
    })
  }

  // 1
  let Core1 = Core
    .init(initializer(1))
    .middleware(middlewareHead(1), middlewareHead(2))
    .middleware(middlewareHead(3))
    .middleware(middlewareTail(4)) // next first)

  // 2
  let Core2 = Core1
    .init(
      applyMiddleware(
        middlewareHead(5),
        middlewareTail(6), // next first
        middlewareHead(7)))
    .init(initializer(2))

  // 3
  let Core3 = Core2
    .middleware(
      middlewareTail(8), // next first
      middlewareHead(9))

  let core3 = Core3()

  let fooAction = core3.dispatch({
    type: 'foo',
    payload: []
  })

  t.deepEqual(fooAction, {
    type: 'foo',
    payload: expectedPayload
  }, 'result action should be equivalent')

  t.ok(core3.init1, 'core.init1 to be ok')
  core3.init1()

  t.ok(core3.init2, 'core.init2 to be ok')
  core3.init2()

  t.end()
})

