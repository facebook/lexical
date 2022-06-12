chrome.runtime.onMessage.addListener((request, _sender, sendResp) => {
  const shouldRefresh = request.from === 'background' && request.action === 'refresh current page'
  if (shouldRefresh) {
    sendResp({ action: 'reload extension', from: 'content script' })
    setTimeout(() => window.location.reload(), 100)
  }
})

console.log('injectGlobalHook!!')
