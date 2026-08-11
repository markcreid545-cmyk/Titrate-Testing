// functions/api/submit-coa.js
// Cloudflare Pages Function: receives COA form submission,
// writes record to D1, uploads chromatogram image to R2,
// and emails the client a link to their hosted COA page via Resend.

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const formData = await request.formData();
    const dataStr = formData.get('data');
    const chromatogramFile = formData.get('chromatogram');

    if (!dataStr) {
      return jsonResponse({ success: false, error: 'Missing form data.' }, 400);
    }

    const data = JSON.parse(dataStr);

    if (!data.certId || !data.clientEmail) {
      return jsonResponse({ success: false, error: 'Certificate ID and client email are required.' }, 400);
    }

    // 1. Upload chromatogram image to R2 (if provided)
    let chromatogramKey = null;
    if (chromatogramFile && chromatogramFile.size > 0) {
      chromatogramKey = `chromatograms/${data.certId}.png`;
      await env.COA_BUCKET.put(chromatogramKey, await chromatogramFile.arrayBuffer(), {
        httpMetadata: { contentType: chromatogramFile.type || 'image/png' }
      });
    }

    // 2. Write record to D1
    await env.DB.prepare(`
      INSERT INTO coas (
        cert_id, date_issued, vendor, compound, client_email, batch_id,
        labeled_content, date_received, sample_form, date_tested, date_reported,
        purity_result, purity_spec, purity_outcome,
        ms_observed, ms_theoretical, ms_outcome,
        net_measured, net_labeled, net_outcome,
        appearance_desc, appearance_outcome,
        overall_result, vendor_rating, analyst, reviewer,
        chromatogram_key, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.certId, data.dateIssued, data.vendor, data.compound, data.clientEmail, data.batchId,
      data.labeledContent, data.dateReceived, data.sampleForm, data.dateTested, data.dateReported,
      data.purityResult, data.puritySpec, data.purityOutcome,
      data.msObserved, data.msTheoretical, data.msOutcome,
      data.netMeasured, data.netLabeled, data.netOutcome,
      data.appearanceDesc, data.appearanceOutcome,
      data.overallResult, data.vendorRating, data.analyst, data.reviewer,
      chromatogramKey, new Date().toISOString()
    ).run();

    // 3. Email the client a one-click link to their hosted COA page via Resend
    const coaUrl = `https://titratetesting.com/coa/${data.certId}`;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Titrate Testing <noreply@titratetesting.com>',
        to: [data.clientEmail],
        subject: `Your Certificate of Analysis is ready — ${data.certId}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
            <h2 style="color:#0F2027;">Your COA is ready</h2>
            <p>Your Certificate of Analysis for batch <b>${data.batchId || data.certId}</b> has been completed and published.</p>
            <p style="margin:24px 0;">
              <a href="${coaUrl}" style="background:#1F8A82;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">View Your COA</a>
            </p>
            <p style="color:#666;font-size:13px;">Titrate Testing — Independent, Vendor-Blind Verification</p>
          </div>
        `
      })
    });

    if (!emailRes.ok) {
      const emailError = await emailRes.text();
      // COA was saved successfully even if email fails — don't block on it, just report it
      return jsonResponse({ success: true, warning: 'COA saved, but email failed to send: ' + emailError });
    }

    return jsonResponse({ success: true });

  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
