/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {
  OutlineEditor,
  ParsedTextNode,
  NodeKey,
  EditorThemeClasses,
} from 'outline';

import React, {useCallback, useLayoutEffect, useMemo, useRef} from 'react';
import {useEffect, useState} from 'react';
// $FlowFixMe
import {createPortal} from 'react-dom';
import {TextNode} from 'outline';
import useEvent from './useEvent';

const mentionStyle = 'background-color: rgba(24, 119, 232, 0.2)';

const PUNCTUATION =
  '\\.,\\+\\*\\?\\$\\@\\|#{}\\(\\)\\^\\-\\[\\]\\\\/!%\'"~=<>_:;';
const NAME = '\\b[A-Z][^\\s' + PUNCTUATION + ']';

const DocumentMentionsRegex = {
  PUNCTUATION,
  NAME,
};

const CapitalizedNameMentionsRegex = new RegExp(
  '(^|[^#])((?:' + DocumentMentionsRegex.NAME + '{' + 1 + ',})$)',
);

const PUNC = DocumentMentionsRegex.PUNCTUATION;

const TRIGGERS = ['@', '\\uff20'].join('');

// Chars we expect to see in a mention (non-space, non-punctuation).
const VALID_CHARS = '[^' + TRIGGERS + PUNC + '\\s]';

// Non-standard series of chars. Each series must be preceded and followed by
// a valid char.
const VALID_JOINS =
  '(?:' +
  '\\.[ |$]|' + // E.g. "r. " in "Mr. Smith"
  ' |' + // E.g. " " in "Josh Duck"
  '[' +
  PUNC +
  ']|' + // E.g. "-' in "Salier-Hellendag"
  ')';

const LENGTH_LIMIT = 75;

const AtSignMentionsRegex = new RegExp(
  '(^|\\s|\\()(' +
    '[' +
    TRIGGERS +
    ']' +
    '((?:' +
    VALID_CHARS +
    VALID_JOINS +
    '){0,' +
    LENGTH_LIMIT +
    '})' +
    ')$',
);

// 50 is the longest alias length limit.
const ALIAS_LENGTH_LIMIT = 50;

// Regex used to match alias.
const AtSignMentionsRegexAliasRegex = new RegExp(
  '(^|\\s|\\()(' +
    '[' +
    TRIGGERS +
    ']' +
    '((?:' +
    VALID_CHARS +
    '){0,' +
    ALIAS_LENGTH_LIMIT +
    '})' +
    ')$',
);

// At most, 5 suggestions are shown in the popup.
const SUGGESTION_LIST_LENGTH_LIMIT = 5;

const mentionsCache = new Map();

function useMentionLookupService(mentionString) {
  const [results, setResults] = useState<Array<string> | null>(null);

  useEffect(() => {
    const cachedResults = mentionsCache.get(mentionString);

    if (cachedResults === null) {
      return;
    } else if (cachedResults !== undefined) {
      setResults(cachedResults);
      return;
    }

    mentionsCache.set(mentionString, null);
    dummyLookupService.search(mentionString, (newResults) => {
      mentionsCache.set(mentionString, newResults);
      setResults(newResults);
    });
  }, [mentionString]);

  return results;
}

function MentionsTypeaheadItem({
  index,
  isHovered,
  isSelected,
  onClick,
  onMouseEnter,
  onMouseLeave,
  result,
}: {
  index: number,
  isHovered: boolean,
  onClick: Function,
  onMouseEnter: Function,
  onMouseLeave: Function,
  result: string,
  isSelected: boolean,
}) {
  const liRef = useRef(null);

  let className = 'item';
  if (isSelected) {
    className += ' selected';
  }
  if (isHovered) {
    className += ' hovered';
  }

  return (
    <li
      key={result}
      tabIndex={-1}
      className={className}
      ref={liRef}
      role="option"
      aria-selected={isSelected}
      id={'typeahead-item-' + index}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}>
      {result}
    </li>
  );
}

function MentionsTypeahead({
  close,
  editor,
  match,
  registerKeys,
}: {
  close: () => void,
  editor: OutlineEditor,
  match: MentionMatch,
  registerKeys: (keys: any) => () => void,
}): React$Node {
  const divRef = useRef(null);
  const results = useMentionLookupService(match.matchingString);
  const [selectedIndex, setSelectedIndex] = useState<null | number>(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  useEffect(() => {
    const div = divRef.current;
    if (results !== null && div !== null) {
      const res = editor.getViewModel().read((view) => {
        const selection = view.getSelection();

        if (selection !== null && selection.isCaret()) {
          const range = document.createRange();
          const mentionsElement = editor.getElementByKey(selection.anchorKey);
          if (mentionsElement === null) {
            return null;
          }
          const anchorTextNode = mentionsElement.firstChild;
          if (anchorTextNode) {
            try {
              range.setStart(anchorTextNode, match.leadOffset);
              range.setEnd(anchorTextNode, selection.anchorOffset);
            } catch (e) {
              return null;
            }
          }
          return [range, mentionsElement];
        }
        return null;
      });
      if (res) {
        const [range, mentionsElement] = res;
        const {left, top, height} = range.getBoundingClientRect();
        div.style.top = `${top + height + 2}px`;
        div.style.left = `${left - 14}px`;
        mentionsElement.setAttribute('aria-controls', 'mentions-typeahead');

        return () => {
          mentionsElement.removeAttribute('aria-controls');
        };
      }
    }
  }, [close, editor, match, results]);

  const applyCurrentSelected = useCallback(() => {
    if (results === null || selectedIndex === null) {
      return;
    }
    const selectedResult = results[selectedIndex];
    close();
    editor.update((view) => {
      const selection = view.getSelection();
      if (match && selection && selection.isCaret()) {
        const {leadOffset, replaceableString} = match;
        const anchorNode = selection.getAnchorNode();
        if (anchorNode.getTextContent().indexOf(replaceableString) !== -1) {
          const splitNodes = anchorNode.splitText(
            leadOffset,
            leadOffset + replaceableString.length,
          );
          const target = leadOffset === 0 ? splitNodes[0] : splitNodes[1];
          const mentionNode = createMentionNode(selectedResult);
          target.replace(mentionNode);
          mentionNode.selectNext(0, 0);
          mentionNode.getParentOrThrow().normalizeTextNodes(true);
        }
      }
    });
  }, [close, editor, match, results, selectedIndex]);

  const updateSelectedIndex = useCallback(
    (index) => {
      const rootElem = editor.getRootElement();
      if (rootElem !== null) {
        rootElem.setAttribute(
          'aria-activedescendant',
          'typeahead-item-' + index,
        );
        setSelectedIndex(index);
      }
    },
    [editor],
  );

  useEffect(() => {
    return () => {
      const rootElem = editor.getRootElement();
      if (rootElem !== null) {
        rootElem.removeAttribute('aria-activedescendant');
      }
    };
  }, [editor]);

  useLayoutEffect(() => {
    if (results === null) {
      setSelectedIndex(null);
    } else if (selectedIndex === null) {
      updateSelectedIndex(0);
    }
  }, [results, selectedIndex, updateSelectedIndex]);

  useEffect(() => {
    return registerKeys({
      ArrowDown(event, view) {
        if (results !== null && selectedIndex !== null) {
          if (
            selectedIndex < SUGGESTION_LIST_LENGTH_LIMIT - 1 &&
            selectedIndex !== results.length - 1
          ) {
            updateSelectedIndex(selectedIndex + 1);
          }
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      ArrowUp(event, view) {
        if (results !== null && selectedIndex !== null) {
          if (selectedIndex !== 0) {
            updateSelectedIndex(selectedIndex - 1);
          }
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      Escape(event, view) {
        if (results === null || selectedIndex === null) {
          return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        close();
      },
      Tab(event, view) {
        if (results === null || selectedIndex === null) {
          return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        applyCurrentSelected();
      },
      Enter(event, view) {
        if (results === null || selectedIndex === null) {
          return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        applyCurrentSelected();
      },
    });
  }, [
    applyCurrentSelected,
    close,
    registerKeys,
    results,
    selectedIndex,
    updateSelectedIndex,
  ]);

  if (results === null) {
    return null;
  }

  return (
    <div
      aria-label="Suggested mentions"
      id="mentions-typeahead"
      ref={divRef}
      role="listbox">
      <ul>
        {results.slice(0, SUGGESTION_LIST_LENGTH_LIMIT).map((result, i) => (
          <MentionsTypeaheadItem
            index={i}
            isHovered={i === hoveredIndex}
            isSelected={i === selectedIndex}
            onClick={() => {
              setSelectedIndex(i);
              applyCurrentSelected();
            }}
            onMouseEnter={() => {
              setHoveredIndex(i);
            }}
            onMouseLeave={() => {
              setHoveredIndex(null);
            }}
            key={result}
            result={result}
          />
        ))}
      </ul>
    </div>
  );
}

type MentionMatch = {
  leadOffset: number,
  matchingString: string,
  replaceableString: string,
};

function checkForCapitalizedNameMentions(
  text,
  minMatchLength,
): MentionMatch | null {
  const match = CapitalizedNameMentionsRegex.exec(text);
  if (match !== null) {
    // The strategy ignores leading whitespace but we need to know it's
    // length to add it to the leadOffset
    const maybeLeadingWhitespace = match[1];

    const matchingString = match[2];
    if (matchingString != null && matchingString.length >= minMatchLength) {
      return {
        leadOffset: match.index + maybeLeadingWhitespace.length,
        matchingString,
        replaceableString: matchingString,
      };
    }
  }
  return null;
}

function checkForAtSignMentions(text, minMatchLength): MentionMatch | null {
  let match = AtSignMentionsRegex.exec(text);

  if (match === null) {
    match = AtSignMentionsRegexAliasRegex.exec(text);
  }
  if (match !== null) {
    // The strategy ignores leading whitespace but we need to know it's
    // length to add it to the leadOffset
    const maybeLeadingWhitespace = match[1];

    const matchingString = match[3];
    if (matchingString.length >= minMatchLength) {
      return {
        leadOffset: match.index + maybeLeadingWhitespace.length,
        matchingString,
        replaceableString: match[2],
      };
    }
  }
  return null;
}

function getPossibleMentionMatch(text): MentionMatch | null {
  const match = checkForAtSignMentions(text, 1);
  return match === null ? checkForCapitalizedNameMentions(text, 3) : match;
}

export default function useMentions(editor: OutlineEditor): React$Node {
  const [mentionMatch, setMentionMatch] = useState<MentionMatch | null>(null);
  const hasMentionRef = useRef(false);
  const registeredKeys: Set<any> = useMemo(() => new Set(), []);
  const registerKeys = useMemo(
    () => (keys) => {
      registeredKeys.add(keys);
      return () => {
        registeredKeys.delete(keys);
      };
    },
    [registeredKeys],
  );

  useEffect(() => {
    editor.registerNodeType('mention', MentionNode);
  }, [editor]);

  useEffect(() => {
    const textNodeTransform = (node, view) => {
      const selection = view.getSelection();
      if (
        selection === null ||
        selection.getAnchorNode() !== node ||
        !node.isSimpleText()
      ) {
        return;
      }
      const anchorOffset = selection.anchorOffset;
      const text = node.getTextContent().slice(0, anchorOffset);

      if (text !== '') {
        const match = getPossibleMentionMatch(text);
        if (match !== null) {
          hasMentionRef.current = true;
          setMentionMatch(match);
          return;
        }
      }
      if (hasMentionRef.current) {
        hasMentionRef.current = false;
        setMentionMatch(null);
      }
    };
    return editor.addTextNodeTransform(textNodeTransform);
  }, [editor]);

  const onKeyDown = useCallback(
    (event, view) => {
      if (editor.isComposing()) {
        return;
      }
      const key = event.key;
      registeredKeys.forEach((registeredKeyMap) => {
        const controlFunction = registeredKeyMap[key];
        if (key === 'Enter' && event.keyCode !== 13) {
          return;
        }
        if (typeof controlFunction === 'function') {
          controlFunction(event, view);
        }
      });
    },
    [editor, registeredKeys],
  );

  const closeTypeahead = useCallback(() => {
    hasMentionRef.current = false;
    setMentionMatch(null);
  }, []);

  useEvent(editor, 'keydown', onKeyDown);

  return mentionMatch === null || editor === null
    ? null
    : createPortal(
        <MentionsTypeahead
          close={closeTypeahead}
          match={mentionMatch}
          editor={editor}
          registerKeys={registerKeys}
        />,
        document.body,
      );
}

type ParsedMentionNode = {
  ...ParsedTextNode,
  __mention: string,
};

class MentionNode extends TextNode {
  __mention: string;

  constructor(mentionName: string, key?: NodeKey, text?: string) {
    super(text ?? mentionName, key);
    this.__mention = mentionName;
    this.__type = 'mention';
  }
  serialize(): ParsedMentionNode {
    const {__mention} = this;
    return {
      ...super.serialize(),
      __mention,
    };
  }
  deserialize(data: $FlowFixMe) {
    const {__mention, ...rest} = data;
    super.deserialize(rest);
    this.__mention = __mention;
  }
  clone() {
    return new MentionNode(this.__mention, this.__key, this.__text);
  }
  createDOM(editorThemeClasses: EditorThemeClasses) {
    const dom = super.createDOM(editorThemeClasses);
    dom.style.cssText = mentionStyle;
    dom.className = 'mention';
    return dom;
  }
}

function createMentionNode(mentionName: string): MentionNode {
  return new MentionNode(mentionName).makeSegmented().makeDirectionless();
}

const dummyLookupService = {
  search(
    string: string,
    callback: (results: Array<string> | null) => void,
  ): void {
    setTimeout(() => {
      const results = dummyMentionsData.filter((mention) =>
        mention.toLowerCase().includes(string.toLowerCase()),
      );
      if (results.length === 0) {
        callback(null);
      } else {
        callback(results);
      }
    }, 500);
  },
};

const dummyMentionsData = [
  'Aayla Secura',
  'Adi Gallia',
  'Admiral Dodd Rancit',
  'Admiral Firmus Piett',
  'Admiral Gial Ackbar',
  'Admiral Ozzel',
  'Admiral Raddus',
  'Admiral Terrinald Screed',
  'Admiral Trench',
  'Admiral U.O. Statura',
  'Agen Kolar',
  'Agent Kallus',
  'Aiolin and Morit Astarte',
  'Aks Moe',
  'Almec',
  'Alton Kastle',
  'Amee',
  'AP-5',
  'Armitage Hux',
  'Artoo',
  'Arvel Crynyd',
  'Asajj Ventress',
  'Aurra Sing',
  'AZI-3',
  'Bala-Tik',
  'Barada',
  'Bargwill Tomder',
  'Baron Papanoida',
  'Barriss Offee',
  'Baze Malbus',
  'Bazine Netal',
  'BB-8',
  'BB-9E',
  'Ben Quadinaros',
  'Berch Teller',
  'Beru Lars',
  'Bib Fortuna',
  'Biggs Darklighter',
  'Black Krrsantan',
  'Bo-Katan Kryze',
  'Boba Fett',
  'Bobbajo',
  'Bodhi Rook',
  'Borvo the Hutt',
  'Boss Nass',
  'Bossk',
  'Breha Antilles-Organa',
  'Bren Derlin',
  'Brendol Hux',
  'BT-1',
  'C-3PO',
  'C1-10P',
  'Cad Bane',
  'Caluan Ematt',
  'Captain Gregor',
  'Captain Phasma',
  'Captain Quarsh Panaka',
  'Captain Rex',
  'Carlist Rieekan',
  'Casca Panzoro',
  'Cassian Andor',
  'Cassio Tagge',
  'Cham Syndulla',
  'Che Amanwe Papanoida',
  'Chewbacca',
  'Chi Eekway Papanoida',
  'Chief Chirpa',
  'Chirrut Îmwe',
  'Ciena Ree',
  'Cin Drallig',
  'Clegg Holdfast',
  'Cliegg Lars',
  'Coleman Kcaj',
  'Coleman Trebor',
  'Colonel Kaplan',
  'Commander Bly',
  'Commander Cody (CC-2224)',
  'Commander Fil (CC-3714)',
  'Commander Fox',
  'Commander Gree',
  'Commander Jet',
  'Commander Wolffe',
  'Conan Antonio Motti',
  'Conder Kyl',
  'Constable Zuvio',
  'Cordé',
  'Cpatain Typho',
  'Crix Madine',
  'Cut Lawquane',
  'Dak Ralter',
  'Dapp',
  'Darth Bane',
  'Darth Maul',
  'Darth Tyranus',
  'Daultay Dofine',
  'Del Meeko',
  'Delian Mors',
  'Dengar',
  'Depa Billaba',
  'Derek Klivian',
  'Dexter Jettster',
  'Dineé Ellberger',
  'DJ',
  'Doctor Aphra',
  'Doctor Evazan',
  'Dogma',
  'Dormé',
  'Dr. Cylo',
  'Droidbait',
  'Droopy McCool',
  'Dryden Vos',
  'Dud Bolt',
  'Ebe E. Endocott',
  'Echuu Shen-Jon',
  'Eeth Koth',
  'Eighth Brother',
  'Eirtaé',
  'Eli Vanto',
  'Ellé',
  'Ello Asty',
  'Embo',
  'Eneb Ray',
  'Enfys Nest',
  'EV-9D9',
  'Evaan Verlaine',
  'Even Piell',
  'Ezra Bridger',
  'Faro Argyus',
  'Feral',
  'Fifth Brother',
  'Finis Valorum',
  'Finn',
  'Fives',
  'FN-1824',
  'FN-2003',
  'Fodesinbeed Annodue',
  'Fulcrum',
  'FX-7',
  'GA-97',
  'Galen Erso',
  'Gallius Rax',
  'Garazeb "Zeb" Orrelios',
  'Gardulla the Hutt',
  'Garrick Versio',
  'Garven Dreis',
  'Gavyn Sykes',
  'Gideon Hask',
  'Gizor Dellso',
  'Gonk droid',
  'Grand Inquisitor',
  'Greeata Jendowanian',
  'Greedo',
  'Greer Sonnel',
  'Grievous',
  'Grummgar',
  'Gungi',
  'Hammerhead',
  'Han Solo',
  'Harter Kalonia',
  'Has Obbit',
  'Hera Syndulla',
  'Hevy',
  'Hondo Ohnaka',
  'Huyang',
  'Iden Versio',
  'IG-88',
  'Ima-Gun Di',
  'Inquisitors',
  'Inspector Thanoth',
  'Jabba',
  'Jacen Syndulla',
  'Jan Dodonna',
  'Jango Fett',
  'Janus Greejatus',
  'Jar Jar Binks',
  'Jas Emari',
  'Jaxxon',
  'Jek Tono Porkins',
  'Jeremoch Colton',
  'Jira',
  'Jobal Naberrie',
  'Jocasta Nu',
  'Joclad Danva',
  'Joh Yowza',
  'Jom Barell',
  'Joph Seastriker',
  'Jova Tarkin',
  'Jubnuk',
  'Jyn Erso',
  'K-2SO',
  'Kanan Jarrus',
  'Karbin',
  'Karina the Great',
  'Kes Dameron',
  'Ketsu Onyo',
  'Ki-Adi-Mundi',
  'King Katuunko',
  'Kit Fisto',
  'Kitster Banai',
  'Klaatu',
  'Klik-Klak',
  'Korr Sella',
  'Kylo Ren',
  'L3-37',
  'Lama Su',
  'Lando Calrissian',
  'Lanever Villecham',
  'Leia Organa',
  'Letta Turmond',
  'Lieutenant Kaydel Ko Connix',
  'Lieutenant Thire',
  'Lobot',
  'Logray',
  'Lok Durd',
  'Longo Two-Guns',
  'Lor San Tekka',
  'Lorth Needa',
  'Lott Dod',
  'Luke Skywalker',
  'Lumat',
  'Luminara Unduli',
  'Lux Bonteri',
  'Lyn Me',
  'Lyra Erso',
  'Mace Windu',
  'Malakili',
  'Mama the Hutt',
  'Mars Guo',
  'Mas Amedda',
  'Mawhonic',
  'Max Rebo',
  'Maximilian Veers',
  'Maz Kanata',
  'ME-8D9',
  'Meena Tills',
  'Mercurial Swift',
  'Mina Bonteri',
  'Miraj Scintel',
  'Mister Bones',
  'Mod Terrik',
  'Moden Canady',
  'Mon Mothma',
  'Moradmin Bast',
  'Moralo Eval',
  'Morley',
  'Mother Talzin',
  'Nahdar Vebb',
  'Nahdonnis Praji',
  'Nien Nunb',
  'Niima the Hutt',
  'Nines',
  'Norra Wexley',
  'Nute Gunray',
  'Nuvo Vindi',
  'Obi-Wan Kenobi',
  'Odd Ball',
  'Ody Mandrell',
  'Omi',
  'Onaconda Farr',
  'Oola',
  'OOM-9',
  'Oppo Rancisis',
  'Orn Free Taa',
  'Oro Dassyne',
  'Orrimarko',
  'Osi Sobeck',
  'Owen Lars',
  'Pablo-Jill',
  'Padmé Amidala',
  'Pagetti Rook',
  'Paige Tico',
  'Paploo',
  'Petty Officer Thanisson',
  'Pharl McQuarrie',
  'Plo Koon',
  'Po Nudo',
  'Poe Dameron',
  'Poggle the Lesser',
  'Pong Krell',
  'Pooja Naberrie',
  'PZ-4CO',
  'Quarrie',
  'Quay Tolsite',
  'Queen Apailana',
  'Queen Jamillia',
  'Queen Neeyutnee',
  'Qui-Gon Jinn',
  'Quiggold',
  'Quinlan Vos',
  'R2-D2',
  'R2-KT',
  'R3-S6',
  'R4-P17',
  'R5-D4',
  'RA-7',
  'Rabé',
  'Rako Hardeen',
  'Ransolm Casterfo',
  'Rappertunie',
  'Ratts Tyerell',
  'Raymus Antilles',
  'Ree-Yees',
  'Reeve Panzoro',
  'Rey',
  'Ric Olié',
  'Riff Tamson',
  'Riley',
  'Rinnriyin Di',
  'Rio Durant',
  'Rogue Squadron',
  'Romba',
  'Roos Tarpals',
  'Rose Tico',
  'Rotta the Hutt',
  'Rukh',
  'Rune Haako',
  'Rush Clovis',
  'Ruwee Naberrie',
  'Ryoo Naberrie',
  'Sabé',
  'Sabine Wren',
  'Saché',
  'Saelt-Marae',
  'Saesee Tiin',
  'Salacious B. Crumb',
  'San Hill',
  'Sana Starros',
  'Sarco Plank',
  'Sarkli',
  'Satine Kryze',
  'Savage Opress',
  'Sebulba',
  'Senator Organa',
  'Sergeant Kreel',
  'Seventh Sister',
  'Shaak Ti',
  'Shara Bey',
  'Shmi Skywalker',
  'Shu Mai',
  'Sidon Ithano',
  'Sifo-Dyas',
  'Sim Aloo',
  'Siniir Rath Velus',
  'Sio Bibble',
  'Sixth Brother',
  'Slowen Lo',
  'Sly Moore',
  'Snaggletooth',
  'Snap Wexley',
  'Snoke',
  'Sola Naberrie',
  'Sora Bulq',
  'Strono Tuggs',
  'Sy Snootles',
  'Tallissan Lintra',
  'Tarfful',
  'Tasu Leech',
  'Taun We',
  'TC-14',
  'Tee Watt Kaa',
  'Teebo',
  'Teedo',
  'Teemto Pagalies',
  'Temiri Blagg',
  'Tessek',
  'Tey How',
  'Thane Kyrell',
  'The Bendu',
  'The Smuggler',
  'Thrawn',
  'Tiaan Jerjerrod',
  'Tion Medon',
  'Tobias Beckett',
  'Tulon Voidgazer',
  'Tup',
  'U9-C4',
  'Unkar Plutt',
  'Val Beckett',
  'Vanden Willard',
  'Vice Admiral Amilyn Holdo',
  'Vober Dand',
  'WAC-47',
  'Wag Too',
  'Wald',
  'Walrus Man',
  'Warok',
  'Wat Tambor',
  'Watto',
  'Wedge Antilles',
  'Wes Janson',
  'Wicket W. Warrick',
  'Wilhuff Tarkin',
  'Wollivan',
  'Wuher',
  'Wullf Yularen',
  'Xamuel Lennox',
  'Yaddle',
  'Yarael Poof',
  'Yoda',
  'Zam Wesell',
  'Zev Senesca',
  'Ziro the Hutt',
  'Zuckuss',
];
