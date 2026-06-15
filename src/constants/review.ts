export const REVIEW_CONFIG = {
  storage: {
    prefix: 'albumflow_review_',
    requestsPrefix: 'albumflow_requests_',
    voicePrefix: 'albumflow_voice_',
    draftPrefix: 'albumflow_draft_',
    voiceDraftPrefix: 'albumflow_voice_draft_',
  },
} as const;

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  resolved: 'Resolved',
  designer_review: 'Designer Review',
};

export const REQUEST_CATEGORY_LABELS: Record<string, string> = {
  general: 'General Change',
  pin: 'Pin Request',
};
