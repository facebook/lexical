for package in 'lexical-file' \
            'lexical-helpers' \
            'lexical-list' \
            'lexical-react' \
            'lexical-table' \
            'lexical-yjs' \
            'lexical-clipboard' \
            'lexical'
do
  gen-flow-files "./packages/${package}/src" --out-dir "./packages/${package}/dist"
done