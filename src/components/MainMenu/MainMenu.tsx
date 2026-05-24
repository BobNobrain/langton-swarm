import { createSignal, Show, type Component, type JSX, type ParentComponent } from 'solid-js';
import { FloatingPanel } from '../FloatingPanel/FloatingPanel';
import { Header, Heading } from '../Header/Header';
import { List, ListItem } from '../List/List';
import styles from './MainMenu.module.css';
import { absurd } from '@/lib/errors';
import { Button } from '../Button/Button';
import { KeyCode } from '@/lib/input';
import { NewGameSettings } from '../NewGameSettings/NewGameSettings';
import { SaveManager } from '../SaveManager/SaveManager';
import { GameSettings } from '../GameSettings/GameSettings';
import { LibraryManager } from '../LibraryManager/LibraryManager';
import { GameCredits } from '../GameCredits/GameCredits';
import { MultiplayerNotice } from '../MultiplayerNotice/MultiplayerNotice';
import { SceneRenderer } from '@/three/SceneRenderer/SceneRenderer';
import { MenuGameProvider } from '../MenuGameProvider/MenuGameProvider';
import { GameScene } from '@/three/GameScene/GameScene';

type Submenu = 'newgame' | 'saves' | 'settings' | 'library' | 'credits' | 'multiplayer';

const MenuContent: Component<{
    onOpenSubmenu: (submenu: Submenu) => void;
}> = (props) => {
    return (
        <div class={styles.menuContentWrapper}>
            <Header withMargin>
                <Heading>Langton Swarm</Heading>
            </Header>
            <List insetH class={styles.menuList}>
                <ListItem class={styles.menuItem} onClick={() => props.onOpenSubmenu('newgame')}>
                    Create New Game
                </ListItem>
                <ListItem class={styles.menuItem} onClick={() => props.onOpenSubmenu('saves')}>
                    Load
                </ListItem>
                <ListItem class={styles.menuItem} onClick={() => props.onOpenSubmenu('multiplayer')}>
                    Multiplayer
                </ListItem>
                <ListItem class={styles.menuItem} onClick={() => props.onOpenSubmenu('settings')}>
                    Settings
                </ListItem>
                <ListItem class={styles.menuItem} onClick={() => props.onOpenSubmenu('library')}>
                    Library Management
                </ListItem>
                <ListItem
                    class={styles.menuItem}
                    onClick={() => {
                        // TODO: open manual
                    }}
                >
                    Open Manual
                </ListItem>
                <ListItem class={styles.menuItem} onClick={() => props.onOpenSubmenu('credits')}>
                    Credits
                </ListItem>
            </List>
        </div>
    );
};

const SubmenuWrapper: ParentComponent<{
    title: JSX.Element;
    onBack: () => void;
}> = (props) => {
    return (
        <>
            <Header
                withMargin
                actions={
                    <Button hotkey={{ key: KeyCode.Esc }} style="secondary" onClick={props.onBack}>
                        &lt; Back
                    </Button>
                }
            >
                <Heading>{props.title}</Heading>
            </Header>
            <div class={styles.submenuWrapper}>{props.children}</div>
        </>
    );
};

export const MainMenu: Component<{
    onChangeToGame: () => void;
}> = (props) => {
    const [submenu, setSubmenu] = createSignal<Submenu | null>(null);
    const onBack = () => setSubmenu(null);

    return (
        <main class={styles.wrapper}>
            <MenuGameProvider>
                <SceneRenderer>
                    <GameScene />
                </SceneRenderer>
            </MenuGameProvider>
            <FloatingPanel pinLeft pinTop pinBottom padded expandedWidth={submenu() !== null}>
                {((): JSX.Element => {
                    const value = submenu();

                    switch (value) {
                        case null:
                            return <MenuContent onOpenSubmenu={setSubmenu} />;

                        case 'newgame':
                            return (
                                <SubmenuWrapper title="New Game" onBack={onBack}>
                                    <NewGameSettings onStart={props.onChangeToGame} />
                                </SubmenuWrapper>
                            );

                        case 'saves':
                            return (
                                <SubmenuWrapper title="Your Saves" onBack={onBack}>
                                    <SaveManager />
                                </SubmenuWrapper>
                            );

                        case 'settings':
                            return (
                                <SubmenuWrapper title="Game Settings" onBack={onBack}>
                                    <GameSettings />
                                </SubmenuWrapper>
                            );

                        case 'library':
                            return (
                                <SubmenuWrapper title="Library Management" onBack={onBack}>
                                    <LibraryManager />
                                </SubmenuWrapper>
                            );

                        case 'credits':
                            return (
                                <SubmenuWrapper title="Credits" onBack={onBack}>
                                    <GameCredits />
                                </SubmenuWrapper>
                            );

                        case 'multiplayer':
                            return (
                                <SubmenuWrapper title="Multiplayer" onBack={onBack}>
                                    <MultiplayerNotice />
                                </SubmenuWrapper>
                            );

                        default:
                            return absurd(value);
                    }
                })()}
            </FloatingPanel>
        </main>
    );
};
