/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import BrowserOnly from '@docusaurus/BrowserOnly';
import {useEffect, useMemo, useState} from 'react';

export default function ErrorCodePage() {
  return (
    <div className="flex flex-col pt-4 pb-8">
      <p>
        In the minified production build of Lexical, we avoid sending down full
        error messages in order to reduce the number of bytes sent over the
        wire.
      </p>

      <p>
        We highly recommend using the development build locally when debugging
        your app since it tracks additional debug info and provides helpful
        warnings about potential problems in your apps, but if you encounter an
        exception while using the production build, this page will reassemble
        the original text of the error.
      </p>

      <BrowserOnly>{() => <ErrorFinder />}</BrowserOnly>
    </div>
  );
}

type ErrorCodes = Record<string, string>;

interface ErrorInfo {
  code: string;
  description: string;
}

function ErrorFinder() {
  const [codes, setCodes] = useState<ErrorCodes | null>(null);

  useEffect(() => {
    if (!process.env.FB_INTERNAL) {
      import('../../../../scripts/error-codes/codes.json').then((module) =>
        setCodes(module as unknown as ErrorCodes),
      );
    }
  }, []);

  const error = useMemo<ErrorInfo | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code === null) {
      return null;
    }
    if (codes == null) {
      return null;
    }
    let description = codes[code];
    if (description === undefined) {
      return null;
    }
    for (const value of params.getAll('v')) {
      description = description.replace('%s', value);
    }
    return {code, description};
  }, [codes]);

  if (error !== null) {
    return (
      <>
        <h2>Error code #{error.code}</h2>
        <div className="bg-[#ffbaba] p-4 text-[#a70000]">
          {error.description}
        </div>
      </>
    );
  } else {
    return (
      <p>
        When you encounter an error, you'll receive a link to this page for that
        specific error and we'll show you the full error text.
      </p>
    );
  }
}
