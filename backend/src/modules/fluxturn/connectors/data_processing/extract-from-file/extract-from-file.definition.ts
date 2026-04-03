// Extract from File Connector Definition
// Converted from n8n ExtractFromFile node

import { ConnectorDefinition } from '../../shared';

export const EXTRACT_FROM_FILE_CONNECTOR: ConnectorDefinition = {
  name: 'extract_from_file',
  display_name: 'Extract from File',
  category: 'data_processing',
  description: 'Convert binary files to JSON - supports CSV, JSON, XML, PDF, Excel, and more',
  auth_type: 'none',
  complexity: 'Medium',
  verified: false,

  auth_fields: [],

  endpoints: {},

  webhook_support: false,
  rate_limits: {},
  sandbox_available: false,

  supported_actions: [
    {
      id: 'extract_from_csv',
      name: 'Extract from CSV',
      description: 'Transform a CSV file into output items',
      category: 'File Extraction',
      icon: 'file-text',
      verified: false,
      api: {
        endpoint: '',
        method: 'POST',
        baseUrl: '',
        headers: {},
        paramMapping: {}
      },
      inputSchema: {
        binaryData: {
          type: 'string',
          required: true,
          label: 'Binary Data',
          description: 'The CSV file data (base64 encoded)',
          inputType: 'textarea',
          aiControlled: false
        },
        delimiter: {
          type: 'string',
          required: false,
          label: 'Delimiter',
          placeholder: ',',
          description: 'The delimiter character (default: comma)',
          default: ',',
          inputType: 'text',
          aiControlled: false
        },
        includeHeader: {
          type: 'boolean',
          required: false,
          label: 'Include Header Row',
          description: 'Whether the first row contains headers',
          default: true,
          aiControlled: false
        }
      },
      outputSchema: {
        items: {
          type: 'array',
          description: 'Extracted data items'
        }
      }
    },
    {
      id: 'extract_from_json',
      name: 'Extract from JSON',
      description: 'Transform a JSON file into output items',
      category: 'File Extraction',
      icon: 'code',
      verified: false,
      api: {
        endpoint: '',
        method: 'POST',
        baseUrl: '',
        headers: {},
        paramMapping: {}
      },
      inputSchema: {
        binaryData: {
          type: 'string',
          required: true,
          label: 'Binary Data',
          description: 'The JSON file data (base64 encoded)',
          inputType: 'textarea',
          aiControlled: false
        }
      },
      outputSchema: {
        items: {
          type: 'array',
          description: 'Extracted data items'
        }
      }
    },
    {
      id: 'extract_from_xml',
      name: 'Extract from XML',
      description: 'Extracts the content of an XML file',
      category: 'File Extraction',
      icon: 'code',
      verified: false,
      api: {
        endpoint: '',
        method: 'POST',
        baseUrl: '',
        headers: {},
        paramMapping: {}
      },
      inputSchema: {
        binaryData: {
          type: 'string',
          required: true,
          label: 'Binary Data',
          description: 'The XML file data (base64 encoded)',
          inputType: 'textarea',
          aiControlled: false
        }
      },
      outputSchema: {
        data: {
          type: 'object',
          description: 'Extracted XML data'
        }
      }
    },
    {
      id: 'extract_from_text',
      name: 'Extract from Text File',
      description: 'Extracts the content of a text file',
      category: 'File Extraction',
      icon: 'file-text',
      verified: false,
      api: {
        endpoint: '',
        method: 'POST',
        baseUrl: '',
        headers: {},
        paramMapping: {}
      },
      inputSchema: {
        binaryData: {
          type: 'string',
          required: true,
          label: 'Binary Data',
          description: 'The text file data (base64 encoded)',
          inputType: 'textarea',
          aiControlled: false
        }
      },
      outputSchema: {
        text: {
          type: 'string',
          description: 'Extracted text content'
        }
      }
    },
    {
      id: 'extract_from_pdf',
      name: 'Extract from PDF',
      description: 'Extracts the content and metadata from a PDF file',
      category: 'File Extraction',
      icon: 'file',
      verified: false,
      api: {
        endpoint: '',
        method: 'POST',
        baseUrl: '',
        headers: {},
        paramMapping: {}
      },
      inputSchema: {
        binaryData: {
          type: 'string',
          required: true,
          label: 'Binary Data',
          description: 'The PDF file data (base64 encoded)',
          inputType: 'textarea',
          aiControlled: false
        }
      },
      outputSchema: {
        text: {
          type: 'string',
          description: 'Extracted text content'
        },
        metadata: {
          type: 'object',
          description: 'PDF metadata'
        }
      }
    },
    {
      id: 'convert_to_base64',
      name: 'Move File to Base64 String',
      description: 'Convert a file into a base64-encoded string',
      category: 'File Conversion',
      icon: 'code',
      verified: false,
      api: {
        endpoint: '',
        method: 'POST',
        baseUrl: '',
        headers: {},
        paramMapping: {}
      },
      inputSchema: {
        binaryData: {
          type: 'string',
          required: true,
          label: 'Binary Data',
          description: 'The file data to convert',
          inputType: 'textarea',
          aiControlled: false
        }
      },
      outputSchema: {
        base64: {
          type: 'string',
          description: 'Base64-encoded file content'
        }
      }
    },
    {
      id: 'extract_from_html',
      name: 'Extract from HTML',
      description: 'Transform a table in an HTML file into output items',
      category: 'File Extraction',
      icon: 'code',
      verified: false,
      api: {
        endpoint: '',
        method: 'POST',
        baseUrl: '',
        headers: {},
        paramMapping: {}
      },
      inputSchema: {
        binaryData: {
          type: 'string',
          required: true,
          label: 'Binary Data',
          description: 'The HTML file data (base64 encoded)',
          inputType: 'textarea',
          aiControlled: false
        }
      },
      outputSchema: {
        items: {
          type: 'array',
          description: 'Extracted table data'
        }
      }
    },
    {
      id: 'extract_from_ics',
      name: 'Extract from ICS',
      description: 'Transform an ICS calendar file into output items',
      category: 'File Extraction',
      icon: 'calendar',
      verified: false,
      api: {
        endpoint: '',
        method: 'POST',
        baseUrl: '',
        headers: {},
        paramMapping: {}
      },
      inputSchema: {
        binaryData: {
          type: 'string',
          required: true,
          label: 'Binary Data',
          description: 'The ICS file data (base64 encoded)',
          inputType: 'textarea',
          aiControlled: false
        }
      },
      outputSchema: {
        items: {
          type: 'array',
          description: 'Extracted calendar events'
        }
      }
    },
    {
      id: 'extract_from_ods',
      name: 'Extract from ODS',
      description: 'Transform an OpenDocument Spreadsheet file into output items',
      category: 'File Extraction',
      icon: 'table',
      verified: false,
      api: {
        endpoint: '',
        method: 'POST',
        baseUrl: '',
        headers: {},
        paramMapping: {}
      },
      inputSchema: {
        binaryData: {
          type: 'string',
          required: true,
          label: 'Binary Data',
          description: 'The ODS file data (base64 encoded)',
          inputType: 'textarea',
          aiControlled: false
        }
      },
      outputSchema: {
        items: {
          type: 'array',
          description: 'Extracted spreadsheet data'
        }
      }
    },
    {
      id: 'extract_from_rtf',
      name: 'Extract from RTF',
      description: 'Transform a table in an RTF file into output items',
      category: 'File Extraction',
      icon: 'file-text',
      verified: false,
      api: {
        endpoint: '',
        method: 'POST',
        baseUrl: '',
        headers: {},
        paramMapping: {}
      },
      inputSchema: {
        binaryData: {
          type: 'string',
          required: true,
          label: 'Binary Data',
          description: 'The RTF file data (base64 encoded)',
          inputType: 'textarea',
          aiControlled: false
        }
      },
      outputSchema: {
        items: {
          type: 'array',
          description: 'Extracted table data'
        }
      }
    },
    {
      id: 'extract_from_xls',
      name: 'Extract from XLS',
      description: 'Transform an Excel file (XLS format) into output items',
      category: 'File Extraction',
      icon: 'file-excel',
      verified: false,
      api: {
        endpoint: '',
        method: 'POST',
        baseUrl: '',
        headers: {},
        paramMapping: {}
      },
      inputSchema: {
        binaryData: {
          type: 'string',
          required: true,
          label: 'Binary Data',
          description: 'The XLS file data (base64 encoded)',
          inputType: 'textarea',
          aiControlled: false
        }
      },
      outputSchema: {
        items: {
          type: 'array',
          description: 'Extracted spreadsheet data'
        }
      }
    },
    {
      id: 'extract_from_xlsx',
      name: 'Extract from XLSX',
      description: 'Transform an Excel file (XLSX format) into output items',
      category: 'File Extraction',
      icon: 'file-excel',
      verified: false,
      api: {
        endpoint: '',
        method: 'POST',
        baseUrl: '',
        headers: {},
        paramMapping: {}
      },
      inputSchema: {
        binaryData: {
          type: 'string',
          required: true,
          label: 'Binary Data',
          description: 'The XLSX file data (base64 encoded)',
          inputType: 'textarea',
          aiControlled: false
        }
      },
      outputSchema: {
        items: {
          type: 'array',
          description: 'Extracted spreadsheet data'
        }
      }
    }
  ],

  supported_triggers: []
};
