/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/* eslint-disable no-case-declarations */
import {
  LanguageSupport,
  StreamLanguage,
  StreamParser,
} from '@codemirror/language';

import {CodeBlockMode} from './index';

function wrapLegacy(parser: StreamParser<unknown>): LanguageSupport {
  return new LanguageSupport(StreamLanguage.define(parser));
}

async function handleLegacyModes(mode: CodeBlockMode) {
  switch (mode) {
    case 'csharp':
    case 'dart':
    case 'kotlin':
    case 'objectiveC':
    case 'objectiveCpp':
    case 'scala':
      const {[mode]: callable} = await import(
        '@codemirror/legacy-modes/mode/clike'
      );

      return () => wrapLegacy(callable);

    case 'clojure':
    case 'clojureScript':
      const {clojure} = await import('@codemirror/legacy-modes/mode/clojure');
      return () => wrapLegacy(clojure);

    case 'cmake':
      const {cmake} = await import('@codemirror/legacy-modes/mode/cmake');
      return () => wrapLegacy(cmake);

    case 'coffeeScript':
      const {coffeeScript} = await import(
        '@codemirror/legacy-modes/mode/coffeescript'
      );
      return () => wrapLegacy(coffeeScript);

    case 'commonLisp':
      const {commonLisp} = await import(
        '@codemirror/legacy-modes/mode/commonlisp'
      );
      return () => wrapLegacy(commonLisp);

    case 'crystal':
      const {crystal} = await import('@codemirror/legacy-modes/mode/crystal');
      return () => wrapLegacy(crystal);

    case 'd':
      const {d} = await import('@codemirror/legacy-modes/mode/d');
      return () => wrapLegacy(d);

    case 'diff':
      const {diff} = await import('@codemirror/legacy-modes/mode/diff');
      return () => wrapLegacy(diff);

    case 'dockerFile':
      const {dockerFile} = await import(
        '@codemirror/legacy-modes/mode/dockerfile'
      );
      return () => wrapLegacy(dockerFile);

    case 'elm':
      const {elm} = await import('@codemirror/legacy-modes/mode/elm');
      return () => wrapLegacy(elm);

    case 'erlang':
      const {erlang} = await import('@codemirror/legacy-modes/mode/erlang');
      return () => wrapLegacy(erlang);

    case 'fortran':
      const {fortran} = await import('@codemirror/legacy-modes/mode/fortran');
      return () => wrapLegacy(fortran);

    case 'fSharp':
      const {fSharp} = await import('@codemirror/legacy-modes/mode/mllike');
      return () => wrapLegacy(fSharp);

    case 'go':
      const {go} = await import('@codemirror/legacy-modes/mode/go');
      return () => wrapLegacy(go);

    case 'groovy':
      const {groovy} = await import('@codemirror/legacy-modes/mode/groovy');
      return () => wrapLegacy(groovy);

    case 'haskell':
      const {haskell} = await import('@codemirror/legacy-modes/mode/haskell');
      return () => wrapLegacy(haskell);

    case 'haxe':
      const {haxe} = await import('@codemirror/legacy-modes/mode/haxe');
      return () => wrapLegacy(haxe);

    case 'http':
      const {http} = await import('@codemirror/legacy-modes/mode/http');
      return () => wrapLegacy(http);

    case 'jsonld':
      const {jsonld} = await import('@codemirror/legacy-modes/mode/javascript');
      return () => wrapLegacy(jsonld);

    case 'julia':
      const {julia} = await import('@codemirror/legacy-modes/mode/julia');
      return () => wrapLegacy(julia);

    case 'less':
      const {less} = await import('@codemirror/legacy-modes/mode/css');
      return () => wrapLegacy(less);

    case 'liveScript':
      const {liveScript} = await import(
        '@codemirror/legacy-modes/mode/livescript'
      );
      return () => wrapLegacy(liveScript);

    case 'lua':
      const {lua} = await import('@codemirror/legacy-modes/mode/lua');
      return () => wrapLegacy(lua);

    case 'mathematica':
      const {mathematica} = await import(
        '@codemirror/legacy-modes/mode/mathematica'
      );
      return () => wrapLegacy(mathematica);

    case 'nginx':
      const {nginx} = await import('@codemirror/legacy-modes/mode/nginx');
      return () => wrapLegacy(nginx);

    case 'oCaml':
      const {oCaml} = await import('@codemirror/legacy-modes/mode/mllike');
      return () => wrapLegacy(oCaml);

    case 'octave':
      const {octave} = await import('@codemirror/legacy-modes/mode/octave');
      return () => wrapLegacy(octave);

    case 'pascal':
      const {pascal} = await import('@codemirror/legacy-modes/mode/pascal');
      return () => wrapLegacy(pascal);

    case 'perl':
      const {perl} = await import('@codemirror/legacy-modes/mode/perl');
      return () => wrapLegacy(perl);

    case 'powerShell':
      const {powerShell} = await import(
        '@codemirror/legacy-modes/mode/powershell'
      );
      return () => wrapLegacy(powerShell);

    case 'puppet':
      const {puppet} = await import('@codemirror/legacy-modes/mode/puppet');
      return () => wrapLegacy(puppet);

    case 'q':
      const {q} = await import('@codemirror/legacy-modes/mode/q');
      return () => wrapLegacy(q);

    case 'r':
      const {r} = await import('@codemirror/legacy-modes/mode/r');
      return () => wrapLegacy(r);

    case 'ruby':
      const {ruby} = await import('@codemirror/legacy-modes/mode/ruby');
      return () => wrapLegacy(ruby);

    case 'sass':
      const {sass} = await import('@codemirror/legacy-modes/mode/sass');
      return () => wrapLegacy(sass);

    case 'scheme':
      const {scheme} = await import('@codemirror/legacy-modes/mode/scheme');
      return () => wrapLegacy(scheme);

    case 'sCSS':
      const {sCSS} = await import('@codemirror/legacy-modes/mode/css');
      return () => wrapLegacy(sCSS);

    case 'shell':
      const {shell} = await import('@codemirror/legacy-modes/mode/shell');
      return () => wrapLegacy(shell);

    case 'smalltalk':
      const {smalltalk} = await import(
        '@codemirror/legacy-modes/mode/smalltalk'
      );
      return () => wrapLegacy(smalltalk);

    case 'solr':
      const {solr} = await import('@codemirror/legacy-modes/mode/solr');
      return () => wrapLegacy(solr);

    case 'sml':
      const {sml} = await import('@codemirror/legacy-modes/mode/mllike');
      return () => wrapLegacy(sml);

    case 'stylus':
      const {stylus} = await import('@codemirror/legacy-modes/mode/stylus');
      return () => wrapLegacy(stylus);

    case 'swift':
      const {swift} = await import('@codemirror/legacy-modes/mode/swift');
      return () => wrapLegacy(swift);

    case 'stex':
      const {stex} = await import('@codemirror/legacy-modes/mode/stex');
      return () => wrapLegacy(stex);

    case 'tcl':
      const {tcl} = await import('@codemirror/legacy-modes/mode/tcl');
      return () => wrapLegacy(tcl);

    case 'toml':
      const {toml} = await import('@codemirror/legacy-modes/mode/toml');
      return () => wrapLegacy(toml);

    case 'velocity':
      const {velocity} = await import('@codemirror/legacy-modes/mode/velocity');
      return () => wrapLegacy(velocity);

    case 'verilog':
      const {verilog} = await import('@codemirror/legacy-modes/mode/verilog');
      return () => wrapLegacy(verilog);

    case 'yaml':
      const {yaml} = await import('@codemirror/legacy-modes/mode/yaml');
      return () => wrapLegacy(yaml);

    default:
      return () => [];
  }
}

export const getModeLoader = async (mode: CodeBlockMode) => {
  switch (mode) {
    case 'javascript':
    case 'typescript':
    case 'jsx':
    case 'tsx':
      const {javascript} = await import('@codemirror/lang-javascript');

      return () =>
        javascript({
          jsx: ['jsx', 'tsx'].includes(mode),
          typescript: ['typescript', 'tsx'].includes(mode),
        });
    case 'html':
      const {html} = await import('@codemirror/lang-html');
      return () =>
        html({
          autoCloseTags: true,
          matchClosingTags: true,
          selfClosingTags: false,
        });
    case 'c':
    case 'cpp':
      const {cpp} = await import('@codemirror/lang-cpp');
      return () => cpp();
    case 'css':
      const {css} = await import('@codemirror/lang-css');
      return () => css();
    case 'java':
      const {java} = await import('@codemirror/lang-java');
      return () => java();
    case 'json':
      const {json} = await import('@codemirror/lang-json');
      return () => json();
    case 'markdown':
      const {markdown} = await import('@codemirror/lang-markdown');
      return () => markdown();
    case 'php':
      const {php} = await import('@codemirror/lang-php');
      return () => php();
    case 'python':
      const {python} = await import('@codemirror/lang-python');
      return () => python();
    case 'rust':
      const {rust} = await import('@codemirror/lang-rust');
      return () => rust();
    case 'sql':
    case 'mysql':
    case 'mariasql':
    case 'postgresql':
    case 'cassandra':
    case 'mssql':
    case 'plsql':
    case 'sqlite':
      const {
        sql,
        MySQL,
        MariaSQL,
        PostgreSQL,
        Cassandra,
        MSSQL,
        StandardSQL,
        PLSQL,
        SQLite,
      } = await import('@codemirror/lang-sql');

      let dialect = StandardSQL;

      switch (mode) {
        case 'cassandra':
          dialect = Cassandra;
          break;
        case 'mariasql':
          dialect = MariaSQL;
          break;
        case 'mssql':
          dialect = MSSQL;
          break;
        case 'postgresql':
          dialect = PostgreSQL;
          break;
        case 'mysql':
          dialect = MySQL;
          break;
        case 'sqlite':
          dialect = SQLite;
          break;
        case 'plsql':
          dialect = PLSQL;
          break;
        default:
          break;
      }

      return () =>
        sql({
          dialect,
          upperCaseKeywords: true,
        });
    case 'wast':
      const {wast} = await import('@codemirror/lang-wast');
      return () => wast();
    case 'xml':
      const {xml} = await import('@codemirror/lang-xml');
      return () => xml();
    default:
      return handleLegacyModes(mode);
  }
};
