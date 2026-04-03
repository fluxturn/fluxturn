// Forms Connectors - Category Index

// Export connector implementations
export { GoogleFormsConnector } from './google-forms';
export { JotFormConnector } from './jotform';
export { TypeformConnector } from './typeform';

// Export connector definitions
export { GOOGLE_FORMS_CONNECTOR } from './google-forms';
export { JOTFORM_FORM_CONNECTOR } from './jotform';
export { TYPEFORM_CONNECTOR } from './typeform';

// Combined array
import { GOOGLE_FORMS_CONNECTOR } from './google-forms';
import { JOTFORM_FORM_CONNECTOR } from './jotform';
import { TYPEFORM_CONNECTOR } from './typeform';

export const FORMS_CONNECTORS = [
  GOOGLE_FORMS_CONNECTOR,
  JOTFORM_FORM_CONNECTOR,
  TYPEFORM_CONNECTOR,
];
