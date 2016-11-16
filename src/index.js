/*
 * scaleflow
 * wmakeev/scaleflow
 *
 * Copyright (c) 2015, Vitaliy V. Makeev
 * Licensed under MIT.
 */

let Core = require('./core')
let composeAsync = require('./composeAsync')
let applyMiddleware = require('./applyMiddleware')

module.exports = {
  Core, applyMiddleware, composeAsync
}
