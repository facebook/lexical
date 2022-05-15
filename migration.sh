#!/usr/bin/env bash
DIRECTORIES=(
    "lexical-react"
)

for directory in ${DIRECTORIES[@]}; do
    # Preserve commit history
    for i in $(find ./packages/$directory -iname "*.js" -not -path "*dist*");
        do git mv "$i" "$(echo $i | rev | cut -d '.' -f 2- | rev).ts";
    done
    for i in $(find ./packages/$directory -iname "*.jsx" -not -path "*dist*");
        do git mv "$i" "$(echo $i | rev | cut -d '.' -f 2- | rev).tsx";
    done

    for i in $(find ./packages/$directory -iname "*.ts" -not -path "*dist*" -not -path "flow");
        do sed -i "" "s/boolean %checks/node is FindAndReplace/g" $i;
    done
    for i in $(find ./packages/$directory -iname "*.tsx" -not -path "*dist*" -not -path "flow");
        do sed -i "" "s/boolean %checks/node is FindAndReplace/g" $i;
    done
    
    npx @khanacademy/flow-to-ts --write --prettier "./packages/$directory/**/{!*.d.ts,*.ts}";
    npx @khanacademy/flow-to-ts --write --prettier "./packages/$directory/**/*.tsx";
done

# npm run prettier:fix;