export const createDefaultProgramText = () =>
    `# Unit's program is a state machine

command move(position to) {
    navigator.navigate(to)
}

command mine {
    # drill.mine
}

command roam {
    state :roaming
}

command idle {
    state :idle
}

state roaming default {
    navigator.move(random)
}
`;
