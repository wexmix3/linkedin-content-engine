import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { content, status, source, context_tag, target_date, raw_input } = body

  if (!content) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({
      content,
      status: status ?? 'draft',
      source: source ?? 'manual',
      context_tag: context_tag ?? null,
      target_date: target_date ?? null,
      raw_input: raw_input ?? null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
