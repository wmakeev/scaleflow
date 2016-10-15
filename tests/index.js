'use strict'

const test = require('blue-tape')
const sinon = require('sinon')
const co = require('co')

let {
      applyMiddleware, applyPlugin, createCore, composeAsync, ActionTypes
} = require('../src')

test('scaleflow package api', t => {
  t.ok(applyMiddleware, 'scaleflow#applyMiddleware is ok')
  t.ok(applyPlugin, 'scaleflow#applyPlugin is ok')
  t.ok(createCore, 'scaleflow#createCore is ok')
  t.ok(composeAsync, 'scaleflow#composeAsync is ok')
  t.ok(ActionTypes, 'scaleflow#ActionTypes is ok')

  t.end()
})

test('core simple instance', t => {
  let core = createCore()

  t.plan(7)

  t.ok(core, 'core is ok')
  t.ok(core.dispatch, 'core.dispatch is ok')
  t.ok(core.subscribe, 'core.subscribe is ok')

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

test('plugins', co.wrap(function * (t) {
  let syncPlugin = core => {
    return Object.assign({}, core, { foo: 'bar' })
  }

  let syncCore = createCore(applyPlugin(syncPlugin))
  t.ok(syncCore, 'createCore returns core sync')
  t.equal(syncCore.foo, 'bar', 'plugin applied to core')

  let asyncPlugin = core => {
    return Promise.resolve(Object.assign({}, core, {
      async: 'ok',
      foo: core.foo + 'baz'
    }))
  }

  let asyncCore = yield createCore(applyPlugin(syncPlugin, asyncPlugin))
  t.ok(asyncCore, 'createCore returns core async')
  t.equal(asyncCore.async, 'ok', 'plugins applied async to core #1')
  t.equal(asyncCore.foo, 'barbaz', 'plugins applied async to core #2')
}))

test('plugins (parallel and serial modes)', co.wrap(function * (t) {
  let sequence = []

  let plugin0 = core => {
    return new Promise(resolve => setTimeout(() => {
      sequence.push('p0')
      resolve(core)
    }), 20)
  }

  let plugin1 = core => {
    sequence.push('p1')
    return core
  }

  let plugin2 = core => {
    return new Promise(resolve => setTimeout(() => {
      sequence.push('p2')
      resolve(core)
    }), 10)
  }

  let plugin3 = core => {
    sequence.push('p3')
    return core
  }

  let core1 = yield createCore(applyPlugin(
    plugin0,
    [plugin1, plugin2, plugin3]
  ))

  t.ok(core1, 'result core is ok')
  t.deepEqual(sequence, ['p0', 'p1', 'p3', 'p2'], 'plugins applied to core in correct order')
}))

test('not able plugins mutate core in parallel mode', t => {
  let plugin1 = core => {
    return core
  }

  let plugin2 = core => {
    return new Promise(resolve => setTimeout(() => {
      resolve(core)
    }), 10)
  }

  let mutationPlugin = core => {
    return Object.assign({}, core, { mutated: true })
  }

  createCore(applyPlugin(
    [plugin1, plugin2, mutationPlugin]
  ))
    .then(() => {
      t.fail('Error expected')
    })
    .catch(err => {
      t.equal(err.message, 'Plugin in parallel mode must not mutate core')
      t.end()
    })
})

test('middleware', t => {
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

  let curCore = createCore(
    applyMiddleware(middleware1, middleware2, middleware3))

  let subscribeSpy = sinon.spy()
  curCore.subscribe(subscribeSpy)

  let dispatchResult = curCore.dispatch({
    type: 'first'
  })

  t.equal(dispatchResult.type, 'second')

  t.equal(spy1.callCount, 3, 'middleware1 call count')
  t.equal(spy1.firstCall.args[0].type, ActionTypes.INIT, 'firstCall')
  t.equal(spy1.secondCall.args[0].type, 'first', 'secondCall')
  t.equal(spy1.thirdCall.args[0].type, 'second', 'thirdCall')

  t.equal(spy2.callCount, 3, 'middleware2 call count')
  t.equal(spy2.firstCall.args[0].type, ActionTypes.INIT, 'firstCall')

  t.ok(spy2.calledAfter(spy1), 'middleware2 called after middleware1')

  t.equal(spy2.secondCall.args[0].type, 'first', 'secondCall')
  t.equal(spy2.thirdCall.args[0].type, 'second', 'thirdCall')

  t.equal(spy3.callCount, 2, 'middleware3 call count')
  t.equal(spy3.firstCall.args[0].type, ActionTypes.INIT, 'firstCall')
  t.equal(spy3.secondCall.args[0].type, 'second', 'secondCall')

  t.equal(subscribeSpy.callCount, 1, 'subscribe call count')
  t.equal(subscribeSpy.firstCall.args[0].type, 'second', 'firstCall')

  t.end()
})
