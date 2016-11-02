'use strict'

const test = require('blue-tape')
const sinon = require('sinon')
const co = require('co')

let {
  applyMiddleware, applyPlugin, createCore, composeAsync
} = require('../src')

test('scaleflow package api', t => {
  t.ok(applyMiddleware, 'scaleflow#applyMiddleware is ok')
  t.ok(applyPlugin, 'scaleflow#applyPlugin is ok')
  t.ok(createCore, 'scaleflow#createCore is ok')
  t.ok(composeAsync, 'scaleflow#composeAsync is ok')

  t.end()
})

test('Core simple instance', t => {
  let core = createCore()

  t.plan(8)

  t.ok(core, 'core is ok')
  t.ok(core.dispatch, 'core.dispatch is ok')
  t.ok(core.subscribe, 'core.subscribe is ok')
  t.ok(core.options, 'core.options is ok')

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
  let syncPlugin1 = core => {
    return Object.assign({}, core, { foo: 'bar' })
  }

  t.comment('apply one sync plugin')

  let syncCore1 = createCore(applyPlugin(syncPlugin1))
  t.ok(syncCore1, 'createCore returns core sync')
  t.equal(syncCore1.foo, 'bar', 'plugin1 applied to core1')

  t.comment('apply tow sync plugins')

  let syncPlugin2 = core => {
    return Object.assign({}, core, { foo2: 'bar2' })
  }

  let syncCore2 = createCore(applyPlugin(syncPlugin1, syncPlugin2))
  t.ok(syncCore2, 'createCore returns core sync')
  t.equal(syncCore2.foo, 'bar', 'plugin1 applied to core2')
  t.equal(syncCore2.foo2, 'bar2', 'plugin2 applied to core2')

  t.comment('apply async and sync plugins')

  let asyncPlugin3 = core => {
    return Promise.resolve(Object.assign({}, core, {
      async: 'ok',
      foo: core.foo + 'baz'
    }))
  }

  let asyncCore3 = yield createCore(applyPlugin(syncPlugin1, asyncPlugin3))
  t.ok(asyncCore3, 'createCore returns core async')
  t.equal(asyncCore3.async, 'ok', 'async plugin3 applied async to core3 #1')
  t.equal(asyncCore3.foo, 'barbaz', 'plugins applied async to core3 #2')
}))

test('Plugins (parallel and serial modes)', co.wrap(function * (t) {
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

test('Not able plugins mutate core in parallel mode', t => {
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

  let curCore = createCore(
    applyMiddleware(middleware1, middleware2, middleware3))

  let subscribeSpy = sinon.spy()
  curCore.subscribe(subscribeSpy)

  let dispatchResult = curCore.dispatch({
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
  const expectedPayload = [
    // Head
    10,                 // 5
    9,                  // 4
    8,                  // 3
    5, 6,               // 2
    1, 2, 3,            // 1

    // Core (Head)
    11, 13,             // -1
    14, 15,             // -2

    // Core (Tail)
    16,                 // -2
    12,                 // -1

    // Tail
    4,                  // 1
    7                   // 3
  ]

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

  let plugin = num => core => {
    return Object.assign({}, core, { [`plugin${num}`] () {
      let action = core.dispatch({
        type: 'foo',
        payload: []
      })
      t.deepEqual(action, {
        type: 'foo',
        payload: expectedPayload
      }, `result action in plugin#${num} should be equivalent`)
    } })
  }

  // 1
  let createCore1 = composeAsync(
    applyPlugin(plugin(1)),
    applyMiddleware(middlewareHead(1), middlewareHead(2)),
    applyMiddleware(middlewareHead(3)),
    applyMiddleware(middlewareTail(4)) // next first
  )(createCore)

  // 2
  let createCore2 = composeAsync(
    applyMiddleware(
      middlewareHead(5),
      middlewareHead(6)),
    applyPlugin(
      plugin(2))
  )(createCore1)

  // 3
  let createCore3 = applyMiddleware(
    middlewareTail(7), // next first
    middlewareHead(8)
  )(createCore2)

  // 4
  let createCore4 = applyMiddleware(middlewareHead(9))(createCore3)

  // 5
  let createCore5 = applyMiddleware(middlewareHead(10))(createCore4)

  // 0
  let enhancer = composeAsync(
    applyPlugin(plugin(3)),
    // -1
    applyMiddleware(
      middlewareHead(11),
      middlewareTail(12), // next first
      middlewareHead(13)),
    // -2
    applyMiddleware(
      middlewareHead(14),
      middlewareHead(15),
      middlewareTail(16)),

    applyPlugin(plugin(4)))

  let fooCore5 = createCore5(enhancer)

  let fooAction = fooCore5.dispatch({
    type: 'foo',
    payload: []
  })

  t.deepEqual(fooAction, {
    type: 'foo',
    payload: expectedPayload
  }, 'result action should be equivalent')

  t.ok(fooCore5.plugin1, 'fooCore5.plugin1 to be ok')
  // fooCore5.plugin1()

  t.ok(fooCore5.plugin2, 'fooCore5.plugin2 to be ok')
  t.ok(fooCore5.plugin3, 'fooCore5.plugin3 to be ok')
  t.ok(fooCore5.plugin4, 'fooCore5.plugin4 to be ok')

  t.end()
})

