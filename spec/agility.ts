// Stage 0 reference contracts. These are not connected to the live cycle importer.
export const EVENT_SCHEMA_VERSION = 1;
export const MIN_MEASURED_EVENTS = 16;
export const PILOT_MAX_RECORDING_EVENTS = 100_000;
export type TimeUnit = 's' | 'ms' | 'us' | 'ns' | 'tu';
export type Channel = {
  id: string; name: string; quantity: 'frequency' | 'pri' | 'pulse-width' | 'numeric'; unit: string;
  origin: 'supplied' | 'derived'; priConvention?: 'preceding-event'; derivation?: string;
};
export type EventRow = { t: number; values: Record<string, number | null> };
export type EventRecording = {
  schemaVersion: 1; id: string; name: string; streamId: string; captureId: string | null;
  time: { unit: TimeUnit; basis: 'relative' | 'absolute'; origin?: string };
  channels: Channel[]; events: EventRow[];
  provenance: { source: 'synthetic' | 'measured' | 'legacy'; file?: string; generator?: string; generatorVersion?: string; seed?: number };
};
export type StreamProfile = { id: string; name: string; kind: 'emitter' | 'candidate'; attribution: 'reviewed' | 'uncertain'; notes: string };
// All intervals are source-event indices [startEvent, endEvent); originals are never copied into windows.
export type ObservationWindow = {
  id: string; recordingId: string; startEvent: number; endEvent: number;
  reviewState: 'unreviewed' | 'associated' | 'unresolved';
};
export type EvidenceScope = { windowId: string; startEvent: number; endEvent: number; channelIds: string[] };
export type EvidenceAssociation = {
  id: string; patternId: string; patternRevision: number; decisionId: string;
  role: 'support' | 'variant' | 'challenge'; scope: EvidenceScope;
};
export type PatternRecord = {
  id: string; streamId: string; name: string; revision: number; representativeWindowId: string;
  evidenceIds: string[]; variantIds: string[]; notes: string;
};
export type PatternVariant = { id: string; patternId: string; evidenceIds: string[]; description: string };
export type ReviewedRelationship = {
  id: string; fromPatternId: string; toPatternId: string; revision: number;
  kind: 'coordinated-similarity' | 'scale-variant' | 'partial-match' | 'single-parameter-similarity' | 'partial-channel-similarity';
  evidence: { from: EvidenceScope; to: EvidenceScope }; decisionId: string;
};
export type ReviewDecision = {
  id: string; timestamp: string;
  action: 'support' | 'variant' | 'new-pattern' | 'challenge' | 'leave-unresolved' | 'confirm-link' | 'reject-suggestion' | 'undo';
  windowId?: string; patternId?: string; relationshipId?: string; reversesDecisionId?: string;
  explanation: string; evidence: EvidenceScope[]; matcherVersion?: string; settingsHash?: string; match?: MatchExplanation; score?: number;
};
export type MatchExplanation = {
  query: EvidenceScope; target: EvidenceScope;
  scope: 'multi-parameter' | 'single-parameter' | 'insufficient-evidence'; partial: boolean;
  sharedAlignment: { timeOffset: number; timeScale: number; timeUnit: TimeUnit };
  channelResults: { channelId: string; agreement: number | null; missing: boolean; notes: string }[];
  limitations: string[]; matcherVersion: string; settingsHash: string;
};
export type MatchSuggestion = {
  id: string; queryWindowId: string; targetPatternId: string; targetPatternRevision: number;
  collectionRevision: number; inputFingerprint: string; explanation: MatchExplanation;
};
export type EventSummary = { measuredCounts: Record<string, number>; overlapCounts: Record<string, number>; jointEvents: number };
const timeUnits: string[] = ['s', 'ms', 'us', 'ns', 'tu'];
const frequencyUnits = ['Hz', 'kHz', 'MHz', 'GHz', 'fu'];
const fail = (message: string): never => { throw new Error(message); };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const nonempty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const id = (v: unknown): v is string => nonempty(v) && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(v) && !['constructor', 'prototype'].includes(v);

/** Validate the draft recording boundary without inferring values or synchronization. */
export function validateEventRecording(value: unknown): EventRecording {
  if (!object(value) || value.schemaVersion !== EVENT_SCHEMA_VERSION) fail('Unsupported event recording schema.');
  const data = value as unknown as EventRecording;
  if (![data.id, data.streamId].every(id) || !nonempty(data.name)) fail('Recording and stream identifiers and a name are required.');
  if (data.captureId !== null && !id(data.captureId)) fail('Supply a capture identifier or explicit null for unknown provenance.');
  if (!object(data.time) || !timeUnits.includes(data.time.unit) || !['relative', 'absolute'].includes(data.time.basis)) fail('Declare supported timestamp units and basis.');
  if (data.time.basis === 'absolute' && (!nonempty(data.time.origin) || !Number.isFinite(Date.parse(data.time.origin)))) fail('Absolute timestamps need an explicit parseable origin.');
  if (!object(data.provenance) || !['synthetic', 'measured', 'legacy'].includes(data.provenance.source)) fail('Declare source provenance.');
  if (!Array.isArray(data.channels) || !data.channels.length) fail('Declare at least one channel.');
  for (const c of data.channels) {
    if (!object(c) || !id(c.id) || !nonempty(c.name) || !nonempty(c.unit) || !['frequency', 'pri', 'pulse-width', 'numeric'].includes(c.quantity) || !['supplied', 'derived'].includes(c.origin)) fail('Each channel needs an identifier, name, quantity, units and origin.');
    if (c.quantity === 'frequency' && !frequencyUnits.includes(c.unit) || ['pri', 'pulse-width'].includes(c.quantity) && !timeUnits.includes(c.unit)) fail('Declare compatible physical or arbitrary units for the channel.');
    if (c.quantity === 'pri' && c.priConvention !== 'preceding-event') fail('PRI must declare the preceding-event convention.');
    if (c.origin === 'derived' && !nonempty(c.derivation)) fail('Derived channels need an explicit derivation.');
  }
  const channelIds = data.channels.map(c => c.id);
  if (new Set(channelIds).size !== channelIds.length) fail('Channel identifiers must be unique.');
  if (!Array.isArray(data.events) || data.events.length < MIN_MEASURED_EVENTS || data.events.length > PILOT_MAX_RECORDING_EVENTS) fail('A recording needs 16–100,000 timestamped events.');
  let previous = -Infinity;
  const counts = Object.fromEntries(channelIds.map(c => [c, 0]));
  for (const event of data.events) {
    if (!object(event) || !Number.isFinite(event.t) || event.t <= previous) fail('Event timestamps must be finite and strictly increasing.');
    previous = event.t;
    if (!object(event.values) || Object.keys(event.values).length !== channelIds.length || channelIds.some(c => !Object.hasOwn(event.values, c))) fail('Represent every declared channel explicitly; use null for missing values.');
    for (const c of data.channels) {
      const v = event.values[c.id];
      if (v === null) continue;
      if (typeof v !== 'number' || !Number.isFinite(v) || ['pri', 'pulse-width'].includes(c.quantity) && v <= 0) fail('Values must be finite numbers or null; PRI and pulse width must be positive.');
      if (c.origin === 'supplied') counts[c.id]++;
    }
  }
  const duration = data.events.at(-1)!.t - data.events[0].t;
  if (!Number.isFinite(duration) || duration <= 0) fail('Events must span finite nonzero time.');
  if (!Object.values(counts).some(n => n >= MIN_MEASURED_EVENTS)) fail('At least one supplied channel needs 16 measured values.');
  return structuredClone(data);
}

/** Report overlap without choosing the multi-parameter matching cutoff. */
export function summarizeEvents(recording: EventRecording, startEvent = 0, endEvent = recording.events.length): EventSummary {
  if (![startEvent, endEvent].every(Number.isInteger) || startEvent < 0 || endEvent > recording.events.length || startEvent >= endEvent) fail('Use a nonempty source-event interval [startEvent, endEvent).');
  const supplied = recording.channels.filter(c => c.origin === 'supplied').map(c => c.id);
  const measuredCounts = Object.fromEntries(supplied.map(c => [c, 0]));
  const overlapCounts: Record<string, number> = {};
  let jointEvents = 0;
  for (const event of recording.events.slice(startEvent, endEvent)) {
    const present = supplied.filter(c => event.values[c] !== null);
    for (const c of present) measuredCounts[c]++;
    if (present.length >= 2) jointEvents++;
    for (let i = 0; i < supplied.length; i++) for (let j = i + 1; j < supplied.length; j++) {
      const key = `${supplied[i]}|${supplied[j]}`;
      overlapCounts[key] = (overlapCounts[key] || 0) + Number(present.includes(supplied[i]) && present.includes(supplied[j]));
    }
  }
  return { measuredCounts, overlapCounts, jointEvents };
}
