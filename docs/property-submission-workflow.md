# Property submissions

The public form at `/list-your-property` takes sale, long-term rental, and short-stay proposals without an account. It returns a reference for follow-up. It does not create a booking, take a payment, or notify a third party.

In **Property Management → Pending submissions**, managers and administrators can open the private contact details and photos, add review notes, or make a listing draft. A manager can mark changes requested. Only an administrator can reject a submission, record verification, or publish a listing. Use the contact shown to follow up manually. The site does not send messages when staff change status.

An owner submission is never publicly readable. A draft gets only the listing details and controlled photo paths, never the private name, phone, or review notes. After verifying ownership or authority, photo rights, and listing details, the admin uses the existing publish action. Photos attached through intake stay in the private bucket. The media route serves only attached images to staff for drafts, or publicly once the corresponding listing is published and verified. Archiving or removing a photo attachment stops that route from serving it.

## Deployment

Apply the additive `add_private_property_submissions` migration before opening the preview. Use the existing Supabase server service-role key, never a browser key. The submission endpoint uses the Vercel client IP header for an atomic rate limit and stores a keyed digest, not the IP itself. Uploaded photos are capped at 3.8 MB total and re-encoded without source metadata. Collect ownership documents separately, not through the public form.

Run `npm test` and `npm run build`. For a staff acceptance check, send a private test submission, open it in Property Management, create a draft, and confirm it and its photos are not public. Use an authorised property and administrator verification for any publish test on the shared database. Do not publish a fictitious property to the public catalogue.
