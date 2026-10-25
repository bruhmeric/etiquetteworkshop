/**
 * ─────────────────────────────────────────────────────────────────
 *  ETIQUETTE ESSENTIALS — Single source of truth for event data.
 *  Every surface (invitation page, registration form, ticket emails,
 *  dashboard, scanner) reads from this file. Update values here only.
 * ─────────────────────────────────────────────────────────────────
 */

export const EVENT = {
  name: 'Etiquette Essentials',
  kind: 'An Upskill Workshop',
  inviteLead: 'You are cordially invited',
  tagline: 'An Upskill Workshop for Professional and Social Etiquette',
  description:
    'Join us for an engaging and interactive workshop designed to enhance your confidence, communication skills, personal presentation and professional etiquette.',
  presentedBy: 'BEd Intake 5 · Lyceum Campus, Nugegoda',
  organizer: 'Organised by BEd Intake 5 Students, Lyceum Campus',
  date: {
    iso: '2027-01-08',
    weekday: 'Friday',
    long: 'Friday, 8 January 2027',
    short: '8 Jan 2027',
    day: '8',
    month: 'January',
    year: '2027',
  },
  time: {
    display: '9.00 AM – 12.00 PM',
    short: '9 AM – 12 PM',
    doors: '8.30 AM',
  },
  venue: {
    hall: 'P1 Hall',
    campus: 'Lyceum Campus',
    city: 'Nugegoda',
    full: 'P1 Hall, Lyceum Campus, Nugegoda',
    mapsUrl:
      'https://www.google.com/maps/search/?api=1&query=' +
      encodeURIComponent('P1 Hall, Lyceum Campus, Nugegoda'),
  },
  contact: {
    /**
     * TODO (organizers): set a public inquiry email / phone.
     * These are shown in the footer only when non-empty.
     */
    email: '',
    phone: '',
  },
  payment: {
    /**
     * Bank details are configured through environment variables so they can be
     * changed on Vercel without touching code:
     *   NEXT_PUBLIC_BANK_NAME · NEXT_PUBLIC_ACCOUNT_NAME
     *   NEXT_PUBLIC_BANK_BRANCH · NEXT_PUBLIC_ACCOUNT_NUMBER
     * The NEXT_PUBLIC_ prefix is required because these values are rendered in
     * the (client-side) registration form — they are public by design.
     * While unset, the form shows a "confirm with the organizing committee"
     * notice instead of account details.
     */
    bankName: process.env.NEXT_PUBLIC_BANK_NAME?.trim() ?? '',
    accountName: process.env.NEXT_PUBLIC_ACCOUNT_NAME?.trim() ?? '',
    branch: process.env.NEXT_PUBLIC_BANK_BRANCH?.trim() ?? '',
    accountNumber: process.env.NEXT_PUBLIC_ACCOUNT_NUMBER?.trim() ?? '',
  },
};

export const TICKET_CATEGORIES = [
  {
    id: 'Lyceum Campus Student',
    label: 'Lyceum Campus Student',
    price: 700,
    requiresStudentId: true,
    blurb: 'Currently enrolled Lyceum Campus students.',
    note: 'Student ID required',
  },
  {
    id: 'External Participant',
    label: 'External Participant',
    price: 1000,
    requiresStudentId: false,
    blurb: 'Guests from outside Lyceum Campus.',
    note: 'Open to all',
  },
] as const;

export type Category = (typeof TICKET_CATEGORIES)[number]['id'];

export function priceFor(category: string): number {
  return category === 'Lyceum Campus Student' ? 700 : 1000;
}

export function categoryById(id: string) {
  return TICKET_CATEGORIES.find((c) => c.id === id);
}
