const parseOrigins = (value?: string): string[] =>
  value
    ? value
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0)
    : [];

const DEFAULT_ALLOWED_ORIGINS = [
  'https://www.starvingartistsgame.com',
  'https://starvingartistsgame.com',
  'https://realtime.starvingartistsgame.com'
];

export const getAllowedOrigins = () => {
  const envOrigins = parseOrigins(process.env.ALLOWED_ORIGINS);
  if (envOrigins.length > 0) {
    return envOrigins;
  }
  return DEFAULT_ALLOWED_ORIGINS;
};

export const getDefaultAllowedOrigins = () => DEFAULT_ALLOWED_ORIGINS;
