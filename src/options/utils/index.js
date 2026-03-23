export const sleep = (ms) =>
    new Promise(resolve => setTimeout(resolve, ms));

export const openInNewTab = (url) => window.open(url, '_blank', 'noopener,noreferrer');

export const getDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};