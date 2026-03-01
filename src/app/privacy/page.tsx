import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { brand, BRAND_NAME } from '@/lib/brand'

export const metadata = {
  title: `Privacy Policy - ${BRAND_NAME}`,
  description: `Privacy Policy for ${BRAND_NAME} AI code generation platform`
}

export const dynamic = 'force-dynamic'

export default function PrivacyPage() {
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
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-zinc-400 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <div className="prose prose-invert prose-zinc max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-zinc-300 mb-4">
              {BRAND_NAME} (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
              when you use our AI-powered code generation service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-medium mb-3 mt-6">2.1 Information You Provide</h3>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 ml-4">
              <li><strong>Account Information:</strong> Email address, name, password</li>
              <li><strong>Profile Information:</strong> Company name, job title (optional)</li>
              <li><strong>Payment Information:</strong> Billing address, payment method (processed by Stripe)</li>
              <li><strong>Content:</strong> Prompts, code, and files you submit to the Service</li>
              <li><strong>Communications:</strong> Support requests, feedback, and correspondence</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">2.2 Automatically Collected Information</h3>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 ml-4">
              <li><strong>Usage Data:</strong> Features used, generation count, timestamps</li>
              <li><strong>Device Information:</strong> Browser type, operating system, IP address</li>
              <li><strong>Cookies:</strong> Session cookies for authentication and preferences</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="text-zinc-300 mb-4">We use your information to:</p>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 ml-4">
              <li>Provide, maintain, and improve the Service</li>
              <li>Process transactions and send related information</li>
              <li>Send technical notices, updates, and security alerts</li>
              <li>Respond to your comments, questions, and support requests</li>
              <li>Monitor and analyze usage patterns and trends</li>
              <li>Detect, prevent, and address technical issues</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Your Code and Prompts</h2>
            <p className="text-zinc-300 mb-4">
              <strong>We do not use your code to train our AI models.</strong> Your prompts and generated 
              code are processed to provide the Service but are not used to improve or train our AI systems.
            </p>
            <p className="text-zinc-300 mb-4">
              On Pro and Enterprise plans, your code is stored encrypted and is only accessible by you. 
              Free tier users&apos; code may be stored temporarily for service operation.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Information Sharing</h2>
            <p className="text-zinc-300 mb-4">We may share your information with:</p>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 ml-4">
              <li><strong>Service Providers:</strong> Companies that help us operate the Service (hosting, payments, analytics)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            </ul>
            <p className="text-zinc-300 mt-4">
              We do not sell your personal information to third parties.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Data Security</h2>
            <p className="text-zinc-300 mb-4">
              We implement appropriate technical and organizational measures to protect your information, including:
            </p>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 ml-4">
              <li>Encryption of data in transit (TLS) and at rest</li>
              <li>Regular security assessments and audits</li>
              <li>Access controls and authentication</li>
              <li>Secure data centers with physical security</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Data Retention</h2>
            <p className="text-zinc-300 mb-4">
              We retain your information for as long as your account is active or as needed to provide 
              the Service. You can request deletion of your account and data at any time.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Your Rights</h2>
            <p className="text-zinc-300 mb-4">Depending on your location, you may have the right to:</p>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 ml-4">
              <li>Access your personal information</li>
              <li>Correct inaccurate information</li>
              <li>Delete your information</li>
              <li>Export your data</li>
              <li>Object to processing</li>
              <li>Withdraw consent</li>
            </ul>
            <p className="text-zinc-300 mt-4">
              To exercise these rights, contact us at privacy@{brand.domain}.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Cookies</h2>
            <p className="text-zinc-300 mb-4">
              We use essential cookies for authentication and session management. We also use 
              analytics cookies to understand how users interact with our Service. You can control 
              cookie preferences through your browser settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. International Transfers</h2>
            <p className="text-zinc-300 mb-4">
              Your information may be transferred to and processed in countries other than your own. 
              We ensure appropriate safeguards are in place for such transfers.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Children&apos;s Privacy</h2>
            <p className="text-zinc-300 mb-4">
              The Service is not intended for children under 13. We do not knowingly collect 
              information from children under 13. If you believe a child has provided us with 
              personal information, please contact us.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Changes to This Policy</h2>
            <p className="text-zinc-300 mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any 
              material changes by email or through the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">13. Contact Us</h2>
            <p className="text-zinc-300 mb-4">
              If you have questions about this Privacy Policy, please contact us at:
            </p>
            <p className="text-zinc-300">
              Email: privacy@{brand.domain}<br />
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
