'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Post, PostStatus } from '@/lib/types'

const SURFACE = '#111827'
const BORDER = '#1f2937'
const GOLD = '#c9a84c'
const TEXT_PRIMARY = '#f9fafb'
const TEXT_SECONDARY = '#9ca3af'
const TEXT_MUTED = '#4b5563'

type FilterStatus = 'all' | PostStatus

const STATUS_COLORS: Record<PostStatus, string> = {
  draft: '#3b82f6',
  approved: '#10b981',
  posted: TEXT_MUTED,
}

const STATUS_LABELS: Record<PostStatus, string> = {
  draft: 'Draft',
  approved: 'Approved',
  posted: 'Posted',
}

function PostModal({ post, onClose, onConfirmPosted }: {
  post: Post
  onClose: () => void
  onConfirmPosted: () => void
}) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(post.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select text in the textarea
      const el = document.getElementById('modal-content') as HTMLTextAreaElement
      if (el) {
        el.select()
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 50, padding: '24px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#111827',
          border: `1px solid ${BORDER}`,
          borderRadius: '12px',
          padding: '28px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: TEXT_PRIMARY, margin: 0 }}>
            Post to LinkedIn
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: TEXT_MUTED, fontSize: '20px', cursor: 'pointer' }}>×</button>
        </div>

        <textarea
          id="modal-content"
          readOnly
          value={post.content}
          rows={10}
          style={{
            width: '100%',
            backgroundColor: '#0d1424',
            border: `1px solid ${BORDER}`,
            borderRadius: '6px',
            color: TEXT_PRIMARY,
            fontSize: '14px',
            padding: '12px',
            resize: 'none',
            lineHeight: '1.7',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleCopy}
            style={{
              backgroundColor: copied ? '#10b981' : GOLD,
              color: '#0a0e1a',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              minWidth: '120px',
            }}
          >
            {copied ? 'Copied ✓' : 'Copy Post'}
          </button>

          <button
            onClick={() => window.open('https://www.linkedin.com/post/new', '_blank')}
            style={{
              backgroundColor: 'transparent',
              color: TEXT_SECONDARY,
              border: `1px solid ${BORDER}`,
              padding: '10px 20px',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Open LinkedIn →
          </button>

          <button
            onClick={onConfirmPosted}
            style={{
              backgroundColor: 'transparent',
              color: '#10b981',
              border: `1px solid #10b981`,
              padding: '10px 20px',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              marginLeft: 'auto',
            }}
          >
            Mark as Posted ✓
          </button>
        </div>

        <p style={{ fontSize: '12px', color: TEXT_MUTED, margin: 0 }}>
          Copy the post, paste it on LinkedIn, then click "Mark as Posted" to archive it here.
        </p>
      </div>
    </div>
  )
}

export default function QueuePage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeModal, setActiveModal] = useState<Post | null>(null)

  useEffect(() => {
    fetchPosts()
  }, [])

  async function fetchPosts() {
    setLoading(true)
    try {
      const res = await fetch('/api/posts')
      if (!res.ok) throw new Error('Failed to fetch posts')
      const data = await res.json()
      setPosts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(post: Post) {
    const res = await fetch(`/api/posts/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    })
    if (res.ok) {
      const updated = await res.json()
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    }
  }

  async function handleRevert(post: Post) {
    const res = await fetch(`/api/posts/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved', posted_at: null }),
    })
    if (res.ok) {
      const updated = await res.json()
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    }
  }

  async function handleConfirmPosted(post: Post) {
    const res = await fetch(`/api/posts/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'posted', posted_at: new Date().toISOString() }),
    })
    if (res.ok) {
      const updated = await res.json()
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    }
    setActiveModal(null)
  }

  const filtered = filter === 'all' ? posts : posts.filter((p) => p.status === filter)
  const filterTabs: FilterStatus[] = ['all', 'draft', 'approved', 'posted']

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0e1a' }}>
      {activeModal && (
        <PostModal
          post={activeModal}
          onClose={() => setActiveModal(null)}
          onConfirmPosted={() => handleConfirmPosted(activeModal)}
        />
      )}

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
        <Link
          href="/"
          style={{
            color: GOLD,
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 600,
            borderBottom: `2px solid ${GOLD}`,
            paddingBottom: '2px',
          }}
        >
          Queue
        </Link>
        <Link
          href="/generate"
          style={{ color: TEXT_SECONDARY, textDecoration: 'none', fontSize: '14px' }}
        >
          Generate
        </Link>
      </nav>

      {/* Header */}
      <div style={{ padding: '32px 24px 0', maxWidth: '800px', margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: TEXT_PRIMARY, margin: 0 }}>
            Post Queue
          </h1>
          <Link
            href="/generate"
            style={{
              backgroundColor: GOLD,
              color: '#0a0e1a',
              padding: '8px 18px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 700,
            }}
          >
            + New Post
          </Link>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {filterTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                padding: '6px 16px',
                borderRadius: '20px',
                border: `1px solid ${filter === tab ? GOLD : BORDER}`,
                backgroundColor: filter === tab ? GOLD + '22' : 'transparent',
                color: filter === tab ? GOLD : TEXT_SECONDARY,
                fontSize: '13px',
                fontWeight: filter === tab ? 600 : 400,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {tab === 'all' ? 'All' : STATUS_LABELS[tab as PostStatus]}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading && (
          <p style={{ color: TEXT_SECONDARY, fontSize: '14px' }}>Loading posts...</p>
        )}
        {error && <p style={{ color: '#ef4444', fontSize: '14px' }}>Error: {error}</p>}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: TEXT_MUTED, fontSize: '14px' }}>
            No posts yet.{' '}
            <Link href="/generate" style={{ color: GOLD, textDecoration: 'none' }}>
              Create one →
            </Link>
          </div>
        )}

        {/* Post cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '48px' }}>
          {filtered.map((post) => {
            const isPosted = post.status === 'posted'
            const isApproved = post.status === 'approved'
            const isDraft = post.status === 'draft'
            const preview = post.content.slice(0, 150) + (post.content.length > 150 ? '…' : '')

            return (
              <div
                key={post.id}
                style={{
                  backgroundColor: SURFACE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: '8px',
                  padding: '18px 20px',
                  opacity: isPosted ? 0.6 : 1,
                }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: STATUS_COLORS[post.status],
                      backgroundColor: STATUS_COLORS[post.status] + '22',
                      padding: '2px 10px',
                      borderRadius: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {STATUS_LABELS[post.status]}
                  </span>
                  {post.target_date && (
                    <span style={{ fontSize: '12px', color: TEXT_MUTED }}>
                      Target: {post.target_date}
                    </span>
                  )}
                </div>

                {/* Content preview */}
                <p style={{ fontSize: '14px', color: TEXT_PRIMARY, lineHeight: '1.6', margin: '0 0 14px', whiteSpace: 'pre-wrap' }}>
                  {preview}
                </p>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {isApproved && (
                    <button
                      onClick={() => setActiveModal(post)}
                      style={{
                        backgroundColor: GOLD,
                        color: '#0a0e1a',
                        border: 'none',
                        padding: '7px 16px',
                        borderRadius: '5px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Post →
                    </button>
                  )}
                  {isDraft && (
                    <>
                      <button
                        onClick={() => handleApprove(post)}
                        style={{
                          backgroundColor: '#10b981',
                          color: '#fff',
                          border: 'none',
                          padding: '7px 16px',
                          borderRadius: '5px',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Approve
                      </button>
                      <Link
                        href={`/generate?edit=${post.id}`}
                        style={{
                          backgroundColor: 'transparent',
                          color: TEXT_SECONDARY,
                          border: `1px solid ${BORDER}`,
                          padding: '7px 16px',
                          borderRadius: '5px',
                          fontSize: '13px',
                          textDecoration: 'none',
                          display: 'inline-block',
                        }}
                      >
                        Edit
                      </Link>
                    </>
                  )}
                  {isPosted && (
                    <button
                      onClick={() => handleRevert(post)}
                      style={{
                        backgroundColor: 'transparent',
                        color: TEXT_MUTED,
                        border: `1px solid ${BORDER}`,
                        padding: '7px 14px',
                        borderRadius: '5px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      Revert to Approved
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
