// Simple PDF generation utility for Campaign Planning Draft
export const generateCampaignPDF = (campaign, assets = []) => {
  const doc = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Campaign Planning Draft - ${campaign.name}</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 210mm;
            margin: 0 auto;
            padding: 20mm;
            background: white;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #f97316;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo {
            color: #f97316;
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .campaign-title {
            font-size: 24px;
            color: #1f2937;
            margin: 20px 0;
            font-weight: bold;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 20px 0;
        }
        .info-card {
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #f97316;
        }
        .info-label {
            font-weight: bold;
            color: #4b5563;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        .info-value {
            font-size: 16px;
            color: #1f2937;
        }
        .assets-section {
            margin-top: 30px;
        }
        .section-title {
            font-size: 20px;
            color: #1f2937;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .asset-card {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            background: white;
        }
        .asset-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .asset-name {
            font-size: 18px;
            font-weight: bold;
            color: #1f2937;
        }
        .asset-status {
            background: #10b981;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
        }
        .asset-details {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
            margin-top: 15px;
        }
        .asset-detail {
            font-size: 14px;
        }
        .asset-detail strong {
            color: #4b5563;
            display: block;
            margin-bottom: 2px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
        }
        .print-date {
            text-align: right;
            color: #6b7280;
            font-size: 12px;
            margin-bottom: 20px;
        }
        @media print {
            body { margin: 0; padding: 15mm; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="print-date">
        Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
    </div>

    <div class="header">
        <div class="logo">🎯 BeatSpace</div>
        <div style="color: #6b7280; font-size: 14px;">Outdoor Advertising Marketplace</div>
        <div class="campaign-title">${campaign.name}</div>
        <div style="color: #6b7280; font-style: italic;">Campaign Planning Draft</div>
    </div>

    <div class="info-grid">
        <div class="info-card">
            <div class="info-label">Campaign Budget</div>
            <div class="info-value">৳${campaign.budget ? campaign.budget.toLocaleString() : 'Not specified'}</div>
        </div>
        <div class="info-card">
            <div class="info-label">Campaign Status</div>
            <div class="info-value">${campaign.status}</div>
        </div>
        <div class="info-card">
            <div class="info-label">Start Date</div>
            <div class="info-value">${campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : 'Not set'}</div>
        </div>
        <div class="info-card">
            <div class="info-label">End Date</div>
            <div class="info-value">${campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : 'Not set'}</div>
        </div>
    </div>

    <div class="info-card" style="grid-column: 1 / -1; margin: 20px 0;">
        <div class="info-label">Campaign Description</div>
        <div class="info-value">${campaign.description || 'No description provided'}</div>
    </div>

    <div class="assets-section">
        <h2 class="section-title">Selected Assets (${assets.length})</h2>
        
        ${assets.length === 0 ? 
            '<div style="text-align: center; color: #6b7280; padding: 40px;">No assets selected yet</div>' :
            assets.map(asset => `
                <div class="asset-card">
                    <div class="asset-header">
                        <div class="asset-name">${asset.name}</div>
                        <div class="asset-status">${asset.status || 'Available'}</div>
                    </div>
                    
                    <div class="asset-details">
                        <div class="asset-detail">
                            <strong>Type:</strong>
                            ${asset.type}
                        </div>
                        <div class="asset-detail">
                            <strong>Size:</strong>
                            ${asset.size || 'Not specified'}
                        </div>
                        <div class="asset-detail">
                            <strong>Condition:</strong>
                            ${asset.condition}
                        </div>
                        <div class="asset-detail">
                            <strong>Location:</strong>
                            ${asset.address}
                        </div>
                        <div class="asset-detail">
                            <strong>District:</strong>
                            ${asset.district}
                        </div>
                        <div class="asset-detail">
                            <strong>Visibility:</strong>
                            ${asset.visibility || 'Not rated'}
                        </div>
                    </div>
                    
                    ${asset.description ? `
                        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                            <strong style="color: #4b5563;">Description:</strong>
                            <p style="margin: 5px 0 0 0; color: #6b7280;">${asset.description}</p>
                        </div>
                    ` : ''}
                </div>
            `).join('')
        }
    </div>

    <div class="footer">
        <p><strong>BeatSpace</strong> - Outdoor Advertising Marketplace</p>
        <p>This is a planning draft. Final pricing and terms will be confirmed upon approval.</p>
        <p>For questions or support, contact: admin@beatspace.com</p>
    </div>
</body>
</html>
  `;

  // Create and trigger download
  const blob = new Blob([doc], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${campaign.name.replace(/[^a-z0-9]/gi, '_')}_Campaign_Draft.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default generateCampaignPDF;