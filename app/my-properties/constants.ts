// Status options for property pursuit tracking
export type FavoriteStatus = 'Reviewing' | 'Communicating' | 'Engaged' | 'Analyzing' | 'LOI Sent' | 'Acquired' | 'Rejected';

export interface StatusOption {
  value: FavoriteStatus;
  label: string;
  description: string;
}

export const STATUS_OPTIONS: StatusOption[] = [
  {
    value: 'Reviewing',
    label: 'Reviewing',
    description: 'Initial review to determine suitability'
  },
  {
    value: 'Communicating',
    label: 'Communicating',
    description: 'Sent email or called them'
  },
  {
    value: 'Engaged',
    label: 'Engaged',
    description: 'Actively engaged in discussions with the owner'
  },
  {
    value: 'Analyzing',
    label: 'Analyzing',
    description: 'Detailed analysis, document review and site visit in progress'
  },
  {
    value: 'LOI Sent',
    label: 'LOI Sent',
    description: 'An offer has been submitted to the seller'
  },
  {
    value: 'Acquired',
    label: 'Acquired',
    description: 'Offer accepted'
  },
  {
    value: 'Rejected',
    label: 'Rejected',
    description: 'Offer rejected'
  }
];