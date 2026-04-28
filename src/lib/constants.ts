/** Parties with the most community upvotes appear on the monthly policy ballot */
export const TOP_PARTY_BALLOT_SIZE = 12;

/** Shared auth/session lifetimes in seconds. */
export const AUTH_CONFIG = {
	sessionMaxAgeSec: 60 * 60 * 24 * 7,
	adminPreviewMaxAgeSec: 60 * 60 * 24 * 7,
} as const;

/** Gameplay and validation rules for party management flows. */
export const PARTY_RULES = {
	descriptionMinLength: 80,
} as const;

/** Tunable fiscal model inputs for the national economy simulation. */
export const ECONOMY_CONFIG = {
	nationalEconomy: {
		base: {
			taxesAnnual: 520,
			exportsAnnual: 210,
			importsAnnual: 185,
		},
		integrationDragAnnualPerVoter: -0.00006,
		integrationPeriodDays: 90,
		integrationRampDays: 270,
	},
} as const;

/** Shared UI tuning values so UX speed/spacing can be adjusted in one place. */
export const UI_CONFIG = {
	topNewsTicker: {
		secondsPerItem: 28,
		minDurationSec: 36,
		reducedMotionDurationMultiplier: 1.7,
		sequenceRepeatFactor: 2,
	},
} as const;
