import type { Component } from 'solid-js';
import { useGame } from '@/gameContext';
import { DefList, DefListItem } from '../DefList/DefList';
import { Header } from '../Header/Header';
import styles from './WorldBrowser.module.css';

export const WorldBrowser: Component = () => {
    const game = useGame();

    return (
        <>
            <Header>Info</Header>
            <DefList>
                <DefListItem name="Seed">{game.world.seed()}</DefListItem>
                <DefListItem name="Size">{game.world.planet()?.nodes.length ?? '--'} tiles</DefListItem>
            </DefList>

            <Header>Resources</Header>
            <DefList>
                <DefListItem name="Copper">25 deposits</DefListItem>
                <DefListItem name="Iron">14 deposits</DefListItem>
                <DefListItem name="Silver">7 deposits</DefListItem>
                <DefListItem name="Gold">4 deposits</DefListItem>
            </DefList>
        </>
    );
};
