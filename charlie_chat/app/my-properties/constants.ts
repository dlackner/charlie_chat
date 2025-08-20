// Status options for property pursuit tracking
export type FavoriteStatus = 'REVIEWED' | 'COMMUNICATED' | 'ENGAGED' | 'ANALYZED' | 'LOI_SENT' | 'ACQUIRED' | 'REJECTED';

export interface StatusOption {
  value: FavoriteStatus;
  label: string;
  description: string;
}

export const STATUS_OPTIONS: StatusOption[] = [
  {
    value: 'REVIEWED',
    label: 'Reviewed',
    description: 'Initial review to determine suitability'
  },
  {
    value: 'COMMUNICATED',
    label: 'Communicated',
    description: 'Sent email or called them'
  },
  {
    value: 'ENGAGED',
    label: 'Engaged',
    description: 'Actively engaged in discussions with the owner'
  },
  {
    value: 'ANALYZED',
    label: 'Analyzed',
    description: 'Detailed analysis, document review and site visit in progress'
  },
  {
    value: 'LOI_SENT',
    label: 'LOI Sent',
    description: 'An offer has been submitted to the seller'
  },
  {
    value: 'ACQUIRED',
    label: 'Acquired',
    description: 'Offer accepted'
  },
  {
    value: 'REJECTED',
    label: 'Rejected',
    description: 'Offer rejected'
  }
];