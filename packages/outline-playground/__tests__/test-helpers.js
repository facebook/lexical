async function select(page, anchorPath, anchorOffset, focusPath, focusOffset) {
  await page.evaluate(
    async (anchorPath, anchorOffset, focusPath, focusOffset) => {
      function getNodeFromPath(path) {
        const editorElement = document.querySelector('div.editor');
        let node = editorElement;
        for (let i = 0; i < path.length; i++) {
          node = node.childNodes[path[i]];
        }
        return node;
      }

      const selection = window.getSelection();
      const anchorNode = getNodeFromPath(anchorPath);
      const focusNode = getNodeFromPath(focusPath);
      selection.setBaseAndExtent(
        anchorNode,
        anchorOffset,
        focusNode,
        focusOffset,
      );

      await new Promise((resolve) => {
        // We do this, as selection is async and we need to wait before
        // selection has been invoked before we can continue. Oddly,
        // I couldn't add a selectionchange listener and continue on that
        // firing. I assume it's a bug with Puppeteer. So for now, I've
        // gone with 20ms, which should cover us.
        setTimeout(() => {
          resolve();
        }, 20);

        const selection = window.getSelection();
        const anchorNode = getNodeFromPath(anchorPath);
        const focusNode = getNodeFromPath(focusPath);
        selection.setBaseAndExtent(
          anchorNode,
          anchorOffset,
          focusNode,
          focusOffset,
        );
      });
    },
    anchorPath,
    anchorOffset,
    focusPath,
    focusOffset,
  );
}

async function dispatchCompositionEvent(page, type, data) {
  await page.evaluate(
    (type, data) => {
      const editorElement = document.querySelector('div.editor');
      const compositionEvent = new CompositionEvent(type, {data});
      editorElement.dispatchEvent(compositionEvent);
    },
    type,
    data,
  );
}

async function composition(page, cb) {
  const mockedPage = {
    evaluate: async (...args) => {
      return page.evaluate(...args);
    },
    keyboard: {
      async up(key) {
        if (
          key === 'Alt' ||
          key === 'Meta' ||
          key === 'Ctrl' ||
          key === 'Shift'
        ) {
          await page.keyboard.up(key);
        }
      },
      async down(key) {
        if (
          key === 'Alt' ||
          key === 'Meta' ||
          key === 'Ctrl' ||
          key === 'Shift'
        ) {
          await page.keyboard.down(key);
        }
      },
    },
  };
  const composedText = await page.evaluate(() => {
    const selection = window.getSelection();
    return selection.anchorNode.nodeValue;
  });
  const update = async (data) => {
    page.evaluate(
      (data, composedText) => {
        const selection = window.getSelection();
        const anchorOffset = selection.anchorOffset;
        const anchorNode = selection.anchorNode;
        const nextComposedText =
          composedText.slice(0, anchorOffset) +
          data +
          composedText.slice(anchorOffset, composedText.length - anchorOffset);
        anchorNode.nodeValue = nextComposedText;
      },
      data,
      composedText,
    );
    dispatchCompositionEvent(page, 'compositionupdate', data);
  };
  const end = async (data) => {
    dispatchCompositionEvent(page, 'compositionend', data);
  };

  dispatchCompositionEvent(page, 'compositionstart');
  await cb(mockedPage, update, end);
}

async function debug(page) {
  // For debugging
  await page.evaluate(async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 5000);
    });
  });
}

async function keydown(page, key, cancelled) {
  if (cancelled) {
    await page.evaluate((key) => {
      const editorElement = document.querySelector('div.editor');
      const compositionEvent = new KeyboardEvent('keydown', {key});
      editorElement.dispatchEvent(compositionEvent);
    }, key);
  } else {
    await page.keyboard.down(key);
  }
}

async function expectHTML(page, expected) {
  const html = await page.evaluate(() => {
    const editorElement = document.querySelector('div.editor');
    return editorElement.innerHTML;
  });
  if (html !== expected) {
    throw new Error('expectHTML: actual HTML did not match expected HTML');
  }
}

module.exports = {
  debug,
  composition,
  select,
  keydown,
  expectHTML,
};
