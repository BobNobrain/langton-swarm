import { createMemo, createSignal, For, Show, type Component } from 'solid-js';
import type { NotificationData } from '@/game';
import { useGame } from '@/gameContext';
import { Symbols } from '@/lib/ascii';
import { createBoundsTracker, triggerResize } from '@/lib/BoundsTracker';
import { formatTimePeriod } from '@/lib/strings';
import { createTimeout } from '@/lib/timeouts';
import { BlueprintLabel } from '../BlueprintLabel/BlueprintLabel';
import { Floater } from '../Floater/Floater';
import { TopBarBadge } from './TopBarBadge';
import styles from './Nots.module.css';

const NotListItem: Component<{
    not: NotificationData;
}> = (props) => {
    const { gameTick, time, playerDeck, nots } = useGame();

    const notData = createMemo(() => {
        const found = playerDeck.findByUnitId(props.not.author);

        return {
            bpName: found ? found.bp.rName : () => '<unknown blueprint>',
            bpVersion: found ? found.v : 0,
        };
    });

    const agoText = () => {
        const deltaTicks = time.rCurrentTick() - props.not.createdAtTick;
        const deltaMs = gameTick.tickDurationMs * deltaTicks;
        return formatTimePeriod(deltaMs);
    };

    return (
        <>
            <div class={styles.notificationText}>{props.not.text}</div>
            <div class={styles.notificationInfo}>
                {agoText()} ago by <BlueprintLabel name={notData().bpName()} version={notData().bpVersion} />
            </div>
        </>
    );
};

const READ_DELAY = 200;

export const Nots: Component<{
    padRight?: boolean;
}> = (props) => {
    const { nots } = useGame();

    const popupTarget = createBoundsTracker<HTMLDivElement>();
    const [isOpen, setIsOpen] = createSignal(false);

    const latestNot = createMemo(() => {
        const all = nots.rNots();
        if (!all.length) {
            return null;
        }

        const last = all[all.length - 1];
        return last;
    });

    const isUnread = createMemo(() => {
        const all = nots.rNots();
        if (!all.length) {
            return false;
        }

        const readTime = nots.rReadUntil();
        return all[all.length - 1].createdAtTick > readTime;
    });

    const unreadCount = createMemo(() => {
        const all = nots.rNots();
        const readTime = nots.rReadUntil();

        for (let i = all.length - 1; i >= 0; i--) {
            if (all[i].createdAtTick <= readTime) {
                return renderUnreadCount(all.length - 1 - i);
            }
        }

        return renderUnreadCount(all.length);
    });

    const delayedRead = createTimeout(READ_DELAY);

    return (
        <>
            <TopBarBadge
                padRight={props.padRight}
                cls={isUnread() ? styles.notificationBadgeUnread : styles.notificationBadge}
                wrapperRef={popupTarget.ref}
                onClick={(ev) => {
                    ev.stopImmediatePropagation();

                    triggerResize();
                    setIsOpen(true);
                    delayedRead.schedule(nots.readAll);
                }}
            >
                <div class={styles.notificationIcon}>{Symbols.Circle}</div>
                <div class={styles.notificationsLastContent}>
                    <Show
                        when={latestNot()}
                        fallback={<div class={styles.notificationTextEmpty}>No notifications</div>}
                    >
                        <NotListItem not={latestNot()!} />
                    </Show>
                </div>
                <div class={styles.notificationCounter}>{unreadCount()}</div>
            </TopBarBadge>
            <Floater
                target={popupTarget}
                useTargetWidth
                onClickOutside={() => {
                    setIsOpen(false);
                }}
            >
                <div
                    class={styles.notificationsWrapper}
                    classList={{
                        [styles.open]: isOpen(),
                    }}
                    onClick={() => nots.readAll()}
                >
                    <For
                        each={nots.rNots().toReversed()}
                        fallback={<div class={styles.emptyMessage}>No notifications yet</div>}
                    >
                        {(not) => {
                            return (
                                <div
                                    class={styles.notificationsItem}
                                    classList={{
                                        [styles.unread]: not.createdAtTick > nots.rReadUntil(),
                                    }}
                                >
                                    <NotListItem not={not} />
                                </div>
                            );
                        }}
                    </For>
                </div>
            </Floater>
        </>
    );
};

function renderUnreadCount(n: number): string {
    if (n <= 0) {
        return '';
    }

    if (n > 99) {
        return '99+';
    }

    return `+${n}`;
}
