// constants/onboardingStages.js

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

/**
 * Default onboarding stages in order (fallback if Firestore doesn't have stages configured).
 */
const DEFAULT_STAGES = [
    'Intake',
    'Testing',
    'Integration',
    'Go Live',
    'Complete'
];

// Cache for stages to avoid repeated Firestore reads
let cachedStages = null;
let stagesPromise = null;

/**
 * Loads onboarding stages from Firestore or returns default stages.
 * @param {object} db - Firestore database instance
 * @returns {Promise<string[]>} - Array of onboarding stages in order
 */
export async function loadOnboardingStages(db) {
    // Return cached stages if available
    if (cachedStages) {
        return cachedStages;
    }

    // If a load is already in progress, return that promise
    if (stagesPromise) {
        return stagesPromise;
    }

    // Start loading from Firestore
    stagesPromise = (async () => {
        try {
            const settingsDocRef = doc(db, "settings", "onboardingStages");
            const settingsDocSnap = await getDoc(settingsDocRef);

            if (settingsDocSnap.exists() && settingsDocSnap.data().stages) {
                const stages = settingsDocSnap.data().stages;
                if (Array.isArray(stages) && stages.length > 0) {
                    cachedStages = stages;
                    return stages;
                }
            }

            // If no stages in Firestore, initialize with defaults
            await setDoc(settingsDocRef, {
                stages: DEFAULT_STAGES,
                updatedAt: serverTimestamp()
            }, { merge: true });

            cachedStages = DEFAULT_STAGES;
            return DEFAULT_STAGES;
        } catch (error) {
            console.error("Error loading onboarding stages:", error);
            // Return defaults on error
            cachedStages = DEFAULT_STAGES;
            return DEFAULT_STAGES;
        } finally {
            stagesPromise = null;
        }
    })();

    return stagesPromise;
}

/**
 * Saves onboarding stages to Firestore.
 * @param {object} db - Firestore database instance
 * @param {string[]} stages - Array of onboarding stages in order
 * @returns {Promise<void>}
 */
export async function saveOnboardingStages(db, stages) {
    if (!Array.isArray(stages) || stages.length === 0) {
        throw new Error("Stages must be a non-empty array");
    }

    try {
        const settingsDocRef = doc(db, "settings", "onboardingStages");
        await setDoc(settingsDocRef, {
            stages: stages,
            updatedAt: serverTimestamp()
        });

        // Update cache
        cachedStages = stages;
    } catch (error) {
        console.error("Error saving onboarding stages:", error);
        throw error;
    }
}

/**
 * Clears the cached stages (useful after updating stages).
 */
export function clearStagesCache() {
    cachedStages = null;
    stagesPromise = null;
}

/**
 * Gets the next stage in the onboarding process based on the current stage.
 * @param {string} currentStage - The current onboarding stage
 * @param {string[]} stages - Array of onboarding stages (optional, will use cached if not provided)
 * @returns {string|null} - The next stage, or null if there is no next stage (already at final stage)
 */
export function getNextStage(currentStage, stages = null) {
    const stagesToUse = stages || cachedStages || DEFAULT_STAGES;

    if (!currentStage) {
        return stagesToUse[0] || null;
    }

    const currentIndex = stagesToUse.indexOf(currentStage);
    
    if (currentIndex === -1) {
        // Current stage not in predefined list, return first stage as default
        return stagesToUse[0] || null;
    }

    if (currentIndex >= stagesToUse.length - 1) {
        // Already at the last stage
        return null;
    }

    return stagesToUse[currentIndex + 1];
}

/**
 * Gets the first stage in the onboarding process.
 * @param {string[]} stages - Array of onboarding stages (optional, will use cached if not provided)
 * @returns {string} - The first onboarding stage
 */
export function getFirstStage(stages = null) {
    const stagesToUse = stages || cachedStages || DEFAULT_STAGES;
    return stagesToUse[0] || 'Intake';
}

/**
 * Gets the current stages (from cache or defaults).
 * @returns {string[]} - Array of onboarding stages
 */
export function getStages() {
    return cachedStages || DEFAULT_STAGES;
}

