import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { brand, BRAND_NAME } from '@/lib/brand'

export const metadata = {
  title: `Terms of Service - ${BRAND_NAME}`,
  description: `Terms of Service for ${BRAND_NAME} AI code generation platform`
}

export const dynamic = 'force-dynamic'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white">{brand.logo.emoji || <Sparkles className="w-5 h-5" />}</span>
            </div>
            <span className="text-xl font-bold">{BRAND_NAME}</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-zinc-400 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <div className="prose prose-invert prose-zinc max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-zinc-300 mb-4">
              By accessing or using {BRAND_NAME} (&quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). 
              If you do not agree to these Terms, you may not access or use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-zinc-300 mb-4">
              {BRAND_NAME} is an AI-powered code generation platform that helps developers create, validate, and deploy code. 
              The Service includes:
            </p>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 ml-4">
              <li>AI-powered code generation</li>
              <li>Code validation and error detection</li>
              <li>Automatic error fixing</li>
              <li>Code export and deployment tools</li>
              <li>Project management features</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <p className="text-zinc-300 mb-4">
              To use certain features of the Service, you must create an account. You agree to:
            </p>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 ml-4">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
            <p className="text-zinc-300 mb-4">You agree not to use the Service to:</p>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 ml-4">
              <li>Generate malicious code, malware, or exploits</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Attempt to gain unauthorized access to systems</li>
              <li>Distribute spam or harmful content</li>
              <li>Reverse engineer or attempt to extract our AI models</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Intellectual Property</h2>
            <p className="text-zinc-300 mb-4">
              <strong>Your Code:</strong> You retain all rights to code you generate using the Service. 
              We do not claim ownership of your generated code.
            </p>
            <p className="text-zinc-300 mb-4">
              <strong>Our Service:</strong> {BRAND_NAME}, including its AI models, software, and documentation, 
              is protected by intellectual property laws. You may not copy, modify, or distribute our Service 
              without permission.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Subscription and Payments</h2>
            <p className="text-zinc-300 mb-4">
              Paid subscriptions are billed in advance on a monthly or annual basis. 
              All fees are non-refundable except as required by law. We may change our prices 
              with 30 days&apos; notice.
            </p>
            <p className="text-zinc-300 mb-4">
              Free tier users are subject to usage limits as described in our pricing page. 
              We reserve the right to modify these limits at any time.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Service Availability</h2>
            <p className="text-zinc-300 mb-4">
              We strive to maintain high availability but do not guarantee uninterrupted access. 
              The Service may be unavailable due to maintenance, updates, or circumstances beyond our control.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
            <p className="text-zinc-300 mb-4">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. TO THE MAXIMUM EXTENT 
              PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, 
              CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
            </p>
            <p className="text-zinc-300 mb-4">
              We are not responsible for any errors, bugs, or issues in code generated by the Service. 
              You are responsible for reviewing and testing all generated code before use in production.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Termination</h2>
            <p className="text-zinc-300 mb-4">
              We may suspend or terminate your access to the Service at any time for violation of these Terms. 
              You may cancel your account at any time through your account settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Changes to Terms</h2>
            <p className="text-zinc-300 mb-4">
              We may modify these Terms at any time. We will notify users of material changes via email 
              or through the Service. Continued use after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
            <p className="text-zinc-300 mb-4">
              If you have questions about these Terms, please contact us at:
            </p>
            <p className="text-zinc-300">
              Email: legal@{brand.domain}<br />
              Address: {brand.legal.companyFull}, {brand.legal.jurisdiction}
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center text-zinc-400">
          <p>© {new Date().getFullYear()} {brand.legal.companyFull}. All rights reserved.</p>
          <div className="mt-4 space-x-4">
            <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white">Terms of Service</Link>
            <Link href="/contact" className="hover:text-white">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
