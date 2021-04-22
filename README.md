# Outline

Outline is a fast, light-weight, extensible library for building rich text editors on the web.

## Environment setup

1. Clone this repository

2. Install dependencies
   - `npm install --legacy-peer-deps`

3. Start local server and run tests
   - `npm run start`
   - `npm run test`
     - The server needs to be running for the e2e tests

### Optional but recommended, use VSCode for development

1.  Download and install VSCode
    - Download from [here](https://code.visualstudio.com/download) (it’s recommended to use the unmodified version)

2. Install extensions
   - [Flow Language Support](https://marketplace.visualstudio.com/items?itemName=flowtype.flow-for-vscode)
     - Make sure to follow the setup steps in the README
   - [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
     - Set prettier as the default formatter in `editor.defaultFormatter`
     - Optional: set format on save `editor.formatOnSave`
   - [ESlint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)


## Contributing

1. Create a new branch
   - `git checkout -b my-new-branch`
2. Commit your changes
   - `git commit -a -m 'Description of the changes'`
     - There are many ways of doing this and this is just a suggestion
3. Push your branch to Github
   - `git push origin my-new-branch`
4. Go to the repository page in Github and click on "Compare & pull request"
   - The [Github CLI](https://cli.github.com/manual/gh_pr_create) allows you to skip the web interface for this step (and much more)

## Running tests

* `npm run test` runs e2e and unit tests.
* `npm run test-e2e` runs only e2e tests.
* `npm run test-unit` runs only unit tests.
