export const sleep = (ms) =>
    new Promise(resolve => setTimeout(resolve, ms));

export const openInNewTab = (url) => window.open(url, '_blank', 'noopener,noreferrer');