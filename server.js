const express = require('express');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const LOCAL_FILE = path.join(__dirname, 'buyers.json');

const apiUrlGet  = 'https://api.jsonstorage.net/v1/json/087395de-f632-4250-a29b-ad3addce7310/f5e3a1da-067d-4f27-b54d-7fdcef80c741';
const apiUrlPost = apiUrlGet + '?apiKey=' + process.env.JSONKEY;

app.use(express.json());

// ============================================================================
// STORAGE
// ============================================================================

async function getRemoteData() {
    try {
        const response = await fetch(apiUrlGet);
        return response.ok ? await response.json() : [];
    } catch (error) {
        console.error('Error fetching remote data:', error);
        return [];
    }
}

async function updateRemoteData(data) {
    try {
        const response = await fetch(apiUrlPost, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.ok;
    } catch (error) {
        console.error('Error updating remote data:', error);
        return false;
    }
}

async function getLocalData() {
    try {
        const data = await fs.readFile(LOCAL_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

async function saveLocalData(data) {
    try {
        await fs.writeFile(LOCAL_FILE, JSON.stringify(data, null, 4), 'utf8');
        return true;
    } catch (error) {
        console.error('Error saving local data:', error);
        return false;
    }
}

async function addEmail(email) {
    if (!email) return false;
    
    const data = await getRemoteData();
    const emails = Array.isArray(data) ? data : [];
    
    if (!emails.includes(email)) {
        emails.push(email);
        const updated = await updateRemoteData(emails);
        if (updated) await saveLocalData(emails);
        return updated;
    }
    
    return true;
}

async function removeEmail(email) {
    if (!email) return false;
    
    const data = await getRemoteData();
    const emails = Array.isArray(data) ? data : [];
    const filtered = emails.filter(e => e !== email);
    
    if (filtered.length !== emails.length) {
        const updated = await updateRemoteData(filtered);
        if (updated) await saveLocalData(filtered);
        return updated;
    }
    
    return true;
}

// ============================================================================
// WEBHOOK
// ============================================================================

app.post('/webhook/cakto', async (req, res) => {
    try {
        const { event, order, customer, product, subscription } = req.body;
        const email = customer?.email;

        console.log(`Webhook received: ${event}`);

        switch (event) {
            case 'purchase_approved':
                console.log('✅ Purchase approved:', email);
                await addEmail(email);
                break;

            case 'subscription_created':
                console.log('🔄 Subscription created:', email);
                await addEmail(email);
                break;

            case 'subscription_renewed':
                console.log('✅ Subscription renewed:', email);
                await addEmail(email);
                break;

            case 'subscription_canceled':
                console.log('🚫 Subscription canceled:', email);
                await removeEmail(email);
                break;

            case 'subscription_renewal_refused':
                console.log('❌ Renewal refused:', email);
                await removeEmail(email);
                break;

            case 'refund':
                console.log('💸 Refund:', email);
                await removeEmail(email);
                break;

            case 'chargeback':
                console.log('⚠️ Chargeback:', email);
                await removeEmail(email);
                break;

            case 'purchase_refused':
                console.log('❌ Purchase refused:', email);
                break;

            default:
                console.log('Unhandled event:', event);
        }

        res.json({ success: true });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// SECURE VERIFICATION
// ============================================================================

app.post('/verify', async (req, res) => {
    try {
        const { email, token } = req.body;
        
        if (!email || !token) {
            return res.status(400).json({ error: 'Email and token required' });
        }

        const expectedToken = crypto
            .createHash('sha256')
            .update(email + (process.env.SECRET_KEY || 'default-secret'))
            .digest('hex');

        if (token !== expectedToken) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        const emails = await getRemoteData();
        const isBuyer = Array.isArray(emails) && emails.includes(email);

        res.json({ buyer: isBuyer });

    } catch (error) {
        console.error('Error verifying:', error);
        res.status(500).json({ error: 'Internal error' });
    }
});

// ============================================================================
// HELPERS
// ============================================================================

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`API running on port ${PORT}`);
    console.log(`Webhook: POST /webhook/cakto`);
    console.log(`Verify: POST /verify`);
});