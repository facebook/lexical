for package in 'lexical-file' \
            'lexical-list' \
            'lexical-react' \
            'lexical-table' \
            'lexical-yjs' \
            'lexical-clipboard' \
            'lexical' \
            'lexical-selection' \
            'lexical-text' \
            'lexical-offset' \
            'lexical-utils'
do
  gen-flow-files "./packages/${package}/src" --out-dir "./packages/${package}/dist"
done