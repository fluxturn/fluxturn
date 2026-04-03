/**
 * Helper functions to convert friendly schedule configuration to cron expressions
 * Similar to frontend scheduleHelpers.ts
 */

export interface ScheduleConfig {
  mode: string;
  interval: number;
  hour?: number;
  minute?: number;
  dayOfWeek?: number[];
  dayOfMonth?: number;
  cronExpression?: string;
}

/**
 * Convert friendly schedule configuration to cron expression
 * Cron format: [minute] [hour] [day of month] [month] [day of week]
 */
export function scheduleToCron(config: ScheduleConfig): string {
  const {
    mode,
    interval,
    hour = 0,
    minute = 0,
    dayOfWeek = [],
    dayOfMonth = 1,
    cronExpression,
  } = config;

  switch (mode) {
    case 'minutes':
      // Every X minutes
      return `*/${interval} * * * *`;

    case 'hours':
      // Every X hours at specific minute
      return `${minute} */${interval} * * *`;

    case 'days':
      // Every X days at specific hour and minute
      if (interval === 1) {
        // Daily
        return `${minute} ${hour} * * *`;
      } else {
        // Every X days
        return `${minute} ${hour} */${interval} * *`;
      }

    case 'weeks':
      // Every X weeks on specific weekdays at specific hour and minute
      // Convert dayOfWeek array to cron format (0-6, where 0 = Sunday)
      const days = dayOfWeek.length > 0 ? dayOfWeek.sort().join(',') : '*';
      return `${minute} ${hour} * * ${days}`;

    case 'months':
      // Every X months on specific day at specific hour and minute
      if (interval === 1) {
        // Monthly
        return `${minute} ${hour} ${dayOfMonth} * *`;
      } else {
        // Every X months
        return `${minute} ${hour} ${dayOfMonth} */${interval} *`;
      }

    case 'cron':
      // Custom cron expression
      return cronExpression || '*/5 * * * *';

    default:
      // Default to every 5 minutes
      return '*/5 * * * *';
  }
}

/**
 * Get human-readable description of schedule
 */
export function scheduleDescription(config: ScheduleConfig): string {
  const {
    mode,
    interval,
    hour = 0,
    minute = 0,
    dayOfWeek = [],
    dayOfMonth = 1,
    cronExpression,
  } = config;

  const HOURS_MAP: Record<number, string> = {
    0: 'Midnight',
    12: 'Noon',
  };
  for (let i = 1; i < 12; i++) {
    HOURS_MAP[i] = `${i}am`;
  }
  for (let i = 13; i < 24; i++) {
    HOURS_MAP[i] = `${i - 12}pm`;
  }

  const hourLabel = HOURS_MAP[hour] || `${hour}:00`;
  const timeLabel = `${hourLabel}:${String(minute).padStart(2, '0')}`;

  const WEEKDAYS = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  switch (mode) {
    case 'minutes':
      return `Every ${interval} minute${interval !== 1 ? 's' : ''}`;

    case 'hours':
      return `Every ${interval} hour${interval !== 1 ? 's' : ''} at minute ${minute}`;

    case 'days':
      return `Every ${interval} day${interval !== 1 ? 's' : ''} at ${timeLabel}`;

    case 'weeks':
      const days = dayOfWeek.map((d) => WEEKDAYS[d]).join(', ');
      return `Every ${interval} week${interval !== 1 ? 's' : ''} on ${days || 'no days selected'} at ${timeLabel}`;

    case 'months':
      return `Every ${interval} month${interval !== 1 ? 's' : ''} on day ${dayOfMonth} at ${timeLabel}`;

    case 'cron':
      return `Custom cron: ${cronExpression}`;

    default:
      return 'Not configured';
  }
}
