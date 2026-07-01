'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Zap, PenLine } from 'lucide-react'
import { Post } from '@/lib/types'

const SURFACE = '#111827'
const BORDER = '#1f2937'
const GOLD = '#c9a84c'
const TEXT_PRIMARY = '#f9fafb'
const TEXT_SECONDARY = '#9ca3af'
const TEXT_MUTED = '#4b5563'

const CONTEXT_TAGS = [
  'Wex Advisory',
  '25N Deal',
  'Tools Built',
  'General Insight',
]

type Mode = 'auto' | 'manual'

function GeneratePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  const [mode, setMode] = useState<Mode>('auto')
  const [contextTag, setContextTag] = useState(CONTEXT_TAGS[0])
  const [rawInput, setRawInput] = useState('')
  const [draft, setDraft] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editPost, setEditPost] = useState<Post | null>(null)
  const [loadingEdit, setLoadingEdit] = useState(false)

  // Load existing post if editing
  useEffect(() => {
    if (!editId) return
    setLoadingEdit(true)
    fetch('/api/posts')
      .then((r) => r.json())
      .then((posts: Post[]) => {
        const found = posts.find((p) => p.id === editId)
        if (found) {
          setEditPost(found)
          setDraft(found.content)
          setTargetDate(found.target_date ?? '')
          if (found.raw_input) {
            setMode('manual')
            setRawInput(found.raw_input)
          } else if (found.context_tag) {
            setMode('auto')
            setContextTag(found.context_tag)
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingEdit(false))
  }, [editId])

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const body =
        mode === 'auto'
          ? { mode: 'auto', context_tag: contextTag }
          : { mode: 'manual', raw_input: rawInput }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Generation failed')
      setDraft(data.content)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
    if (!draft.trim()) return
    setSaving(true)
    setError(null)
    try {
      if (editId && editPost) {
        // Update existing post
        const res = await fetch(`/api/posts/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: draft,
            target_date: targetDate || null,
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? 'Save failed')
        }
      } else {
        // Create new post
        const body: Record<string, unknown> = {
          content: draft,
          status: 'draft',
          source: mode,
          target_date: targetDate || null,
        }
        if (mode === 'auto') body.context_tag = contextTag
        if (mode === 'manual') body.raw_input = rawInput

        const res = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? 'Save failed')
        }
      }
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  async function handleApprove() {
    if (!editId) return
    setSaving(true)
    setError(null)
    try {
      // Save content first, then set approved
      const res = await fetch(`/api/posts/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: draft,
          status: 'approved',
          target_date: targetDate || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Approve failed')
      }
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%',
    backgroundColor: '#0d1424',
    border: `1px solid ${BORDER}`,
    borderRadius: '6px',
    color: TEXT_PRIMARY,
    fontSize: '14px',
    padding: '10px 12px',
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'vertical' as const,
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0e1a' }}>
      {/* Nav */}
      <nav
        style={{
          backgroundColor: SURFACE,
          borderBottom: `1px solid ${BORDER}`,
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '32px',
          height: '56px',
        }}
      >
        <span style={{ color: GOLD, fontWeight: 700, fontSize: '16px', letterSpacing: '0.5px' }}>
          LinkedIn Engine
        </span>
        <Link href="/" style={{ color: TEXT_SECONDARY, textDecoration: 'none', fontSize: '14px' }}>
          Queue
        </Link>
        <Link
          href="/generate"
          style={{
            color: GOLD,
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 600,
            borderBottom: `2px solid ${GOLD}`,
            paddingBottom: '2px',
          }}
        >
          Generate
        </Link>
      </nav>

      <div style={{ padding: '32px 24px', maxWidth: '760px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: TEXT_PRIMARY, margin: '0 0 24px' }}>
          {editId ? 'Edit Post' : 'New Post'}
        </h1>

        {loadingEdit && (
          <p style={{ color: TEXT_SECONDARY, fontSize: '14px' }}>Loading post...</p>
        )}

        {!loadingEdit && (
          <>
            {/* Mode toggle */}
            <div
              style={{
                display: 'flex',
                backgroundColor: SURFACE,
                border: `1px solid ${BORDER}`,
                borderRadius: '8px',
                padding: '4px',
                marginBottom: '24px',
                width: 'fit-content',
                gap: '4px',
              }}
            >
              <button
                onClick={() => setMode('auto')}
                style={{
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: mode === 'auto' ? GOLD : 'transparent',
                  color: mode === 'auto' ? '#0a0e1a' : TEXT_SECONDARY,
                  fontSize: '13px',
                  fontWeight: mode === 'auto' ? 700 : 400,
                  cursor: 'pointer',
                }}
              >
                <Zap className="w-4 h-4 inline-block mr-1.5 align-middle" /> Auto-generate
              </button>
              <button
                onClick={() => setMode('manual')}
                style={{
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: mode === 'manual' ? GOLD : 'transparent',
                  color: mode === 'manual' ? '#0a0e1a' : TEXT_SECONDARY,
                  fontSize: '13px',
                  fontWeight: mode === 'manual' ? 700 : 400,
                  cursor: 'pointer',
                }}
              >
                <PenLine className="w-4 h-4 inline-block mr-1.5 align-middle" /> Paste raw input
              </button>
            </div>

            {/* Input section */}
            <div
              style={{
                backgroundColor: SURFACE,
                border: `1px solid ${BORDER}`,
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '20px',
              }}
            >
              {mode === 'auto' ? (
                <div>
                  <label
                    style={{ fontSize: '13px', color: TEXT_SECONDARY, display: 'block', marginBottom: '10px' }}
                  >
                    Context tag
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    {CONTEXT_TAGS.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setContextTag(tag)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '20px',
                          border: `1px solid ${contextTag === tag ? GOLD : BORDER}`,
                          backgroundColor: contextTag === tag ? GOLD + '22' : 'transparent',
                          color: contextTag === tag ? GOLD : TEXT_SECONDARY,
                          fontSize: '13px',
                          cursor: 'pointer',
                          fontWeight: contextTag === tag ? 600 : 400,
                        }}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label
                    style={{ fontSize: '13px', color: TEXT_SECONDARY, display: 'block', marginBottom: '10px' }}
                  >
                    Raw notes / bullet points
                  </label>
                  <textarea
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                    placeholder="Paste your notes, bullet points, or ideas here..."
                    rows={6}
                    style={inputStyle}
                  />
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={generating || (mode === 'manual' && !rawInput.trim())}
                style={{
                  backgroundColor: generating ? TEXT_MUTED : GOLD,
                  color: '#0a0e1a',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: generating ? 'not-allowed' : 'pointer',
                  marginTop: mode === 'manual' ? '12px' : '0',
                }}
              >
                {generating ? 'Generating...' : 'Generate'}
              </button>
            </div>

            {/* Draft output */}
            {draft && (
              <div
                style={{
                  backgroundColor: SURFACE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: '8px',
                  padding: '20px',
                  marginBottom: '20px',
                }}
              >
                <label
                  style={{ fontSize: '13px', color: TEXT_SECONDARY, display: 'block', marginBottom: '10px' }}
                >
                  Draft
                </label>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={10}
                  style={{ ...inputStyle, lineHeight: '1.7' }}
                />

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    style={{
                      backgroundColor: 'transparent',
                      color: TEXT_SECONDARY,
                      border: `1px solid ${BORDER}`,
                      padding: '7px 14px',
                      borderRadius: '5px',
                      fontSize: '13px',
                      cursor: generating ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {generating ? 'Regenerating...' : 'Regenerate'}
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '13px', color: TEXT_SECONDARY }}>Target date:</label>
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      style={{
                        ...inputStyle,
                        width: 'auto',
                        padding: '6px 10px',
                        colorScheme: 'dark',
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Target date (when no draft yet but editing) */}
            {!draft && editId && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', color: TEXT_SECONDARY, display: 'block', marginBottom: '8px' }}>
                  Target date
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  style={{ ...inputStyle, width: 'auto', colorScheme: 'dark' }}
                />
              </div>
            )}

            {error && (
              <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>
                Error: {error}
              </p>
            )}

            {/* Save / Approve actions */}
            {(draft || editId) && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleSave}
                  disabled={saving || !draft.trim()}
                  style={{
                    backgroundColor: saving ? TEXT_MUTED : GOLD,
                    color: '#0a0e1a',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: saving || !draft.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Saving...' : editId ? 'Save Changes' : 'Save to Queue'}
                </button>

                {editId && (
                  <button
                    onClick={handleApprove}
                    disabled={saving || !draft.trim()}
                    style={{
                      backgroundColor: '#10b981',
                      color: '#fff',
                      border: 'none',
                      padding: '10px 24px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: saving || !draft.trim() ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Approve
                  </button>
                )}

                <Link
                  href="/"
                  style={{
                    color: TEXT_MUTED,
                    fontSize: '14px',
                    textDecoration: 'none',
                    padding: '10px 0',
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  Cancel
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function GeneratePage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', backgroundColor: '#0a0e1a', color: '#9ca3af', padding: '32px 24px' }}>
          Loading...
        </div>
      }
    >
      <GeneratePageInner />
    </Suspense>
  )
}
