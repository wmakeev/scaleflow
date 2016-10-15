'use strict'

const isPromise = require('is-promise')

const ensureNotMutated = (res, core) => {
  if (!res.every(r => r === core)) {
    throw new Error('Plugin in parallel mode must not mutate core')
  }
  return core
}

const applyParallel = plugins => core => {
  let results = plugins.map(p => p(core))
  return results.some(r => isPromise(r))
    ? Promise.all(results).then(res => ensureNotMutated(res, core))
    : ensureNotMutated(results, core)
}

module.exports = function applyPlugin (...plugins) {
  return (createCore) => (...args) => {
    let core = createCore(...args)

    return plugins.reduce((res, plugin) => {
      let curPlugin = plugin
      if (plugin instanceof Array) {
        curPlugin = applyParallel(plugin)
      }
      return isPromise(res)
        ? res.then(c => curPlugin(c))
        : curPlugin(res)
    }, core)
  }
}

