const MILLISECONDS_PER_SECOND = 1000;

export const formatLoginTimestamp = (now) => String(Math.floor(now / MILLISECONDS_PER_SECOND));

export const formatBoolean = (value) => (value ? 'true' : 'false');

export const formatCapitalizedBoolean = (value) => (value ? 'True' : 'False');
