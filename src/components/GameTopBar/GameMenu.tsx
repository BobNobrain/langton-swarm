import { createSignal, Show, type Component } from 'solid-js';
import { Button, createButtonController } from '../Button/Button';
import { triggerResize } from '@/lib/BoundsTracker';
import { Floater } from '../Floater/Floater';
import { List, ListItem } from '../List/List';
import { useAppState } from '@/appContext';

export const GameMenu: Component = () => {
    const [isOpen, setIsOpen] = createSignal(false);
    const toggle = createButtonController();
    const { setScene } = useAppState();

    const save = () => {
        alert('Sorry, not implemented yet');
    };

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
                                save();
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
                                save();
                                setScene('menu');
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
