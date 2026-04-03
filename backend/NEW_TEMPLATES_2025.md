# New Workflow Templates - 2025

**Created:** 2025-11-20
**Total Templates:** 62
**Focus:** Zoom, Google Forms, ClickUp, Jotform, Salesforce, Google Ads

---

## Overview

This document tracks the implementation of 62 new workflow templates featuring newly implemented and updated connectors with dual OAuth support.

### Implementation Status

- [ ] **Zoom Templates** (14 templates) - 0/14 completed
- [ ] **Google Forms Templates** (12 templates) - 0/12 completed
- [ ] **ClickUp Templates** (15 templates) - 0/15 completed
- [ ] **Jotform Templates** (8 templates) - 0/8 completed
- [ ] **Salesforce Templates** (8 templates) - 0/8 completed
- [ ] **Google Ads Templates** (3 templates) - 0/3 completed
- [ ] **Cross-Connector Templates** (2 templates) - 0/2 completed

**Total Progress:** 0/62 (0%)

---

## Template Categories

### By Category
- **Productivity:** 18 templates
- **Collaboration:** 12 templates
- **Sales/CRM:** 11 templates
- **Analytics:** 9 templates
- **Project Management:** 7 templates
- **Communication:** 5 templates

### By Node Count
- **2 nodes:** 57 templates (92%)
- **3 nodes:** 5 templates (8%)

---

## 🎯 Zoom Templates (14)

### 1. ✅ Zoom Meeting Scheduler from Form Submission
- **File:** `zoom-meeting-scheduler-from-form.json`
- **Category:** Productivity
- **Nodes:** Jotform Trigger → Zoom Create Meeting
- **Use Case:** Auto-create Zoom meetings when someone submits a meeting request form
- **Status:** ⏳ Pending

### 2. ✅ Zoom Meeting Reminder to Slack
- **File:** `zoom-meeting-reminder-to-slack.json`
- **Category:** Collaboration
- **Nodes:** Schedule Trigger → Zoom Get Meeting → Slack Send Message
- **Use Case:** Daily digest of upcoming meetings posted to Slack channel
- **Status:** ⏳ Pending

### 3. ✅ Zoom Recording to Google Drive
- **File:** `zoom-recording-to-google-drive.json`
- **Category:** Productivity
- **Nodes:** Zoom Recording Completed Trigger → Google Drive Upload
- **Use Case:** Auto-backup Zoom recordings to Google Drive
- **Status:** ⏳ Pending

### 4. ✅ New Salesforce Opportunity Creates Zoom Meeting
- **File:** `salesforce-opportunity-to-zoom-meeting.json`
- **Category:** Sales
- **Nodes:** Salesforce Opportunity Created Trigger → Zoom Create Meeting
- **Use Case:** Auto-schedule kickoff calls for new opportunities
- **Status:** ⏳ Pending

### 5. ✅ Zoom Meeting Started Notification
- **File:** `zoom-meeting-started-notification.json`
- **Category:** Collaboration
- **Nodes:** Zoom Meeting Started Trigger → Slack Send Message
- **Use Case:** Notify team channel when important meetings start
- **Status:** ⏳ Pending

### 6. ✅ Zoom Webinar Registration to Google Sheets
- **File:** `zoom-webinar-registration-to-sheets.json`
- **Category:** Analytics
- **Nodes:** Zoom Webinar Registration Trigger → Google Sheets Append Row
- **Use Case:** Track webinar registrations in spreadsheet
- **Status:** ⏳ Pending

### 7. ✅ Zoom Meeting Ended Summary
- **File:** `zoom-meeting-ended-summary.json`
- **Category:** Communication
- **Nodes:** Zoom Meeting Ended Trigger → Gmail Send Email
- **Use Case:** Send meeting summary emails
- **Status:** ⏳ Pending

### 8. ✅ Daily Zoom Meeting List
- **File:** `daily-zoom-meeting-list.json`
- **Category:** Productivity
- **Nodes:** Schedule Trigger → Zoom List Meetings → Slack Send Message
- **Use Case:** Daily meeting agenda posted to Slack
- **Status:** ⏳ Pending

### 9. ✅ Zoom Participant Joined Alert
- **File:** `zoom-participant-joined-alert.json`
- **Category:** Collaboration
- **Nodes:** Zoom Participant Joined Trigger → Slack Send Message
- **Use Case:** Alert when VIP participants join
- **Status:** ⏳ Pending

### 10. ✅ Zoom Recording Ready Notification
- **File:** `zoom-recording-ready-notification.json`
- **Category:** Communication
- **Nodes:** Zoom Recording Completed Trigger → Gmail Send Email
- **Use Case:** Notify attendees when recording is available
- **Status:** ⏳ Pending

### 11. ✅ Zoom Meeting to Calendar Event
- **File:** `zoom-meeting-to-calendar-event.json`
- **Category:** Productivity
- **Nodes:** Zoom Meeting Created Trigger → Google Calendar Create Event
- **Use Case:** Sync Zoom meetings to Google Calendar
- **Status:** ⏳ Pending

### 12. ✅ Zoom Webinar to ClickUp Task
- **File:** `zoom-webinar-to-clickup-task.json`
- **Category:** Project Management
- **Nodes:** Zoom Webinar Created Trigger → ClickUp Create Task
- **Use Case:** Create follow-up tasks for webinars
- **Status:** ⏳ Pending

### 13. ✅ Zoom Meeting to Salesforce Activity
- **File:** `zoom-meeting-to-salesforce-activity.json`
- **Category:** Sales
- **Nodes:** Zoom Meeting Ended Trigger → Salesforce Create Activity
- **Use Case:** Log Zoom calls as CRM activities
- **Status:** ⏳ Pending

### 14. ✅ Zoom Meeting No-Show Alert
- **File:** `zoom-meeting-no-show-alert.json`
- **Category:** Sales
- **Nodes:** Zoom Meeting Ended Trigger → Slack Send Message
- **Use Case:** Alert team about meeting no-shows
- **Status:** ⏳ Pending

---

## 📝 Google Forms Templates (12)

### 15. ✅ Google Form to ClickUp Task Creator
- **File:** `google-form-to-clickup-task.json`
- **Category:** Productivity
- **Nodes:** Google Forms New Response → ClickUp Create Task
- **Use Case:** Convert form responses into project tasks
- **Status:** ⏳ Pending

### 16. ✅ Google Form to Salesforce Contact
- **File:** `google-form-to-salesforce-contact.json`
- **Category:** CRM
- **Nodes:** Google Forms New Response → Salesforce Create Contact
- **Use Case:** Add form respondents to CRM
- **Status:** ⏳ Pending

### 17. ✅ Google Form Response Alerts
- **File:** `google-form-response-alerts.json`
- **Category:** Collaboration
- **Nodes:** Google Forms New Response → Slack Send Message
- **Use Case:** Team notifications for critical form submissions
- **Status:** ⏳ Pending

### 18. ✅ Google Form to Google Sheets Logger
- **File:** `google-form-to-google-sheets-logger.json`
- **Category:** Analytics
- **Nodes:** Google Forms New Response → Google Sheets Append Row
- **Use Case:** Log all form submissions to spreadsheet
- **Status:** ⏳ Pending

### 19. ✅ Google Form to Email Thank You
- **File:** `google-form-to-email-thank-you.json`
- **Category:** Communication
- **Nodes:** Google Forms New Response → Gmail Send Email
- **Use Case:** Send automated thank you emails
- **Status:** ⏳ Pending

### 20. ✅ Google Form to Airtable Record
- **File:** `google-form-to-airtable-record.json`
- **Category:** Database
- **Nodes:** Google Forms New Response → Airtable Create Record
- **Use Case:** Store form responses in Airtable database
- **Status:** ⏳ Pending

### 21. ✅ Google Form Bug Report to ClickUp
- **File:** `google-form-bug-report-to-clickup.json`
- **Category:** Development
- **Nodes:** Google Forms New Response → ClickUp Create Task
- **Use Case:** Create bug tracking tasks from form
- **Status:** ⏳ Pending

### 22. ✅ Google Form Lead to Salesforce
- **File:** `google-form-lead-to-salesforce.json`
- **Category:** Sales
- **Nodes:** Google Forms New Response → Salesforce Create Lead
- **Use Case:** Auto-create CRM leads from contact forms
- **Status:** ⏳ Pending

### 23. ✅ Google Form Event Registration
- **File:** `google-form-event-registration.json`
- **Category:** Events
- **Nodes:** Google Forms New Response → Google Calendar Create Event
- **Use Case:** Add event registrations to calendar
- **Status:** ⏳ Pending

### 24. ✅ Google Form Survey Results to Slack
- **File:** `google-form-survey-results-to-slack.json`
- **Category:** Analytics
- **Nodes:** Google Forms New Response → Slack Send Message
- **Use Case:** Share survey responses with team
- **Status:** ⏳ Pending

### 25. ✅ Google Form to HubSpot Contact
- **File:** `google-form-to-hubspot-contact.json`
- **Category:** Marketing
- **Nodes:** Google Forms New Response → HubSpot Create Contact
- **Use Case:** Add leads to marketing automation
- **Status:** ⏳ Pending

### 26. ✅ Google Form NPS Tracker
- **File:** `google-form-nps-tracker.json`
- **Category:** Analytics
- **Nodes:** Google Forms New Response → Google Sheets Append Row
- **Use Case:** Track Net Promoter Score over time
- **Status:** ⏳ Pending

---

## ✅ ClickUp Templates (15)

### 27. ✅ Email to ClickUp Task
- **File:** `email-to-clickup-task.json`
- **Category:** Productivity
- **Nodes:** Gmail New Email → ClickUp Create Task
- **Use Case:** Convert emails into tasks
- **Status:** ⏳ Pending

### 28. ✅ ClickUp Task Completion to Slack
- **File:** `clickup-task-completion-to-slack.json`
- **Category:** Collaboration
- **Nodes:** ClickUp Task Updated → Slack Send Message
- **Use Case:** Notify team when tasks are completed
- **Status:** ⏳ Pending

### 29. ✅ Salesforce Deal to ClickUp Project
- **File:** `salesforce-deal-to-clickup-project.json`
- **Category:** Sales
- **Nodes:** Salesforce Opportunity Won → ClickUp Create Task
- **Use Case:** Auto-create onboarding tasks when deals close
- **Status:** ⏳ Pending

### 30. ✅ ClickUp High Priority Alert
- **File:** `clickup-high-priority-alert.json`
- **Category:** Project Management
- **Nodes:** ClickUp Task Created → Slack Send Message
- **Use Case:** Alert team about high-priority tasks
- **Status:** ⏳ Pending

### 31. ✅ ClickUp Due Date Reminder
- **File:** `clickup-due-date-reminder.json`
- **Category:** Productivity
- **Nodes:** Schedule Trigger → ClickUp Get Tasks → Slack Send Message
- **Use Case:** Daily reminders for upcoming deadlines
- **Status:** ⏳ Pending

### 32. ✅ Form Submission to ClickUp
- **File:** `form-submission-to-clickup.json`
- **Category:** Productivity
- **Nodes:** Jotform New Submission → ClickUp Create Task
- **Use Case:** Create tasks from form submissions
- **Status:** ⏳ Pending

### 33. ✅ ClickUp Task to Google Calendar
- **File:** `clickup-task-to-google-calendar.json`
- **Category:** Productivity
- **Nodes:** ClickUp Task Created → Google Calendar Create Event
- **Use Case:** Sync tasks to calendar
- **Status:** ⏳ Pending

### 34. ✅ ClickUp Overdue Task Alert
- **File:** `clickup-overdue-task-alert.json`
- **Category:** Project Management
- **Nodes:** Schedule Trigger → ClickUp Get Tasks → Slack Send Message
- **Use Case:** Alert about overdue tasks
- **Status:** ⏳ Pending

### 35. ✅ ClickUp Sprint Status Report
- **File:** `clickup-sprint-status-report.json`
- **Category:** Project Management
- **Nodes:** Schedule Trigger → ClickUp Get Tasks → Google Sheets Append Row
- **Use Case:** Weekly sprint progress tracking
- **Status:** ⏳ Pending

### 36. ✅ ClickUp Comment Notification
- **File:** `clickup-comment-notification.json`
- **Category:** Collaboration
- **Nodes:** ClickUp Task Updated → Slack Send Message
- **Use Case:** Notify when comments are added
- **Status:** ⏳ Pending

### 37. ✅ GitHub Issue to ClickUp Task
- **File:** `github-issue-to-clickup-task.json`
- **Category:** Development
- **Nodes:** GitHub Issue Created → ClickUp Create Task
- **Use Case:** Sync GitHub issues to project management
- **Status:** ⏳ Pending

### 38. ✅ ClickUp Task to Zoom Meeting
- **File:** `clickup-task-to-zoom-meeting.json`
- **Category:** Collaboration
- **Nodes:** ClickUp Task Created → Zoom Create Meeting
- **Use Case:** Schedule meetings for important tasks
- **Status:** ⏳ Pending

### 39. ✅ ClickUp Checklist to Email
- **File:** `clickup-checklist-to-email.json`
- **Category:** Communication
- **Nodes:** ClickUp Task Completed → Gmail Send Email
- **Use Case:** Send completion notifications
- **Status:** ⏳ Pending

### 40. ✅ ClickUp Weekly Report
- **File:** `clickup-weekly-report.json`
- **Category:** Analytics
- **Nodes:** Schedule Trigger → ClickUp Get Tasks → Google Sheets Append Row
- **Use Case:** Weekly team productivity reports
- **Status:** ⏳ Pending

### 41. ✅ ClickUp Milestone Celebration
- **File:** `clickup-milestone-celebration.json`
- **Category:** Team
- **Nodes:** ClickUp Task Completed → Slack Send Message
- **Use Case:** Celebrate milestone completions
- **Status:** ⏳ Pending

---

## 📋 Jotform Templates (8)

### 42. ✅ Jotform to Google Sheets Logger
- **File:** `jotform-to-google-sheets-logger.json`
- **Category:** Analytics
- **Nodes:** Jotform New Submission → Google Sheets Append Row
- **Use Case:** Log all form submissions to spreadsheet
- **Status:** ⏳ Pending

### 43. ✅ Jotform to Slack Notification
- **File:** `jotform-to-slack-notification.json`
- **Category:** Collaboration
- **Nodes:** Jotform New Submission → Slack Send Message
- **Use Case:** Instant notifications for new form submissions
- **Status:** ⏳ Pending

### 44. ✅ Jotform to Salesforce Lead
- **File:** `jotform-to-salesforce-lead.json`
- **Category:** CRM
- **Nodes:** Jotform New Submission → Salesforce Create Lead
- **Use Case:** Auto-create CRM leads from form submissions
- **Status:** ⏳ Pending

### 45. ✅ Jotform to ClickUp Task
- **File:** `jotform-to-clickup-task.json`
- **Category:** Project Management
- **Nodes:** Jotform New Submission → ClickUp Create Task
- **Use Case:** Create tasks from bug reports/feature requests
- **Status:** ⏳ Pending

### 46. ✅ Jotform to Email Confirmation
- **File:** `jotform-to-email-confirmation.json`
- **Category:** Communication
- **Nodes:** Jotform New Submission → Gmail Send Email
- **Use Case:** Send confirmation emails to form submitters
- **Status:** ⏳ Pending

### 47. ✅ Jotform to Airtable Database
- **File:** `jotform-to-airtable-database.json`
- **Category:** Database
- **Nodes:** Jotform New Submission → Airtable Create Record
- **Use Case:** Store submissions in Airtable
- **Status:** ⏳ Pending

### 48. ✅ Jotform to Zoom Meeting Scheduler
- **File:** `jotform-to-zoom-meeting-scheduler.json`
- **Category:** Automation
- **Nodes:** Jotform New Submission → Zoom Create Meeting
- **Use Case:** Auto-schedule consultations from booking forms
- **Status:** ⏳ Pending

### 49. ✅ Jotform Payment to Slack
- **File:** `jotform-payment-to-slack.json`
- **Category:** E-commerce
- **Nodes:** Jotform New Submission → Slack Send Message
- **Use Case:** Notify team about payment submissions
- **Status:** ⏳ Pending

---

## 💼 Salesforce Templates (8)

### 50. ✅ New Lead to Slack Alert
- **File:** `salesforce-new-lead-to-slack.json`
- **Category:** Sales
- **Nodes:** Salesforce Lead Created → Slack Send Message
- **Use Case:** Instant team notifications for new leads
- **Status:** ⏳ Pending

### 51. ✅ Closed Deal Celebration
- **File:** `salesforce-closed-deal-celebration.json`
- **Category:** Sales
- **Nodes:** Salesforce Opportunity Won → Slack Send Message
- **Use Case:** Celebrate wins in team channel
- **Status:** ⏳ Pending

### 52. ✅ Salesforce Lead to Google Sheets
- **File:** `salesforce-lead-to-google-sheets.json`
- **Category:** Analytics
- **Nodes:** Salesforce Lead Created → Google Sheets Append Row
- **Use Case:** Track all leads in a spreadsheet
- **Status:** ⏳ Pending

### 53. ✅ Salesforce Contact to Email Welcome
- **File:** `salesforce-contact-to-email-welcome.json`
- **Category:** Marketing
- **Nodes:** Salesforce Contact Created → Gmail Send Email
- **Use Case:** Send welcome emails to new contacts
- **Status:** ⏳ Pending

### 54. ✅ Salesforce Opportunity to ClickUp
- **File:** `salesforce-opportunity-to-clickup.json`
- **Category:** Project Management
- **Nodes:** Salesforce Opportunity Created → ClickUp Create Task
- **Use Case:** Create project tasks for new opportunities
- **Status:** ⏳ Pending

### 55. ✅ Salesforce Lead to Zoom Consultation
- **File:** `salesforce-lead-to-zoom-consultation.json`
- **Category:** Sales
- **Nodes:** Salesforce Lead Created → Zoom Create Meeting
- **Use Case:** Auto-schedule consultation calls
- **Status:** ⏳ Pending

### 56. ✅ Salesforce Case to Slack Support
- **File:** `salesforce-case-to-slack-support.json`
- **Category:** Support
- **Nodes:** Salesforce Case Created → Slack Send Message
- **Use Case:** Alert support team about new cases
- **Status:** ⏳ Pending

### 57. ✅ Salesforce Deal Lost Analysis
- **File:** `salesforce-deal-lost-analysis.json`
- **Category:** Analytics
- **Nodes:** Salesforce Opportunity Lost → Google Sheets Append Row
- **Use Case:** Track lost deals for analysis
- **Status:** ⏳ Pending

---

## 📊 Google Ads Templates (3)

### 58. ✅ Daily Ad Performance to Slack
- **File:** `google-ads-daily-performance-to-slack.json`
- **Category:** Marketing
- **Nodes:** Schedule Trigger → Google Ads Get Campaign Stats → Slack Send Message
- **Use Case:** Daily marketing performance reports
- **Status:** ⏳ Pending

### 59. ✅ Low Budget Alert
- **File:** `google-ads-low-budget-alert.json`
- **Category:** Marketing
- **Nodes:** Schedule Trigger → Google Ads Get Campaign Stats → Slack Send Message
- **Use Case:** Alert when campaign budget is running low
- **Status:** ⏳ Pending

### 60. ✅ Weekly Ad Report to Google Sheets
- **File:** `google-ads-weekly-report-to-sheets.json`
- **Category:** Analytics
- **Nodes:** Schedule Trigger → Google Ads Get Campaign Stats → Google Sheets Append Row
- **Use Case:** Track ad performance over time
- **Status:** ⏳ Pending

---

## 🔄 Cross-Connector Templates (2)

### 61. ✅ Multi-Channel Lead Capture
- **File:** `multi-channel-lead-capture.json`
- **Category:** Marketing
- **Nodes:** Jotform New Submission → Salesforce Create Lead → Slack Send Message
- **Use Case:** Complete lead capture workflow
- **Status:** ⏳ Pending

### 62. ✅ Complete Onboarding Workflow
- **File:** `complete-onboarding-workflow.json`
- **Category:** Sales
- **Nodes:** Salesforce Opportunity Won → Zoom Create Meeting → ClickUp Create Task
- **Use Case:** Full client onboarding automation
- **Status:** ⏳ Pending

---

## Implementation Notes

### File Location
All templates are stored in: `/backend/src/common/templates/`

### Naming Convention
- Lowercase with hyphens
- Descriptive and concise
- Format: `{source}-to-{destination}-{action}.json`

### Template Structure
Each template includes:
- Unique UUID
- Name and description
- Category classification
- Canvas (nodes and edges)
- Trigger configuration
- Required connectors list
- Tags for discoverability
- Metadata and AI prompt

### Testing Checklist
- [ ] All connector types exist in database
- [ ] Node configurations are valid
- [ ] Edge connections are correct
- [ ] Required connectors are listed
- [ ] Tags include all relevant connectors
- [ ] Category matches use case

---

## Changelog

### 2025-11-20
- Initial template list created
- 62 templates planned
- Focus on Zoom, Google Forms, ClickUp, Jotform, Salesforce, Google Ads
