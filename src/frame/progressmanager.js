var ProgressManager = (function() {
    let pub = {};
    let score = 0;
    let levelStatuses = {};

    /* SAVING AND LOADING PROGRESS TO CACHE */
    pub.load = () => {
        if (window.localStorage["spendUnits"])
            score = parseInt(window.localStorage["spendUnits"]);
        else
            score = 0;

        if (window.localStorage["progress"])
            levelStatuses = JSON.parse(window.localStorage["progress"]);
        //pub.save();
    };
    pub.save = () => {
        window.localStorage["spendUnits"] = score.toString();
        window.localStorage["progress"] = JSON.stringify(levelStatuses);
    };
    pub.resetProgress = () => {
        score = 0;
        levelStatuses = {};
        pub.save();
    };

    /* PLAYER SCORE */
    pub.setScore = (s) => {
        if (s < 0) {
            console.warn('Score can\'t be negative. Aborting.');
            return;
        }
        score = s;
    };
    pub.addScore = (s) => {
        if (s > 0) score += s;
    };
    pub.loseScore = (s) => {
        if (s > 0) score = Math.max(0, score - s);
    };
    pub.getScore = () => {
        return score;
    };

    /* PLAYER PROGRESS */
    pub.updateLevelStatus = (level_idx, status) => {
        if (level_idx in levelStatuses) { // Update existing status.
            for (var key in status) {
                levelStatuses[level_idx][key] = status[key];
            }
        } else { // Set for first time.
            levelStatuses[level_idx] = status;
        }
    };
    pub.isLevelComplete = (level_idx) => {
        return (level_idx in levelStatuses) && levelStatuses[level_idx].isComplete === true;
    };
    pub.isLevelUnlocked = (level_idx) => {
        return (level_idx in levelStatuses) && levelStatuses[level_idx].isUnlocked === true;
    };
    pub.setLevelAward = (level_idx, numPoints) => {
        pub.updateLevelStatus(level_idx, {
            totalWorth: numPoints
        });
    };
    pub.awardPointsForLevel = (level_idx) => { // Awards points and updates level status. Returns false if none rewarded.
        if (level_idx in levelStatuses) {
            let status = levelStatuses[level_idx];
            if ('totalWorth' in status) {
                let award = 0;
                if ('remainingWorth' in status)
                    award = status.remainingWorth;
                else
                    award = status.totalWorth;

                if (award > 0) {
                    // Set remaining points this level can reward to 0.
                    // TODO: Allow partial completion of levels.
                    pub.updateLevelStatus(level_idx, {
                        remainingWorth: 0
                    });

                    // Update internal score.
                    pub.addScore(award);

                    // Save progress locally.
                    pub.save();

                    // Notify caller that points were awarded.
                    return true;
                }
            } else {
                console.warn(`Level ${level_idx} has a status but totalWorth is unspecified. As a precaution, no points were awarded.`);
            }
        }
        return false;
    };

    /*  Marks level as complete, unlocks the next level if possible, awards points, and saves progress.
        ** NOTE: ONLY CALL THIS WHEN YOU'RE SURE THE PLAYER HAS BEATEN THE LEVEL! **
    */
    pub.markLevelComplete = (idx) => {
        if (!pub.isLevelComplete(idx)) {

            // Save level as complete.
            pub.updateLevelStatus(idx, {
                isComplete: true,
                isUnlocked: true
            });

            // Unlock next level in sequence ONLY IF it's in the same chapter (on the same planet).
            if (!Resource.isLevelStartOfChapter(idx+1)) {
                pub.updateLevelStatus(idx+1, {
                    isUnlocked: true
                });
            }

            // Award points (this also saves state).
            if (!pub.awardPointsForLevel(idx)) {
                console.warn('@ ReductStage.update: Failed to award points for level ', idx);
            }
        }
    };

    return pub;
})();