/*
 * scaleflow
 * wmakeev/scaleflow
 *
 * Copyright (c) 2015, Vitaliy V. Makeev
 * Licensed under MIT.
 */

var applyMiddleware = require('./applyMiddleware')
var Core = require('./core')

Core.applyMiddleware = applyMiddleware

module.exports = Core['default'] = Core.Core = Core
