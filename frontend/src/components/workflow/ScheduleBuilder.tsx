import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface ScheduleBuilderProps {
  value: {
    mode?: string;
    interval?: number;
    hour?: number;
    minute?: number;
    dayOfWeek?: number[];
    dayOfMonth?: number;
    cronExpression?: string;
  };
  onChange: (value: any) => void;
}

const WEEKDAYS = [
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
  { label: "Sunday", value: 0 },
];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  if (i === 0) return { label: "Midnight", value: 0 };
  if (i === 12) return { label: "Noon", value: 12 };
  if (i < 12) return { label: `${i}am`, value: i };
  return { label: `${i - 12}pm`, value: i };
});

export function ScheduleBuilder({ value, onChange }: ScheduleBuilderProps) {
  const [mode, setMode] = useState(value?.mode || "minutes");
  const [interval, setInterval] = useState(value?.interval || 5);
  const [hour, setHour] = useState(value?.hour ?? 9);
  const [minute, setMinute] = useState(value?.minute ?? 0);
  const [dayOfWeek, setDayOfWeek] = useState<number[]>(value?.dayOfWeek || [1, 2, 3, 4, 5]);
  const [dayOfMonth, setDayOfMonth] = useState(value?.dayOfMonth || 1);
  const [cronExpression, setCronExpression] = useState(value?.cronExpression || "*/5 * * * *");

  // Update parent whenever local state changes
  useEffect(() => {
    const newValue = {
      mode,
      interval,
      hour,
      minute,
      dayOfWeek,
      dayOfMonth,
      cronExpression: mode === "cron" ? cronExpression : undefined,
    };
    onChange(newValue);
  }, [mode, interval, hour, minute, dayOfWeek, dayOfMonth, cronExpression]);

  const handleWeekdayToggle = (day: number) => {
    setDayOfWeek((prev) => {
      if (prev.includes(day)) {
        return prev.filter((d) => d !== day);
      } else {
        return [...prev, day].sort();
      }
    });
  };

  const getScheduleDescription = () => {
    switch (mode) {
      case "minutes":
        return `Every ${interval} minute${interval !== 1 ? "s" : ""}`;
      case "hours":
        return `Every ${interval} hour${interval !== 1 ? "s" : ""} at minute ${minute}`;
      case "days":
        return `Every ${interval} day${interval !== 1 ? "s" : ""} at ${HOURS[hour]?.label} and ${minute} minute${minute !== 1 ? "s" : ""}`;
      case "weeks":
        const days = dayOfWeek.map((d) => WEEKDAYS.find((w) => w.value === d)?.label).join(", ");
        return `Every ${interval} week${interval !== 1 ? "s" : ""} on ${days || "no days selected"} at ${HOURS[hour]?.label}:${String(minute).padStart(2, "0")}`;
      case "months":
        return `Every ${interval} month${interval !== 1 ? "s" : ""} on day ${dayOfMonth} at ${HOURS[hour]?.label}:${String(minute).padStart(2, "0")}`;
      case "cron":
        return `Custom cron: ${cronExpression}`;
      default:
        return "";
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode Selection */}
      <div className="space-y-2">
        <Label className="text-white">Trigger Interval</Label>
        <Select value={mode} onValueChange={setMode}>
          <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="minutes" className="text-white hover:bg-gray-700">
              Minutes
            </SelectItem>
            <SelectItem value="hours" className="text-white hover:bg-gray-700">
              Hours
            </SelectItem>
            <SelectItem value="days" className="text-white hover:bg-gray-700">
              Days
            </SelectItem>
            <SelectItem value="weeks" className="text-white hover:bg-gray-700">
              Weeks
            </SelectItem>
            <SelectItem value="months" className="text-white hover:bg-gray-700">
              Months
            </SelectItem>
            <SelectItem value="cron" className="text-white hover:bg-gray-700">
              Custom (Cron)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Minutes Mode */}
      {mode === "minutes" && (
        <div className="space-y-2">
          <Label className="text-white">Minutes Between Triggers</Label>
          <Input
            type="number"
            min="1"
            max="59"
            value={interval}
            onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
            className="bg-gray-800 border-gray-700 text-white"
          />
          <p className="text-xs text-gray-400">
            Number of minutes between each workflow trigger
          </p>
        </div>
      )}

      {/* Hours Mode */}
      {mode === "hours" && (
        <>
          <div className="space-y-2">
            <Label className="text-white">Hours Between Triggers</Label>
            <Input
              type="number"
              min="1"
              max="23"
              value={interval}
              onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
              className="bg-gray-800 border-gray-700 text-white"
            />
            <p className="text-xs text-gray-400">
              Number of hours between each workflow trigger
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-white">Trigger at Minute</Label>
            <Input
              type="number"
              min="0"
              max="59"
              value={minute}
              onChange={(e) => setMinute(parseInt(e.target.value) || 0)}
              className="bg-gray-800 border-gray-700 text-white"
            />
            <p className="text-xs text-gray-400">
              The minute past the hour to trigger (0-59)
            </p>
          </div>
        </>
      )}

      {/* Days Mode */}
      {mode === "days" && (
        <>
          <div className="space-y-2">
            <Label className="text-white">Days Between Triggers</Label>
            <Input
              type="number"
              min="1"
              max="365"
              value={interval}
              onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
              className="bg-gray-800 border-gray-700 text-white"
            />
            <p className="text-xs text-gray-400">
              Number of days between each workflow trigger
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-white">Trigger at Hour</Label>
            <Select value={String(hour)} onValueChange={(val) => setHour(parseInt(val))}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 max-h-60">
                {HOURS.map((h) => (
                  <SelectItem key={h.value} value={String(h.value)} className="text-white hover:bg-gray-700">
                    {h.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-white">Trigger at Minute</Label>
            <Input
              type="number"
              min="0"
              max="59"
              value={minute}
              onChange={(e) => setMinute(parseInt(e.target.value) || 0)}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </>
      )}

      {/* Weeks Mode */}
      {mode === "weeks" && (
        <>
          <div className="space-y-2">
            <Label className="text-white">Weeks Between Triggers</Label>
            <Input
              type="number"
              min="1"
              max="52"
              value={interval}
              onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white">Trigger on Weekdays</Label>
            <div className="grid grid-cols-2 gap-2">
              {WEEKDAYS.map((day) => (
                <div key={day.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${day.value}`}
                    checked={dayOfWeek.includes(day.value)}
                    onCheckedChange={() => handleWeekdayToggle(day.value)}
                    className="border-gray-600"
                  />
                  <label
                    htmlFor={`day-${day.value}`}
                    className="text-sm text-white cursor-pointer"
                  >
                    {day.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-white">Trigger at Hour</Label>
            <Select value={String(hour)} onValueChange={(val) => setHour(parseInt(val))}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 max-h-60">
                {HOURS.map((h) => (
                  <SelectItem key={h.value} value={String(h.value)} className="text-white hover:bg-gray-700">
                    {h.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-white">Trigger at Minute</Label>
            <Input
              type="number"
              min="0"
              max="59"
              value={minute}
              onChange={(e) => setMinute(parseInt(e.target.value) || 0)}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </>
      )}

      {/* Months Mode */}
      {mode === "months" && (
        <>
          <div className="space-y-2">
            <Label className="text-white">Months Between Triggers</Label>
            <Input
              type="number"
              min="1"
              max="12"
              value={interval}
              onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white">Trigger at Day of Month</Label>
            <Input
              type="number"
              min="1"
              max="31"
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(parseInt(e.target.value) || 1)}
              className="bg-gray-800 border-gray-700 text-white"
            />
            <p className="text-xs text-gray-400">
              If a month doesn't have this day, the trigger won't run that month
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-white">Trigger at Hour</Label>
            <Select value={String(hour)} onValueChange={(val) => setHour(parseInt(val))}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 max-h-60">
                {HOURS.map((h) => (
                  <SelectItem key={h.value} value={String(h.value)} className="text-white hover:bg-gray-700">
                    {h.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-white">Trigger at Minute</Label>
            <Input
              type="number"
              min="0"
              max="59"
              value={minute}
              onChange={(e) => setMinute(parseInt(e.target.value) || 0)}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </>
      )}

      {/* Cron Mode */}
      {mode === "cron" && (
        <div className="space-y-2">
          <Label className="text-white">Cron Expression</Label>
          <Input
            value={cronExpression}
            onChange={(e) => setCronExpression(e.target.value)}
            placeholder="*/5 * * * *"
            className="bg-gray-800 border-gray-700 text-white font-mono"
          />
          <p className="text-xs text-gray-400">
            Format: [Minute] [Hour] [Day of Month] [Month] [Day of Week]
          </p>
          <p className="text-xs text-gray-400">
            Need help?{" "}
            <a
              href="https://crontab.guru/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:underline"
            >
              Cron Expression Generator
            </a>
          </p>
        </div>
      )}

      {/* Schedule Preview */}
      <Alert className="bg-cyan-950/30 border-cyan-800/50">
        <Info className="h-4 w-4 text-cyan-400" />
        <AlertDescription className="text-sm text-cyan-200">
          {getScheduleDescription()}
        </AlertDescription>
      </Alert>
    </div>
  );
}
