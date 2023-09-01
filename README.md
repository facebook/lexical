# INFO
This repository is for [keepwork](https://keepwork.com)


# branch description
- **main**: sync with the [facebook/lexical](https://github.com/facebook/lexical)
- **keepwork-main**: imported by keepwork repository
- **feature/***: 
  - created from main
  - write feature code
  - merge into keepwork-main
  - pull request into facebook/lexical if needed

# how to used in keepwork repository
1. create a branch `feature/*` from main
2. write feature code
3. merge into keepwork-main
4. `npm run prepare-release`
5. git push 
6. in keepwork reposity
    1. `npm install https://gh2npm.vercel.app/api/totfook/lexical-for-keepword/packages/lexical-markdown/npm?branch=keepwork-main`