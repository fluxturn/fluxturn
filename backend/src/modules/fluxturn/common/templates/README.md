# Workflow Templates

This directory contains all workflow templates that are automatically seeded when the backend starts.

## Structure

Each template is stored in its own individual JSON file:

```
templates/
  ├── ai-blog-post-generator-from-research.json
  ├── ai-powered-support-customer-complaint-system.json
  ├── automated-social-posting-schedule.json
  ├── e-commerce-order-fulfillment.json
  ├── email-digest-intelligence.json
  ├── get-user-data-automatically.json
  ├── learning-content-curator.json
  ├── linkedin-post-idea-generator.json
  ├── multi-channel-content-distribution.json
  ├── review-analysis.json
  ├── smart-social-media-cross-poster.json
  ├── social-media-monitoring.json
  ├── test-ai-promt.json
  ├── youtube-video-publisher.json
  ├── index.json          # Metadata and template index
  └── README.md           # This file
```

## Template File Format

Each template file contains a single template object with a **fixed UUID** that never changes.

## Important: Template IDs

**Each template has a unique `id` field that MUST remain constant.**
- When seeding, the service uses the ID from the file
- The ID never changes, even across multiple seeding operations
- This ensures consistent template references

## Automatic Seeding

Templates are automatically seeded when the backend starts:
1. Delete all existing templates
2. Read all .json files from this directory
3. Seed each template using the ID from the file
4. Log completion

## Adding New Templates

1. Export from database: `node scripts/export-templates.js`
2. Refactor to individual files: `node scripts/refactor-to-individual-files.js`
3. Commit the new file to git
4. Restart backend - it will be seeded automatically
