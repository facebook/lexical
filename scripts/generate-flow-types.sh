for package in  'lexical' \
                'lexical-react' \
                'lexical-yjs' \
                'lexical-list' \
                'lexical-table' \
                'lexical-file' \
                'lexical-clipboard' \
                'lexical-hashtag' \
                'lexical-history' \
                'lexical-selection' \
                'lexical-offset' \
                'lexical-code' \
                'lexical-plain-text' \
                'lexical-rich-text' \
                'lexical-utils' \
                'lexical-dragon' \
                'lexical-overflow' \
                'lexical-link' \
                'lexical-text' \
                'lexical-markdown' \
                'lexical-mark'
do
  gen-flow-files "./packages/${package}/src" --out-dir "./packages/${package}/dist"
done