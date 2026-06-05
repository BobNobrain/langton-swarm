import { createSignal, Show, type Component } from 'solid-js';
import { useAppState } from '@/appContext';
import { useGame } from '@/gameContext';
import { triggerResize } from '@/lib/BoundsTracker';
import { Button, createButtonController } from '../Button/Button';
import { Floater } from '../Floater/Floater';
import { List, ListItem } from '../List/List';

export const GameMenu: Component = () => {
    const [isOpen, setIsOpen] = createSignal(false);
    const toggle = createButtonController();
    const { setScene } = useAppState();
    const { saver } = useGame();

    return (
        <Button
            style="text"
            controllerRef={toggle.ref}
            onClick={(ev) => {
                ev.stopImmediatePropagation();
                triggerResize();
                setIsOpen((x) => !x);
            }}
        >
            ▼
            <Show when={isOpen()}>
                <Floater
                    target={toggle.rGet().bounds()}
                    horizontalAnchor="right"
                    horizontalDirection="left"
                    verticalAnchor="bottom"
                    verticalDirection="down"
                    onClickOutside={() => setIsOpen(false)}
                    usePortal
                >
                    <List hasBorder hasBackground>
                        <ListItem
                            onClick={(ev) => {
                                ev.stopImmediatePropagation();
                                saver.save();
                            }}
                        >
                            Save
                        </ListItem>
                        <ListItem
                            onClick={() => {
                                // TODO: open settings
                            }}
                        >
                            Settings
                        </ListItem>
                        <ListItem
                            onClick={() => {
                                saver.save().then(() => setScene('menu'));
                            }}
                        >
                            Save & Quit
                        </ListItem>
                    </List>
                </Floater>
            </Show>
        </Button>
    );
};
