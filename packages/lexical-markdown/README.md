# `@lexical/markdown`

This package contains markdown helpers and functionality for Lexical.

The package focuses on markdown conversion.

The package has 3 main functions:

1. It imports a string and converts into Lexical and then converts markup within the imported nodes. See convertFromPlainTextUtils.js
2. It exports Lexical to a plain text with markup. See convertToPlainTextUtils.js
3. It autoformats newly typed text by converting the markdown + some trigger to the appropriate stylized text. See autoFormatUtils.js
