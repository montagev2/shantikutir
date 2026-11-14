const https = require('https');

const TOKEN = process.env.VERCEL_TOKEN;
const PROJECT_ID = 'prj_Gj28BB0ml6ZmUmjWWMqAYJYwmnLG';

const options = {
  hostname: 'api.vercel.com',
  path: `/v9/projects/${PROJECT_ID}`,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}`);
    try {
      const parsed = JSON.parse(data);
      console.log('Project Name:', parsed.name);
      console.log('Project ID:', parsed.id);
    } catch {
      console.log('Response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('Request Error:', e.message);
});

req.end();
