function levelForXp(xp) {
    let level = 1;
    let spent = 0;
    while (xp >= spent + level * 100) {
        spent += level * 100;
        level += 1;
    }
    return { level, currentLevelXp: spent, nextLevelXp: spent + level * 100 };
}

module.exports = {
    levelForXp
};
