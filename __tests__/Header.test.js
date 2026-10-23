import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Text, Image} from 'react-native';
import Header from '../src/components/Header';

test('header renders the supplied title and logo', () => {
  let tree;
  act(() => {
    tree = renderer.create(<Header title="Mis planes" />);
  });
  expect(
    tree.root
      .findAllByType(Text)
      .some(node => node.props.children === 'Mis planes'),
  ).toBe(true);
  expect(tree.root.findByType(Image).props.source).toBeDefined();
  act(() => tree.unmount());
});
