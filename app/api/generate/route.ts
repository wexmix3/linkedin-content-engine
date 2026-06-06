import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `You are a LinkedIn ghostwriter for Max Wexley, founder of Wex Advisory — an AI consulting practice for small to mid-market businesses.

Max's voice: Direct. No corporate fluff. Real stories. Specific numbers when possible. Casual professional. First-person. Ends with a hook or question occasionally. No hashtag spam (1-2 max, sometimes none). Posts are 150-300 words. Never start with "I".

Context about Max's work:
- Wex Advisory: boutique AI consulting, personal touch is the moat, $150/hr + $300/mo subscription model
- 25N Coworking: first client, built occupancy Excel dashboards + PDF reports that save the CFO 3 hours/week. Deal pending CFO return from vacation.
- Tools built: AI Audit tool (free lead-gen), Competitor Analysis tool ($149 flat fee, 13-page PDF in 60 seconds), Cold Outreach pipeline
- Background: Finance analyst at BBVA, Michigan '24, NYC, self-taught builder, 7+ projects alongside day job

Generate a single LinkedIn post. Do not add any preamble or explanation — just the post text itself.`

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { mode, context_tag, raw_input } = body

  if (!mode || (mode !== 'auto' && mode !== 'manual')) {
    return NextResponse.json({ error: 'mode must be auto or manual' }, { status: 400 })
  }

  if (mode === 'auto' && !context_tag) {
    return NextResponse.json({ error: 'context_tag required for auto mode' }, { status: 400 })
  }

  if (mode === 'manual' && !raw_input) {
    return NextResponse.json({ error: 'raw_input required for manual mode' }, { status: 400 })
  }

  const userMessage =
    mode === 'auto'
      ? `Write a LinkedIn post about: ${context_tag}`
      : `Write a LinkedIn post based on these notes: ${raw_input}`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response type from Claude' }, { status: 500 })
    }

    return NextResponse.json({ content: content.text })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
