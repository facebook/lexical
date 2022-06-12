'use strict';

const SSEStream = require('ssestream').default;
const { resolve } = require('path');
const debounce = require('lodash.debounce');

function extensionAutoReload(compiler) {
  return (req, res, next) => {
    const sseStream = new SSEStream(req)
    sseStream.pipe(res)

    let closed = false

    const compileDoneHook = debounce((stats) => {
      const { modules } = stats.toJson({ all: false, modules: true })
      const updatedJsModules = modules?.filter(
        (module) => module.type === 'module' && module.moduleType === 'javascript/auto'
      )
      const shouldReload =
        !stats.hasErrors() &&
        updatedJsModules?.some((module) =>
          module.nameForCondition?.startsWith(resolve(__dirname, '../../src/content-script'))
        )
      if (shouldReload) {
        sseStream.write(
          {
            data: {
              action: 'reload extension and refresh current page'
            },
            event: 'compiled successfully'
          },
          'utf-8',
          (err) => {
            if (err) {
              console.error(err)
            }
          }
        )
      }
    }, 1000)

    const plugin = (stats) => {
      if (!closed) {
        compileDoneHook(stats)
      }
    }
    compiler.hooks.done.tap('extension-auto-reload-plugin', plugin)

    res.on('close', () => {
      closed = true
      sseStream.unpipe(res)
    })

    next()
  }
}

module.exports = {
  extensionAutoReload
}
