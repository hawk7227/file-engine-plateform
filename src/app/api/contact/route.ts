// =====================================================
// FILE ENGINE - CONTACT FORM API
// Handles contact form submissions
// =====================================================

import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { name, email, company, subject, message } = await request.json()

    // Validate required fields
    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Store in database
    const { error } = await supabase.from('contact_submissions').insert({
      name,
      email,
      company: company || null,
      subject: subject || 'general',
      message,
      status: 'new',
      created_at: new Date().toISOString()
    })

    if (error) {
      console.error('Error storing contact submission:', error)
      // Continue even if database fails - we can still send notification
    }

    // TODO: Send email notification to support team
    // In production, integrate with your email service (SendGrid, SES, etc.)
    console.log('[Contact] New submission from:', email, 'Subject:', subject)

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error: any) {
    console.error('Contact form error:', error)
    return new Response(JSON.stringify({ error: 'Failed to submit form' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
