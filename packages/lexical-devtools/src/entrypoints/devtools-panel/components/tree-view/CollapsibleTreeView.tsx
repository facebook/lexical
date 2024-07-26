/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './index.css';

import {
  Alert,
  AlertIcon,
  Box,
  Container,
  Divider,
  Flex,
  Heading,
  Text,
} from '@chakra-ui/react';
import {NodePropDetails, SelectionPropDetails} from '@lexical/devtools-core';
import cx from 'classnames';
import {type EditorState} from 'lexical';
import * as React from 'react';
import {useCallback, useEffect, useRef, useState} from 'react';
import TreeView, {INode} from 'react-accessible-treeview';
import {IoMdArrowDropright} from 'react-icons/io';

type CollapsibleTreeViewProps = {
  editorState: EditorState;
  generateTreeViewNodes: () => Promise<string>;
  onNodeSelect: (node: INode, isSelected: boolean) => Promise<string | null>;
  onBlur: () => void;
  treeClassName: string;
  viewContainerClassName: string;
  detailsViewClassName: string;
};

export function CollapsibleTreeView({
  editorState,
  generateTreeViewNodes,
  onNodeSelect,
  onBlur,
  treeClassName,
  viewContainerClassName,
  detailsViewClassName,
}: CollapsibleTreeViewProps): JSX.Element | null {
  const [data, setData] = useState<INode[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodePropDetails | null>(
    null,
  );
  const [editorSelection, setEditorSelection] =
    useState<SelectionPropDetails | null>(null);
  const lastGenerationID = useRef(0);
  const lastEditorStateRef = useRef<null | EditorState>();

  const generateTreeData = useCallback(() => {
    const myID = ++lastGenerationID.current;
    generateTreeViewNodes()
      .then((rawData: string) => {
        const parsedData = JSON.parse(rawData);
        setError(null);
        if (myID === lastGenerationID.current) {
          setData(parsedData.tree as INode[]);
          if (parsedData.selection != null) {
            setEditorSelection(
              JSON.parse(parsedData.selection) as SelectionPropDetails,
            );
          }
        }
      })
      .catch((err) => {
        if (myID === lastGenerationID.current) {
          setError(
            `Error rendering tree: ${err.message}\n\nStack:\n${err.stack}`,
          );
        }
      });
  }, [generateTreeViewNodes]);

  useEffect(() => {
    // Prevent re-rendering if the editor state hasn't changed
    if (lastEditorStateRef.current !== editorState) {
      lastEditorStateRef.current = editorState;
      generateTreeData();
    }
  }, [editorState, generateTreeData]);

  if (data == null) {
    return null;
  }

  return (
    <Box w="100%">
      {error != null ? (
        <Alert status="warning">
          <AlertIcon />
          {error}
        </Alert>
      ) : null}
      <Flex w="100%" className={viewContainerClassName}>
        <Box w="100%" className={treeClassName}>
          <TreeView
            data={data}
            className="basic"
            aria-label="collapsible tree"
            defaultExpandedIds={['root']}
            togglableSelect={true}
            onNodeSelect={({isSelected, element}) => {
              onNodeSelect(element, isSelected)
                .then((node: string | null) => {
                  if (isSelected && node != null) {
                    setSelectedNode(JSON.parse(node));
                  }
                })
                .catch((e) => {
                  console.error(e);
                });
            }}
            nodeRenderer={({
              element,
              getNodeProps,
              level,
              isExpanded,
              isBranch,
            }) => {
              return (
                <div
                  key={element.id}
                  {...getNodeProps()}
                  style={{paddingLeft: 20 * (level - 1)}}>
                  {isBranch && <ArrowIcon isOpen={isExpanded} />}
                  <span className="name">{element.name}</span>
                </div>
              );
            }}
            onBlur={() => {
              onBlur();
            }}
          />
        </Box>
        <Box w="sm" maxW="sm" className={detailsViewClassName}>
          {selectedNode != null ? (
            <Container p={5}>
              {selectedNode.classname != null ? (
                <>
                  <Text as="b">Classname:</Text>
                  <Text as="em" noOfLines={1} fontSize="1xl">
                    {selectedNode.classname}
                  </Text>
                </>
              ) : null}
              <Heading as="h4" size="1xl" noOfLines={1} mt={3}>
                Properties:
              </Heading>
              {Object.entries(selectedNode).map(([key, value]) => {
                if (
                  key === 'classname' ||
                  (typeof value === 'object' && value !== null) ||
                  value === ''
                ) {
                  return null;
                }
                return (
                  <div key={key}>
                    <Text as="i" ml={2}>
                      {key}
                    </Text>
                    : {value}
                  </div>
                );
              })}
            </Container>
          ) : null}
          <Divider />
          {editorSelection != null ? (
            <Container p={5}>
              {editorSelection.type === 'range' ? (
                <RangeSelectionDetails selection={editorSelection} />
              ) : null}
              {editorSelection.type === 'table' ? (
                <TableSelectionDetails selection={editorSelection} />
              ) : null}
              {editorSelection.type === 'node' ? (
                <NodeSelectionDetails selection={editorSelection} />
              ) : null}
            </Container>
          ) : null}
        </Box>
      </Flex>
    </Box>
  );
}

function RangeSelectionDetails({
  selection,
}: {
  selection: SelectionPropDetails;
}): JSX.Element {
  return (
    <>
      <Text>
        <Text as="b">Selection: </Text>
        {selection.type}
      </Text>
      <Text as="b" mt={2}>
        Anchor:
      </Text>
      <Text>
        <Text as="i" ml={2}>
          key:{' '}
        </Text>
        {selection.anchor.key}
      </Text>
      <Text>
        <Text as="i" ml={2}>
          offset:{' '}
        </Text>
        {selection.anchor.offset}
      </Text>
      <Text>
        <Text as="i" ml={2}>
          type:{' '}
        </Text>
        {selection.anchor.type}
      </Text>
      <Text as="b" mt={2}>
        Focus:
      </Text>
      <Text>
        <Text as="i" ml={2}>
          key:{' '}
        </Text>
        {selection.focus.key}
      </Text>
      <Text>
        <Text as="i" ml={2}>
          offset:{' '}
        </Text>
        {selection.focus.offset}
      </Text>
      <Text>
        <Text as="i" ml={2}>
          type:{' '}
        </Text>
        {selection.focus.type}
      </Text>
    </>
  );
}

function TableSelectionDetails({
  selection,
}: {
  selection: SelectionPropDetails;
}): JSX.Element {
  return (
    <>
      <Text>
        <Text as="b">Selection: </Text>
        {selection.type}
      </Text>
      <Text>
        <Text as="i" ml={2}>
          table:{' '}
        </Text>
        {selection.tableKey}
      </Text>
      <Text>
        <Text as="i" ml={2}>
          anchor cell:{' '}
        </Text>
        {selection.anchorCell}
      </Text>
      <Text>
        <Text as="i" ml={2}>
          focus cell:{' '}
        </Text>
        {selection.focusCell}
      </Text>
    </>
  );
}

function NodeSelectionDetails({
  selection,
}: {
  selection: SelectionPropDetails;
}): JSX.Element {
  return (
    <>
      <Text>
        <Text as="b">Selection: </Text>
        {selection.type}
      </Text>
      <Text>
        <Text as="i" ml={2}>
          nodes:{' '}
        </Text>
        {selection.node}
      </Text>
    </>
  );
}

const ArrowIcon = ({isOpen}: {isOpen: boolean}) => {
  const baseClass = 'arrow';
  const classes = cx(
    baseClass,
    {[`${baseClass}--closed`]: !isOpen},
    {[`${baseClass}--open`]: isOpen},
  );
  return <IoMdArrowDropright className={classes} />;
};
