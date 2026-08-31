// Moves an imported timetable to another device without a server: the whole
// schedule plus the picks are packed into the URL fragment, so the data stays
// in the link (which never reaches the Pages host) and in the target browser.

import type { Lesson, Schedule } from './parseSchedule'

export type Share = { schedule: Schedule; picks: string[] }

/** Positional form of a lesson — the field names cost more than the values. */
type PackedLesson = [
  day: string,
  dayIndex: number,
  startIndex: number,
  span: number,
  type: 'l' | 's',
  room: string,
  group: string,
  course: string,
  courseId: string,
  teacher: string,
  notes: number[],
  week: 'even' | 'odd' | null,
]

type Packed = {
  v: 1
  l: Schedule['lang']
  s: string
  d: string
  c: string
  h: string[]
  n: Record<string, string>
  e: PackedLesson[]
  p: string[]
}

const toBase64Url = (bytes: Uint8Array) => {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const fromBase64Url = (token: string) => {
  const binary = atob(token.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

async function squeeze(bytes: Uint8Array, mode: 'gzip' | 'gunzip') {
  const Stream = mode === 'gzip' ? globalThis.CompressionStream : globalThis.DecompressionStream
  if (!Stream) return null // older Safari: fall back to the uncompressed payload
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new Stream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

export async function encodeShare({ schedule, picks }: Share): Promise<string> {
  const packed: Packed = {
    v: 1,
    l: schedule.lang,
    s: schedule.student,
    d: schedule.validity,
    c: schedule.lastChange,
    h: schedule.hours,
    n: schedule.notes,
    e: schedule.events.map((e) => [
      e.day,
      e.dayIndex,
      e.startIndex,
      e.span,
      e.type === 'lecture' ? 'l' : 's',
      e.room,
      e.group,
      e.course,
      e.courseId,
      e.teacher,
      e.notes,
      e.week,
    ]),
    p: picks,
  }

  const raw = new TextEncoder().encode(JSON.stringify(packed))
  const gzipped = await squeeze(raw, 'gzip')
  return gzipped ? `1${toBase64Url(gzipped)}` : `0${toBase64Url(raw)}`
}

export async function decodeShare(token: string): Promise<Share> {
  const bytes = fromBase64Url(token.slice(1))
  const raw = token[0] === '1' ? await squeeze(bytes, 'gunzip') : bytes
  if (!raw) throw new Error('decompression unavailable')

  const packed = JSON.parse(new TextDecoder().decode(raw)) as Packed
  if (packed.v !== 1) throw new Error('unknown share version')

  const time = (index: number, side: 0 | 1) =>
    packed.h[index].split('-')[side].replace('.', ':')

  const events: Lesson[] = packed.e.map(
    ([day, dayIndex, startIndex, span, type, room, group, course, courseId, teacher, notes, week]) => ({
      day,
      dayIndex,
      startIndex,
      span,
      start: time(startIndex, 0),
      end: time(startIndex + span - 1, 1),
      type: type === 'l' ? 'lecture' : 'seminar',
      room,
      group,
      course,
      courseId,
      teacher,
      notes,
      week,
    }),
  )

  return {
    schedule: {
      lang: packed.l,
      student: packed.s,
      validity: packed.d,
      lastChange: packed.c,
      hours: packed.h,
      notes: packed.n,
      events,
    },
    picks: packed.p ?? [],
  }
}

/**
 * The bookmarklet hands the whole UIS page over the same way: gzipped into the
 * fragment, because Chrome on Android refuses clipboard writes from a
 * bookmarklet launched from the address bar.
 */
export async function decodePage(token: string): Promise<string> {
  const raw = await squeeze(fromBase64Url(token), 'gunzip')
  if (!raw) throw new Error('decompression unavailable')
  return new TextDecoder().decode(raw)
}

/** The link the other device opens; the payload lives in the fragment only. */
export const shareUrl = (token: string) =>
  `${location.origin}${location.pathname}#s=${token}`
