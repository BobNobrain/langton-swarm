import { createMemo, Show, type ParentComponent } from 'solid-js';
import { createBoundsTracker, type BoundsTracker } from '@/lib/BoundsTracker';
import { createControllerRef, provideController, type ControllerRef } from '@/lib/controller';
import { createHotkey, type HotkeyDescriptor } from '@/lib/hotkey';
import { Floater, type FloaterProps } from '../Floater/Floater';
import { HotkeyDisplay } from '../HotkeyDisplay/HotkeyDisplay';
import styles from './Button.module.css';

type ButtonStyle = 'primary' | 'secondary' | 'secondary-danger' | 'text';

const cls: Record<ButtonStyle, string> = {
    primary: styles.btnPrimary,
    secondary: styles.btnSecondary,
    'secondary-danger': styles.btnSecondaryDanger,
    text: styles.btnText,
};

export type ButtonController = {
    focus(): void;
    bounds(): BoundsTracker<HTMLButtonElement>;
};

export const Button: ParentComponent<{
    type?: 'button' | 'submit';
    style?: ButtonStyle;
    disabled?: boolean;
    inline?: boolean;
    vibrantFocus?: boolean;
    hotkey?: HotkeyDescriptor;
    hotkeyPosition?: 'none' | 'top-right' | 'middle-left';
    useHotkeyPortal?: boolean;
    rmbHotkey?: boolean;
    onClick?: (ev: MouseEvent | KeyboardEvent) => void;
    onMouseEnter?: (ev: MouseEvent) => void;
    onMouseLeave?: (ev: MouseEvent) => void;
    controllerRef?: ControllerRef<ButtonController>;
}> = (props) => {
    if (props.hotkey) {
        createHotkey(
            {
                ...props.hotkey,
                isEnabled: () => !props.disabled && (props.hotkey?.isEnabled?.() ?? true),
            },
            (ev) => props.onClick?.(ev),
        );
    }

    const boundsTracker = createBoundsTracker<HTMLButtonElement>();

    provideController(
        {
            focus() {
                boundsTracker.getElement()?.focus();
            },
            bounds: () => boundsTracker,
        },
        () => props.controllerRef,
    );

    const hotkeyPosition = createMemo(
        (): Pick<
            FloaterProps<any>,
            'horizontalAnchor' | 'horizontalDirection' | 'verticalAnchor' | 'verticalDirection' | 'offsetX' | 'offsetY'
        > => {
            switch (props.hotkeyPosition) {
                case 'none':
                    return {};

                case 'middle-left':
                    return {
                        horizontalAnchor: 'left',
                        horizontalDirection: 'left',
                        verticalAnchor: 'top',
                        verticalDirection: 'down',
                        offsetX: -8,
                        offsetY: 3,
                    };

                case 'top-right':
                case undefined:
                    return {
                        horizontalAnchor: 'right',
                        horizontalDirection: 'left',
                        verticalAnchor: 'top',
                        verticalDirection: 'up',
                        offsetX: 4,
                        offsetY: -4,
                    };
            }
        },
    );

    return (
        <button
            ref={boundsTracker.ref}
            type={props.type ?? 'button'}
            classList={{
                [styles.button]: true,
                [cls[props.style ?? 'secondary']]: true,
                [styles.disabled]: props.disabled,
                [styles.clickable]: Boolean(props.onClick),
                [styles.inline]: props.inline,
                [styles.vibrantFocus]: props.vibrantFocus,
            }}
            disabled={props.disabled}
            onClick={props.onClick}
            onMouseEnter={props.onMouseEnter}
            onMouseLeave={props.onMouseLeave}
        >
            <span class={styles.label}>{props.children}</span>
            <Show when={(props.hotkey || props.rmbHotkey) && props.hotkeyPosition !== 'none'}>
                <Floater target={boundsTracker} usePortal={props.useHotkeyPortal} {...hotkeyPosition()}>
                    <HotkeyDisplay
                        hotkey={props.rmbHotkey ? 'rmb' : props.hotkey!}
                        classList={{ [styles.hotkey]: true, [cls[props.style ?? 'secondary']]: true }}
                    />
                </Floater>
            </Show>
        </button>
    );
};

export function createButtonController() {
    return createControllerRef<ButtonController>({
        focus() {},
        bounds() {
            return {
                getBounds: () => new DOMRect(),
                getElement: () => null,
                getScroll: () => ({ scrollHeight: 0, scrollLeft: 0, scrollTop: 0, scrollWidth: 0 }),
                ref(el) {},
            };
        },
    });
}
