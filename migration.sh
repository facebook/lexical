#!/usr/bin/env bash
DIRECTORIES=(
  "lexical-selection"
  "lexical-table"
  "lexical-text"
  "lexical-utils"
)

for directory in ${DIRECTORIES[@]}; do
    # Preserve commit history
    # for i in $(find ./packages/$directory -iname "*.js" -not -path "*dist*");
    #     do git mv "$i" "$(echo $i | rev | cut -d '.' -f 2- | rev).ts";
    # done
    # for i in $(find ./packages/$directory -iname "*.jsx" -not -path "*dist*");
    #     do git mv "$i" "$(echo $i | rev | cut -d '.' -f 2- | rev).tsx";
    # done

    # for i in $(find ./packages/$directory -iname "*.ts" -not -path "*dist*" -not -path "flow");
    #     do sed -i "" "s/boolean %checks/node is ManuallyFindAndReplace/g" $i && sed -i "" "s/: LexicalNode>/ = LexicalNode>/g" $i;
    # done
    # for i in $(find ./packages/$directory -iname "*.tsx" -not -path "*dist*" -not -path "flow");
    #     do sed -i "" "s/boolean %checks/node is ManuallyFindAndReplace/g" $i && sed -i "" "s/: LexicalNode>/ = LexicalNode>/g" $i;
    # done

    for i in $(find ./packages/$directory -iname "*.ts" -not -path "*dist*" -not -path "flow");
        do sed -i "" "1s|^|/**\n * Copyright (c) Meta Platforms, Inc. and affiliates.\n *\n * This source code is licensed under the MIT license found in the\n * LICENSE file in the root directory of this source tree.\n *\n */\n\n|g" $i;
    done
    
    # npx @khanacademy/flow-to-ts --write "./packages/$directory/**/{!*.d.ts,*.ts}";
    # npx @khanacademy/flow-to-ts --write "./packages/$directory/**/*.tsx";
done

npm run prettier:fix;