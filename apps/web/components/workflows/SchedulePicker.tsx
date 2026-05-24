'use client'

import { useState } from 'react'
import { Clock, Calendar, X, ChevronDown } from 'lucide-react'

type Frequency = 'daily' | 'weekly' | 'monthly' | 'hourly'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1)
const MINUTES = ['00', '15', '30', '45']
const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function toCron(freq: Frequency, hour: number, minute: string, ampm: 'AM' | 'PM', days: number[], monthDay: number): string {
  const h = ampm === 'PM' ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour)
  const m = parseInt(minute, 10)
  if (freq === 'hourly') return `${m} * * * *`
  if (freq === 'daily') return `${m} ${h} * * *`
  if (freq === 'weekly') return `${m} ${h} * * ${days.length ? days.join(',') : '*'}`
  if (freq === 'monthly') return `${m} ${h} ${monthDay} * *`
  return `${m} ${h} * * *`
}

function toHuman(freq: Frequency, hour: number, minute: string, ampm: 'AM' | 'PM', days: number[], monthDay: number): string {
  const time = `${hour}:${minute} ${ampm}`
  if (freq === 'hourly') return `Every hour at :${minute}`
  if (freq === 'daily') return `Every day at ${time}`
  if (freq === 'weekly') {
    const dayNames = days.map((d) => DAYS[d]).join(', ')
    return `Every ${dayNames || 'week'} at ${time}`
  }
  if (freq === 'monthly') return `Monthly on the ${ordinal(monthDay)} at ${time}`
  return time
}

type Props = {
  schedule: string | null
  scheduleMsg: string
  onSave: (schedule: string | null, msg: string) => void
}

export default function SchedulePicker({ schedule, scheduleMsg, onSave }: Props) {
  const [open, setOpen] = useState(false)
  const [freq, setFreq] = useState<Frequency>('daily')
  const [hour, setHour] = useState(9)
  const [minute, setMinute] = useState('00')
  const [ampm, setAmpm] = useState<'AM' | 'PM'>('AM')
  const [days, setDays] = useState<number[]>([1]) // Monday default
  const [monthDay, setMonthDay] = useState(1)
  const [msg, setMsg] = useState(scheduleMsg)

  function toggleDay(d: number) {
    setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])
  }

  function handleSave() {
    const cron = toCron(freq, hour, minute, ampm, days, monthDay)
    onSave(cron, msg)
    setOpen(false)
  }

  function handleClear() {
    onSave(null, '')
    setOpen(false)
  }

  const preview = toHuman(freq, hour, minute, ampm, days, monthDay)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 border rounded-md px-2 py-1 text-xs transition-colors ${
          schedule
            ? 'border-foreground bg-foreground text-background font-medium'
            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
        }`}
      >
        <Clock className="size-3" />
        {schedule ? toHumanFromCron(schedule) : 'Set Schedule'}
        <ChevronDown className="size-3 opacity-50" />
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-slate-600" />
                <span className="text-sm font-semibold text-slate-900">Schedule Workflow</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="size-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Frequency */}
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-2">Repeat</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['hourly', 'daily', 'weekly', 'monthly'] as Frequency[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFreq(f)}
                      className={`py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                        freq === f
                          ? 'bg-foreground text-background'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Day of week — weekly only */}
              {freq === 'weekly' && (
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-2">Days</label>
                  <div className="flex gap-1.5">
                    {DAYS.map((d, i) => (
                      <button
                        key={d}
                        onClick={() => toggleDay(i)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          days.includes(i)
                            ? 'bg-foreground text-background'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Day of month — monthly only */}
              {freq === 'monthly' && (
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-2">Day of month</label>
                  <select
                    value={monthDay}
                    onChange={(e) => setMonthDay(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    {MONTH_DAYS.map((d) => (
                      <option key={d} value={d}>{ordinal(d)}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Time — not for hourly */}
              {freq !== 'hourly' && (
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-2">Time</label>
                  <div className="flex gap-2 items-center">
                    {/* Hour */}
                    <select
                      value={hour}
                      onChange={(e) => setHour(Number(e.target.value))}
                      className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      {HOURS.map((h) => (
                        <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
                      ))}
                    </select>
                    <span className="text-slate-400 font-medium">:</span>
                    {/* Minute */}
                    <select
                      value={minute}
                      onChange={(e) => setMinute(e.target.value)}
                      className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      {MINUTES.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    {/* AM/PM */}
                    <div className="flex rounded-lg overflow-hidden border border-slate-200">
                      {(['AM', 'PM'] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setAmpm(p)}
                          className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                            ampm === p ? 'bg-foreground text-background' : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Minute offset for hourly */}
              {freq === 'hourly' && (
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-2">At minute</label>
                  <div className="flex gap-1.5">
                    {MINUTES.map((m) => (
                      <button
                        key={m}
                        onClick={() => setMinute(m)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          minute === m
                            ? 'bg-foreground text-background'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        :{m}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message */}
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-2">Message sent to workflow</label>
                <input
                  type="text"
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  placeholder="e.g. Generate daily sales report"
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Preview */}
              <div className="bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
                <p className="text-xs text-slate-500 mb-0.5">Preview</p>
                <p className="text-sm font-medium text-slate-800">{preview}</p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-4 border-t bg-slate-50/50">
              <button
                onClick={handleClear}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                Remove schedule
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setOpen(false)}
                  className="border border-slate-200 text-slate-600 rounded-lg px-3 py-1.5 text-xs hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="bg-foreground text-background rounded-lg px-4 py-1.5 text-xs font-medium hover:bg-foreground/90"
                >
                  Save Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Parse an existing cron back to a human label for the button
function toHumanFromCron(cron: string): string {
  try {
    const [m, h, dom, , dow] = cron.split(' ')
    const min = m.padStart(2, '0')
    if (h === '*') return `Every hour at :${min}`
    const hour24 = parseInt(h)
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    const ampm = hour24 < 12 ? 'AM' : 'PM'
    const time = `${hour12}:${min} ${ampm}`
    if (dom !== '*') return `Monthly on ${ordinal(parseInt(dom))} at ${time}`
    if (dow !== '*') {
      const names = dow.split(',').map((d) => DAYS[parseInt(d)]).join(', ')
      return `${names} at ${time}`
    }
    return `Daily at ${time}`
  } catch {
    return 'Scheduled'
  }
}
