import { createSignal, type Component, type JSX, type ParentComponent } from 'solid-js';
import { useAppState } from '@/appContext';
import { absurd } from '@/lib/errors';
import { KeyCode } from '@/lib/input';
import { GAME_VERSION, renderGameVersion } from '@/lib/version';
import { GameScene } from '@/three/GameScene/GameScene';
import { SceneRenderer } from '@/three/SceneRenderer/SceneRenderer';
import { Button } from '../Button/Button';
import { FloatingPanel } from '../FloatingPanel/FloatingPanel';
import { GameCredits } from '../GameCredits/GameCredits';
import { GameSettings } from '../GameSettings/GameSettings';
import { Header, Heading } from '../Header/Header';
import { LibraryManager } from '../LibraryManager/LibraryManager';
import { List, ListItem } from '../List/List';
import { MenuGameProvider } from '../MenuGameProvider/MenuGameProvider';
import { MultiplayerNotice } from '../MultiplayerNotice/MultiplayerNotice';
import { NewGameSettings } from '../NewGameSettings/NewGameSettings';
import { SaveManager } from '../SaveManager/SaveManager';
import styles from './MainMenu.module.css';

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
                    <span class={styles.menuItemLabel}>Create New Game</span>
                </ListItem>
                <ListItem class={styles.menuItem} onClick={() => props.onOpenSubmenu('saves')}>
                    <span class={styles.menuItemLabel}>Load</span>
                </ListItem>
                <ListItem class={styles.menuItem} onClick={() => props.onOpenSubmenu('multiplayer')}>
                    <span class={styles.menuItemLabel}>Multiplayer</span>
                </ListItem>
                <ListItem class={styles.menuItem} onClick={() => props.onOpenSubmenu('settings')}>
                    <span class={styles.menuItemLabel}>Settings</span>
                </ListItem>
                <ListItem class={styles.menuItem} onClick={() => props.onOpenSubmenu('library')}>
                    <span class={styles.menuItemLabel}>Library Management</span>
                </ListItem>
                <ListItem
                    class={styles.menuItem}
                    onClick={() => {
                        // TODO: open manual
                    }}
                >
                    <span class={styles.menuItemLabel}>Open Manual</span>
                </ListItem>
                <ListItem class={styles.menuItem} onClick={() => props.onOpenSubmenu('credits')}>
                    <span class={styles.menuItemLabel}>Credits</span>
                </ListItem>
            </List>
            <footer class={styles.footnote}>langton-swarm v{renderGameVersion(GAME_VERSION)}</footer>
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

export const MainMenu: Component = () => {
    const { setScene } = useAppState();

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
                                    <NewGameSettings onStart={() => setScene('game')} />
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
