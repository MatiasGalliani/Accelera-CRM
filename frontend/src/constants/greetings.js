/**
 * @typedef {Object} Greeting
 * @property {string} greeting - The Italian greeting
 * @property {string} equivalent - The English equivalent
 * @property {string} time - The time range as a string
 * @property {string} observations - Additional notes about usage
 * @property {number} fromHour - Start hour (24h format)
 * @property {number} toHour - End hour (24h format)
 */

/** @type {Greeting[]} */
export const greetings = [
    {
        greeting: 'Buongiorno',
        equivalent: 'Good morning',
        time: '6:00 – 12:00',
        observations: 'It is used until noon; very common and formal.',
        fromHour: 6,
        toHour: 12,
    },
    {
        greeting: 'Buon pomeriggio',
        equivalent: 'Good afternoon',
        time: '12:00 – 17:00',
        observations: 'Less frequent than "buongiorno" or "buonasera".',
        fromHour: 12,
        toHour: 17,
    },
    {
        greeting: 'Buonasera',
        equivalent: 'Good evening',
        time: '17:00 – 20:00',
        observations: 'From sunset to well into the night.',
        fromHour: 17,
        toHour: 20,
    },
] 