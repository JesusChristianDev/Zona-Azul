import { NextResponse } from 'next/server'
import fs from 'fs/promises'

const DATA_FILE = process.cwd() + '/data/appointments.json'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    // ensure data dir/file exists
    try {
      await fs.access(DATA_FILE)
    } catch (e) {
      await fs.mkdir(process.cwd() + '/data', { recursive: true })
      await fs.writeFile(DATA_FILE, '[]')
    }

    const raw = await fs.readFile(DATA_FILE, 'utf8')
    const arr = raw ? JSON.parse(raw) : []
    const entry = { id: `a-${Date.now()}`, ...body, created_at: new Date().toISOString(), status: 'pendiente' }
    arr.push(entry)
    await fs.writeFile(DATA_FILE, JSON.stringify(arr, null, 2))
    return NextResponse.json({ ok: true, appointment: entry }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 })
  }
}
